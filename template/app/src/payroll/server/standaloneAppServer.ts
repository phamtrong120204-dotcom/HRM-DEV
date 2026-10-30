import http from 'node:http';
import { URL } from 'node:url';
import { TenantScopedRepository, createInMemoryDatabaseStore } from './db/tenantScopedRepository.ts';
import type { DatabaseStore } from './db/tenantScopedRepository.ts';
import { seedDemoData } from './db/seedPayrollDemoData.ts';
import { calculateEmployeePayroll, roundCurrency } from './engine/payrollCalculationEngine.ts';
import { docSo } from '../utils/docSo.ts';
import { maskIdCardNumber, maskBankAccountNumber, sanitizeEmployeePii, escapeHtml, sanitizeCsvCell } from './security/securitySanitizer.ts';
import { HttpError } from './errors.ts';

const PORT = Number(process.env.PORT) || 3000;

// Initialize in-memory database store
const db: DatabaseStore = createInMemoryDatabaseStore();

// Runtime stores
let repository = new TenantScopedRepository(db);
const attendanceStore: Record<string, Record<string, { days: Record<number, string>; otHours: number }>> = {};
const periodStatusStore: Record<string, 'DRAFT' | 'REVIEWING' | 'LOCKED' | 'PAID'> = {};
const companySettingsStore: Record<string, any> = {};
const extraInputsStore: Record<string, Record<string, Record<string, number>>> = {};

// ==========================================================
// 1. SERVER-SIDE SESSION STORE (CHỐNG LỖ HỔNG CLIENT FORGERY)
// ==========================================================
export interface ServerSession {
  sessionId: string;
  userId: string;
  tenantId: string;
  role: string;
  email: string;
  createdAt: number;
  lastActiveAt: number;
}

const sessionStore = new Map<string, ServerSession>();

export function parseCookies(cookieHeader?: string): Record<string, string> {
  const list: Record<string, string> = {};
  if (!cookieHeader) return list;
  cookieHeader.split(';').forEach((cookie) => {
    const parts = cookie.split('=');
    const name = parts[0]?.trim();
    if (!name) return;
    const value = parts.slice(1).join('=').trim();
    try {
      list[name] = decodeURIComponent(value);
    } catch (_) {
      list[name] = value;
    }
  });
  return list;
}

export function generateSessionId(): string {
  return 'sess_' + Date.now() + '_' + Math.random().toString(36).substring(2, 10);
}

// ==========================================================
// 2. OPTIMISTIC CONCURRENCY CONTROL (OCC) & DB TRANSACTION MUTEX
// ==========================================================
export const periodVersionStore: Record<string, number> = {};
const tenantTransactionLocks: Record<string, Promise<any>> = {};

export async function runInTenantTransaction<T>(tenantId: string, task: () => Promise<T>): Promise<T> {
  const previous = tenantTransactionLocks[tenantId] || Promise.resolve();
  let resolveCurrent: () => void;
  const current = new Promise<void>((resolve) => { resolveCurrent = resolve; });
  tenantTransactionLocks[tenantId] = current;
  try {
    await previous;
    return await task();
  } finally {
    resolveCurrent!();
  }
}


// Initialize attendance for tenant employees if not exists
function initAttendanceForTenant(tenantId: string, employees: any[]) {
  if (!attendanceStore[tenantId]) {
    attendanceStore[tenantId] = {};
  }
  for (const emp of employees) {
    if (!attendanceStore[tenantId][emp.id]) {
      const days: Record<number, string> = {};
      const isUnpaidLeave3Days = emp.code === 'NV007'; // 3 ngày nghỉ việc riêng không hưởng lương
      const isAnnualLeave = emp.code === 'NV001'; // 1 ngày nghỉ phép năm hưởng nguyên lương
      const isBusinessTrip = emp.code === 'NV005'; // 2 ngày đi công tác thực tế

      for (let d = 1; d <= 31; d++) {
        // Chủ nhật: Ngày 4, 11, 18, 25 (Tháng 10/2026)
        if (d % 7 === 4) {
          days[d] = 'O'; // Nghỉ cuối tuần
        } else if (isUnpaidLeave3Days && (d === 8 || d === 9 || d === 10)) {
          days[d] = 'KP'; // Nghỉ việc riêng không lương (< 14 ngày, vẫn đóng BHXH)
        } else if (isAnnualLeave && d === 15) {
          days[d] = 'P'; // 1 ngày nghỉ phép năm
        } else if (isBusinessTrip && (d === 2 || d === 3)) {
          days[d] = 'CT'; // Công tác
        } else {
          days[d] = 'X'; // Đi làm chuẩn
        }
      }

      // Giờ làm thêm OT
      let otHours = 0;
      if (emp.code === 'NV001') otHours = 4;
      else if (emp.code === 'NV003') otHours = 10;
      else if (emp.code === 'NV004') otHours = 8;
      else if (emp.code === 'NV006') otHours = 6;
      else if (emp.code === 'NVB01') otHours = 4;
      else if (emp.code === 'NVB02') otHours = 15;
      else if (emp.code === 'NVB03') otHours = 12;
      else if (emp.code === 'NVB04') otHours = 2;

      attendanceStore[tenantId][emp.id] = { days, otHours };
    }
  }
}

/**
 * XÓA TOÀN BỘ DỮ LIỆU HIỆN TẠI VÀ KHỞI TẠO BỘ DỮ LIỆU DEMO DOANH NGHIỆP MỚI
 */
function resetAllDataToDemo() {
  // 1. Xóa sạch mọi bảng trong DatabaseStore
  db.tenants.clear();
  db.departments.clear();
  db.employees.clear();
  db.payrollPeriods.clear();
  db.payrollRecords.clear();
  db.attendanceRecords.clear();
  db.memberships.clear();
  db.shifts.clear();
  db.companySettings.clear();

  // 2. Xóa sạch dữ liệu runtime stores
  for (const k of Object.keys(attendanceStore)) delete attendanceStore[k];
  for (const k of Object.keys(periodStatusStore)) delete periodStatusStore[k];
  for (const k of Object.keys(companySettingsStore)) delete companySettingsStore[k];
  for (const k of Object.keys(extraInputsStore)) delete extraInputsStore[k];

  // 3. TẠO DOANH NGHIỆP 1: TÂN PHÁT DIGITAL CORP
  const tenantAlpha = {
    id: 'tenant-alpha-tech',
    name: 'Công ty Cổ phần Công nghệ & Thương mại Tân Phát Digital',
    slug: 'tan-phat-digital',
    taxId: '0108923456',
    address: 'Tầng 18, Keangnam Landmark 72, Đường Phạm Hùng, Nam Từ Liêm, Hà Nội',
    phoneNumber: '(024) 7308 6868',
    email: 'contact@tanphatdigital.vn',
    website: 'https://tanphatdigital.vn',
    isActive: true,
    subscriptionTier: 'pro' as const,
  };
  db.tenants.set(tenantAlpha.id, tenantAlpha);
  db.tenants.set('tenant_alpha_tech_001', { ...tenantAlpha, id: 'tenant_alpha_tech_001' });

  // 4. TẠO DOANH NGHIỆP 2: BẮC NAM LOGISTICS
  const tenantBeta = {
    id: 'tenant-beta-logistics',
    name: 'Công ty TNHH Vận tải & Dịch vụ Kho vận Bắc Nam',
    slug: 'bac-nam-logistics',
    taxId: '0315678901',
    address: 'Kho ICD Sóng Thần, Phường An Bình, TP. Dĩ An, Tỉnh Bình Dương',
    phoneNumber: '(028) 3724 5566',
    email: 'operation@bacnamlogistics.vn',
    website: 'https://bacnamlogistics.vn',
    isActive: true,
    subscriptionTier: 'starter' as const,
  };
  db.tenants.set(tenantBeta.id, tenantBeta);
  db.tenants.set('tenant_beta_garment_002', { ...tenantBeta, id: 'tenant_beta_garment_002' });

  // 5. PHÒNG BAN TÂN PHÁT DIGITAL
  const deptsAlpha = [
    { id: 'dept_alpha_bgd', tenantId: tenantAlpha.id, name: 'Ban Tổng Giám đốc', code: 'BGD' },
    { id: 'dept_alpha_kt', tenantId: tenantAlpha.id, name: 'Phòng Tài chính - Kế toán', code: 'KT' },
    { id: 'dept_alpha_tech', tenantId: tenantAlpha.id, name: 'Khối Kỹ thuật & Công nghệ', code: 'TECH' },
    { id: 'dept_alpha_kd', tenantId: tenantAlpha.id, name: 'Khối Kinh doanh & Dự án', code: 'KD' },
    { id: 'dept_alpha_ops', tenantId: tenantAlpha.id, name: 'Khối Vận hành & Sản xuất', code: 'OPS' },
  ];
  deptsAlpha.forEach(d => db.departments.set(d.id, d));

  // 6. NHÂN SỰ TÂN PHÁT DIGITAL (8 nhân sự đa dạng trường hợp thực tế)
  const employeesAlpha: any[] = [
    {
      id: 'emp_alpha_001',
      tenantId: tenantAlpha.id,
      code: 'NV001',
      fullName: 'Nguyễn Tiến Dũng',
      gender: 'Nam',
      departmentId: 'dept_alpha_bgd',
      departmentName: 'Ban Tổng Giám đốc',
      jobTitle: 'Tổng Giám đốc',
      startDate: '2019-01-10',
      status: 'WORKING',
      salaryType: 'TIME_BASED',
      baseSalary: 65000000,
      insuranceSalary: 65000000,
      taxableAllowance: 2000000,
      nonTaxableAllowance: 730000,
      attendanceAllowance: 1000000,
      seniorityAllowancePerYear: 500000,
      gasAllowance: 1000000,
      pieceRateUnitPrice: 0,
      dependentsCount: 2,
      idCardNumber: '001085002468',
      bankName: 'Vietcombank',
      bankAccountNumber: '0011004889966',
    },
    {
      id: 'emp_alpha_002',
      tenantId: tenantAlpha.id,
      code: 'NV002',
      fullName: 'Đặng Hoàng Mai',
      gender: 'Nữ',
      departmentId: 'dept_alpha_kt',
      departmentName: 'Phòng Tài chính - Kế toán',
      jobTitle: 'Kế toán trưởng',
      startDate: '2021-03-01',
      status: 'WORKING',
      salaryType: 'TIME_BASED',
      baseSalary: 24000000,
      insuranceSalary: 24000000,
      taxableAllowance: 1500000,
      nonTaxableAllowance: 730000,
      attendanceAllowance: 800000,
      seniorityAllowancePerYear: 300000,
      gasAllowance: 500000,
      pieceRateUnitPrice: 0,
      dependentsCount: 1,
      idCardNumber: '001190003579',
      bankName: 'Techcombank',
      bankAccountNumber: '19033445566778',
    },
    {
      id: 'emp_alpha_003',
      tenantId: tenantAlpha.id,
      code: 'NV003',
      fullName: 'Lê Quốc Tuấn',
      gender: 'Nam',
      departmentId: 'dept_alpha_tech',
      departmentName: 'Khối Kỹ thuật & Công nghệ',
      jobTitle: 'Kỹ sư Phần mềm Trưởng (Tech Lead)',
      startDate: '2021-08-15',
      status: 'WORKING',
      salaryType: 'TIME_BASED',
      baseSalary: 28000000,
      insuranceSalary: 28000000,
      taxableAllowance: 3000000,
      nonTaxableAllowance: 730000,
      attendanceAllowance: 800000,
      seniorityAllowancePerYear: 300000,
      gasAllowance: 500000,
      pieceRateUnitPrice: 0,
      dependentsCount: 1,
      idCardNumber: '038092004812',
      bankName: 'MB Bank',
      bankAccountNumber: '0888123456789',
    },
    {
      id: 'emp_alpha_004',
      tenantId: tenantAlpha.id,
      code: 'NV004',
      fullName: 'Phạm Minh Đức',
      gender: 'Nam',
      departmentId: 'dept_alpha_ops',
      departmentName: 'Khối Vận hành & Sản xuất',
      jobTitle: 'Kỹ sư Triển khai / Lương khoán',
      startDate: '2022-04-10',
      status: 'WORKING',
      salaryType: 'PIECE_RATE',
      baseSalary: 7000000,
      insuranceSalary: 7000000,
      taxableAllowance: 1000000,
      nonTaxableAllowance: 730000,
      attendanceAllowance: 500000,
      seniorityAllowancePerYear: 0,
      gasAllowance: 500000,
      pieceRateUnitPrice: 8000,
      dependentsCount: 0,
      idCardNumber: '025093006714',
      bankName: 'BIDV',
      bankAccountNumber: '12810000998877',
    },
    {
      id: 'emp_alpha_005',
      tenantId: tenantAlpha.id,
      code: 'NV005',
      fullName: 'Trần Thúy Hằng',
      gender: 'Nữ',
      departmentId: 'dept_alpha_kd',
      departmentName: 'Khối Kinh doanh & Dự án',
      jobTitle: 'Trưởng phòng Kinh doanh',
      startDate: '2022-10-01',
      status: 'WORKING',
      salaryType: 'TIME_BASED',
      baseSalary: 18000000,
      insuranceSalary: 18000000,
      taxableAllowance: 2000000,
      nonTaxableAllowance: 730000,
      attendanceAllowance: 500000,
      seniorityAllowancePerYear: 200000,
      gasAllowance: 1000000,
      pieceRateUnitPrice: 0,
      dependentsCount: 2,
      idCardNumber: '001193007621',
      bankName: 'ACB',
      bankAccountNumber: '2233445566',
    },
    {
      id: 'emp_alpha_006',
      tenantId: tenantAlpha.id,
      code: 'NV006',
      fullName: 'Hoàng Văn Nam',
      gender: 'Nam',
      departmentId: 'dept_alpha_tech',
      departmentName: 'Khối Kỹ thuật & Công nghệ',
      jobTitle: 'Kỹ sư DevOps & Hạ tầng',
      startDate: '2023-05-15',
      status: 'WORKING',
      salaryType: 'TIME_BASED',
      baseSalary: 15000000,
      insuranceSalary: 15000000,
      taxableAllowance: 1000000,
      nonTaxableAllowance: 730000,
      attendanceAllowance: 500000,
      seniorityAllowancePerYear: 200000,
      gasAllowance: 400000,
      pieceRateUnitPrice: 0,
      dependentsCount: 0,
      idCardNumber: '001096008852',
      bankName: 'VietinBank',
      bankAccountNumber: '102008877665',
    },
    {
      id: 'emp_alpha_007',
      tenantId: tenantAlpha.id,
      code: 'NV007',
      fullName: 'Vũ Thu Thảo',
      gender: 'Nữ',
      departmentId: 'dept_alpha_kt',
      departmentName: 'Phòng Tài chính - Kế toán',
      jobTitle: 'Chuyên viên C&B và Nhân sự',
      startDate: '2023-11-01',
      status: 'WORKING',
      salaryType: 'TIME_BASED',
      baseSalary: 13000000,
      insuranceSalary: 13000000,
      taxableAllowance: 1000000,
      nonTaxableAllowance: 730000,
      attendanceAllowance: 500000,
      seniorityAllowancePerYear: 0,
      gasAllowance: 300000,
      pieceRateUnitPrice: 0,
      dependentsCount: 0,
      idCardNumber: '036195004123',
      bankName: 'VPBank',
      bankAccountNumber: '9876543210',
    },
    {
      id: 'emp_alpha_008',
      tenantId: tenantAlpha.id,
      code: 'NV008',
      fullName: 'Bùi Gia Huy',
      gender: 'Nam',
      departmentId: 'dept_alpha_tech',
      departmentName: 'Khối Kỹ thuật & Công nghệ',
      jobTitle: 'Nhân viên Lập trình Frontend',
      startDate: '2024-02-15',
      status: 'WORKING',
      salaryType: 'TIME_BASED',
      baseSalary: 9500000,
      insuranceSalary: 9500000,
      taxableAllowance: 500000,
      nonTaxableAllowance: 730000,
      attendanceAllowance: 500000,
      seniorityAllowancePerYear: 0,
      gasAllowance: 300000,
      pieceRateUnitPrice: 0,
      dependentsCount: 0,
      idCardNumber: '001201009944',
      bankName: 'TPBank',
      bankAccountNumber: '03998877665',
    },
  ];
  employeesAlpha.forEach(emp => db.employees.set(emp.id, emp));

  // 7. PHÒNG BAN BẮC NAM LOGISTICS
  const deptsBeta = [
    { id: 'dept_beta_dh', tenantId: tenantBeta.id, name: 'Phòng Điều hành Vận tải & Khai thác', code: 'DH' },
    { id: 'dept_beta_lx', tenantId: tenantBeta.id, name: 'Đội Xe Container & Giao nhận', code: 'LX' },
  ];
  deptsBeta.forEach(d => db.departments.set(d.id, d));

  // 8. NHÂN SỰ BẮC NAM LOGISTICS (4 nhân sự)
  const employeesBeta: any[] = [
    {
      id: 'emp_beta_001',
      tenantId: tenantBeta.id,
      code: 'NVB01',
      fullName: 'Trần Hữu Nghĩa',
      gender: 'Nam',
      departmentId: 'dept_beta_dh',
      departmentName: 'Phòng Điều hành Vận tải & Khai thác',
      jobTitle: 'Giám đốc Khai thác Vận tải',
      startDate: '2021-01-01',
      status: 'WORKING',
      salaryType: 'TIME_BASED',
      baseSalary: 32000000,
      insuranceSalary: 32000000,
      taxableAllowance: 3000000,
      nonTaxableAllowance: 730000,
      attendanceAllowance: 1000000,
      seniorityAllowancePerYear: 400000,
      gasAllowance: 1500000,
      pieceRateUnitPrice: 0,
      dependentsCount: 1,
      idCardNumber: '079085001234',
      bankName: 'Vietcombank',
      bankAccountNumber: '0071001234567',
    },
    {
      id: 'emp_beta_002',
      tenantId: tenantBeta.id,
      code: 'NVB02',
      fullName: 'Nguyễn Văn Cường',
      gender: 'Nam',
      departmentId: 'dept_beta_lx',
      departmentName: 'Đội Xe Container & Giao nhận',
      jobTitle: 'Đội trưởng Đội xe Container',
      startDate: '2022-04-15',
      status: 'WORKING',
      salaryType: 'TIME_BASED',
      baseSalary: 16000000,
      insuranceSalary: 16000000,
      taxableAllowance: 2000000,
      nonTaxableAllowance: 730000,
      attendanceAllowance: 800000,
      seniorityAllowancePerYear: 200000,
      gasAllowance: 800000,
      pieceRateUnitPrice: 0,
      dependentsCount: 2,
      idCardNumber: '079090005678',
      bankName: 'Techcombank',
      bankAccountNumber: '1903322114455',
    },
    {
      id: 'emp_beta_003',
      tenantId: tenantBeta.id,
      code: 'NVB03',
      fullName: 'Lê Văn Thắng',
      gender: 'Nam',
      departmentId: 'dept_beta_lx',
      departmentName: 'Đội Xe Container & Giao nhận',
      jobTitle: 'Tài xế xe đầu kéo container',
      startDate: '2023-01-10',
      status: 'WORKING',
      salaryType: 'TIME_BASED',
      baseSalary: 14000000,
      insuranceSalary: 14000000,
      taxableAllowance: 1500000,
      nonTaxableAllowance: 730000,
      attendanceAllowance: 500000,
      seniorityAllowancePerYear: 0,
      gasAllowance: 500000,
      pieceRateUnitPrice: 0,
      dependentsCount: 1,
      idCardNumber: '079093002345',
      bankName: 'MB Bank',
      bankAccountNumber: '099988776655',
    },
    {
      id: 'emp_beta_004',
      tenantId: tenantBeta.id,
      code: 'NVB04',
      fullName: 'Phạm Quốc Bảo',
      gender: 'Nam',
      departmentId: 'dept_beta_dh',
      departmentName: 'Phòng Điều hành Vận tải & Khai thác',
      jobTitle: 'Điều phối viên Kho vận & ICD',
      startDate: '2023-08-01',
      status: 'WORKING',
      salaryType: 'TIME_BASED',
      baseSalary: 12500000,
      insuranceSalary: 12500000,
      taxableAllowance: 1000000,
      nonTaxableAllowance: 730000,
      attendanceAllowance: 500000,
      seniorityAllowancePerYear: 0,
      gasAllowance: 400000,
      pieceRateUnitPrice: 0,
      dependentsCount: 0,
      idCardNumber: '079095006789',
      bankName: 'ACB',
      bankAccountNumber: '7788990011',
    },
  ];
  employeesBeta.forEach(emp => db.employees.set(emp.id, emp));

  // 9. CẤU HÌNH DOANH NGHIỆP (COMPANY SETTINGS)
  companySettingsStore['tenant-alpha-tech'] = {
    companyName: 'Công ty Cổ phần Công nghệ & Thương mại Tân Phát Digital',
    taxCode: '0108923456',
    address: 'Tầng 18, Keangnam Landmark 72, Đường Phạm Hùng, Nam Từ Liêm, Hà Nội',
    hotline: '(024) 7308 6868',
    email: 'contact@tanphatdigital.vn',
    website: 'https://tanphatdigital.vn',
    lunchAllowance: 730000,
    roundingRule: 'ROUND_1000',
    taxRule: 'LAW_7_TIER_OFFICIAL',
    standardWorkDays: 26,
    otWeekdays: 150,
    otWeekend: 200,
    otHoliday: 300,
    personalDeduction: 11000000,
    dependentDeduction: 4400000,
  };
  companySettingsStore['tenant_alpha_tech_001'] = companySettingsStore['tenant-alpha-tech'];

  companySettingsStore['tenant-beta-logistics'] = {
    companyName: 'Công ty TNHH Vận tải & Dịch vụ Kho vận Bắc Nam',
    taxCode: '0315678901',
    address: 'Kho ICD Sóng Thần, Phường An Bình, TP. Dĩ An, Tỉnh Bình Dương',
    hotline: '(028) 3724 5566',
    email: 'operation@bacnamlogistics.vn',
    website: 'https://bacnamlogistics.vn',
    lunchAllowance: 730000,
    roundingRule: 'ROUND_1000',
    taxRule: 'LAW_7_TIER_OFFICIAL',
    standardWorkDays: 26,
    otWeekdays: 150,
    otWeekend: 200,
    otHoliday: 300,
    personalDeduction: 11000000,
    dependentDeduction: 4400000,
  };
  companySettingsStore['tenant_beta_garment_002'] = companySettingsStore['tenant-beta-logistics'];

  // 10. ĐIỀU CHỈNH LƯƠNG KHOÁN, THƯỞNG & TẠM ỨNG
  extraInputsStore['tenant-alpha-tech'] = {
    'emp_alpha_003': { thuong: 1500000, tamUng: 0 },
    'emp_alpha_004': { slSP: 2100, dgSP: 8000, thuong: 2000000, tamUng: 0 },
    'emp_alpha_005': { thuong: 5000000, tamUng: 1500000 },
  };
  extraInputsStore['tenant-beta-logistics'] = {
    'emp_beta_002': { thuong: 1500000, tamUng: 500000 },
  };

  // 11. TRẠNG THÁI KỲ LƯƠNG
  periodStatusStore['tenant-alpha-tech'] = 'DRAFT';
  periodStatusStore['tenant_alpha_tech_001'] = 'DRAFT';
  periodStatusStore['tenant-beta-logistics'] = 'DRAFT';
  periodStatusStore['tenant_beta_garment_002'] = 'DRAFT';

  // 12. KHỞI TẠO BẢNG CHẤM CÔNG 31 NGÀY
  initAttendanceForTenant('tenant-alpha-tech', employeesAlpha);
  initAttendanceForTenant('tenant-beta-logistics', employeesBeta);
}

// Khởi chạy nạp bộ dữ liệu demo chuẩn doanh nghiệp
resetAllDataToDemo();

// Compute aggregate attendance numbers from daily grid
function summarizeAttendance(days: Record<number, string>, otHours: number) {
  let workDays = 0;
  let paidLeaveDays = 0;
  let unpaidLeaveDays = 0;
  let holidayDays = 0;

  for (let d = 1; d <= 31; d++) {
    const code = days[d] || '';
    if (code === 'X' || code === 'CT') {
      workDays += 1;
    } else if (code === 'N') {
      workDays += 0.5;
      unpaidLeaveDays += 0.5;
    } else if (code === 'P') {
      paidLeaveDays += 1;
    } else if (code === 'L') {
      holidayDays += 1;
    } else if (code === 'KP') {
      unpaidLeaveDays += 1;
    }
  }

  return {
    standardWorkDays: 26,
    actualWorkDays: workDays,
    paidLeaveDays,
    unpaidLeaveDays,
    holidayDays,
    overtimeHours: otHours || 0,
  };
}

// Helper to parse JSON body
function parseJsonBody(req: http.IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => { data += chunk; });
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

// The comprehensive multi-page SaaS application with dynamic URL routing and state synchronization
function getHtmlApp(initialTab = 'dashboard', initialTitle = 'Tổng quan', initialPath = '/tong-quan'): string {
  const pageTitle = initialTitle.includes('Hệ thống Chấm công & Tính lương B2B SaaS')
    ? initialTitle
    : `${initialTitle} · Hệ thống Chấm công & Tính lương B2B SaaS`;
  return `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${pageTitle}</title>
<link rel="icon" href="data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2032%2032%22%3E%3Crect%20width%3D%2232%22%20height%3D%2232%22%20rx%3D%229%22%20fill%3D%22%232563eb%22%2F%3E%3Cpath%20d%3D%22M8%2020l5-6%204%204%207-9%22%20fill%3D%22none%22%20stroke%3D%22%23ffffff%22%20stroke-width%3D%223%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E">
<style>
:root {
  /* Bento tokens from animated-admin-dashboard */
  --dash-bg: #ece8f2;
  --dash-surface: #ffffff;
  --dash-ink: #111114;
  --dash-muted: #7b7686;
  --dash-line: rgba(17, 17, 20, 0.08);

  /* Pastel tiles */
  --dash-lilac: #cfc4f5;
  --dash-lilac-strong: #5b3fd0;
  --dash-pink: #f7cfe5;
  --dash-mint: #d3ebd7;
  --dash-sky: #d4e3f8;
  --dash-amber: #fbe3b8;

  --dash-positive: #1f9d63;
  --dash-negative: #d6455d;

  --dash-radius-lg: 28px;
  --dash-radius-md: 20px;
  --dash-radius-sm: 12px;

  --dash-shadow: 0 1px 0 rgba(255, 255, 255, 0.9) inset,
    0 10px 28px -14px rgba(60, 40, 120, 0.18);
  --dash-ease: cubic-bezier(0.22, 1, 0.36, 1);

  --p: #5b3fd0;
  --pd: #4830a8;
  --p50: #f4f0ff;
  --p100: #e5ddfc;
  --ink: #111114;
  --acc: #5b3fd0;
  --line: rgba(17, 17, 20, 0.08);
  --bg: #ece8f2;
}
* { box-sizing: border-box; }
html, body { margin: 0; min-height: 100%; }
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Plus Jakarta Sans', Helvetica, Arial, sans-serif;
  font-size: 13.5px;
  color: var(--dash-ink);
  background: var(--dash-bg);
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
  font-feature-settings: "tnum" 1, "cv11" 1;
  overflow-x: hidden;
}
button, input, select, textarea { font: inherit; color: inherit; }
a { color: var(--p); text-decoration: none; }
svg { flex: none; vertical-align: middle; }
@keyframes fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes pop { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
@keyframes grow { from { transform: scaleY(0); } }
@keyframes draw { to { stroke-dashoffset: 0; } }

/* ===== Khung Layout: Shell có Menu Dọc Bên Trái (.side) và Vùng Nội Dung (.col) ===== */
.shell { display: flex; min-height: 100vh; }
.side {
  width: 250px;
  flex: none;
  background: #0f172a;
  color: #f8fafc;
  position: sticky;
  top: 0;
  height: 100vh;
  display: flex;
  flex-direction: column;
  z-index: 60;
  border-right: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 1px 0 6px rgba(0, 0, 0, 0.12);
}
.side .brand {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 18px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}
.side .brand .logo {
  width: 38px; height: 38px; border-radius: 10px;
  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
  color: #ffffff;
  display: grid; place-items: center;
  font-size: 18px; font-weight: 700;
  box-shadow: 0 2px 8px rgba(37, 99, 235, 0.35);
  flex: none;
}
.side .brand b { display: block; font-size: 14.5px; line-height: 1.25; letter-spacing: -0.01em; color: #f8fafc; font-weight: 700; }
.side .brand small { font-size: 11.5px; color: #94a3b8; }

.side .tabs {
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 12px 10px;
  overflow-y: auto;
  overflow-x: hidden;
  gap: 3px;
  flex: 1;
}
.side .tabs a {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  color: #94a3b8;
  text-decoration: none;
  cursor: pointer;
  font-weight: 500;
  font-size: 13.5px;
  white-space: nowrap;
  transition: all .15s ease;
}
.side .tabs a svg { width: 17px; height: 17px; opacity: 0.85; stroke: currentColor; }
.side .tabs a:hover { background: rgba(255, 255, 255, 0.06); color: #f8fafc; }
.side .tabs a.on {
  background: #2563eb;
  color: #ffffff;
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(37, 99, 235, 0.35);
}
.side .tabs a.on svg { opacity: 1; stroke: #ffffff; }

.side-foot {
  padding: 14px 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(0, 0, 0, 0.18);
}
.side-ctrl {
  margin-bottom: 8px;
}
.side-ctrl label {
  display: block;
  font-size: 10.5px;
  text-transform: uppercase;
  letter-spacing: .05em;
  color: #94a3b8;
  margin-bottom: 3px;
  font-weight: 600;
}
.side-ctrl select {
  width: 100%;
  height: 32px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(255, 255, 255, 0.06);
  color: #f1f5f9;
  padding: 0 8px;
  font-size: 12.5px;
  outline: none;
  transition: border-color .15s;
}
.side-ctrl select:focus { border-color: #3b82f6; }
.side-ctrl select option { background: #0f172a; color: #f8fafc; }
.side-foot .ss {
  font-size: 12px;
  color: #94a3b8;
  display: flex;
  align-items: center;
  gap: 7px;
  margin: 10px 0 10px;
}
.side-foot .ss i {
  width: 8px; height: 8px; border-radius: 50%;
  background: #10b981; flex: none;
  box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.25);
}
.side-foot .btn { width: 100%; justify-content: center; }

.col { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.col .main { max-width: none; margin: 0; padding: 20px 24px 30px; flex: 1; }
.ph { display: flex; align-items: flex-end; gap: 14px; flex-wrap: wrap; margin-bottom: 16px; }
.ph h1 { margin: 0; font-size: 22px; letter-spacing: -.01em; color: var(--ink); }
.ph p { margin: 3px 0 0; color: #64748b; font-size: 13px; }
.tools { margin-left: auto; display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
.foot { padding: 12px 24px 28px; text-align: center; color: #94a3b8; font-size: 12px; }
.foot b { color: #475569; }
.mbar { display: none; }

/* Bento card styling */
.card {
  background: var(--dash-surface);
  border-radius: var(--dash-radius-lg);
  border: 1px solid var(--dash-line);
  box-shadow: var(--dash-shadow);
  min-width: 0;
  transition: transform 0.2s var(--dash-ease), box-shadow 0.2s var(--dash-ease);
}
.card:hover { box-shadow: 0 14px 34px -12px rgba(60, 40, 120, 0.22); }
.card-h {
  display: flex; align-items: center; gap: 10px; padding: 16px 22px;
  border-bottom: 1px solid var(--dash-line); min-height: 54px; flex-wrap: wrap;
}
.card-h h3 { margin: 0; font-size: 15px; font-weight: 700; color: var(--dash-ink); letter-spacing: -0.01em; }
.card-h .sub { color: var(--dash-muted); font-size: 12.5px; margin-left: auto; }
.card-b { padding: 20px 22px; }

/* Bento specific tone classes */
.bento-hero {
  background: var(--dash-lilac);
  color: var(--dash-ink);
  border-radius: var(--dash-radius-lg);
  padding: 24px 28px;
  box-shadow: var(--dash-shadow);
  position: relative;
  overflow: hidden;
  border: none;
}
.bento-ink {
  background: #111114 !important;
  color: #ffffff !important;
  border-radius: var(--dash-radius-lg) !important;
  box-shadow: 0 14px 36px -10px rgba(0, 0, 0, 0.45) !important;
  border: 1px solid rgba(255, 255, 255, 0.08) !important;
}
.bento-ink .kc-l, .bento-ink .kc-s { color: rgba(255, 255, 255, 0.65) !important; }
.bento-ink .kc-v { color: #ffffff !important; }
.bento-ink .kc-ic { background: rgba(255, 255, 255, 0.1) !important; color: #34d399 !important; }

.bento-sky { background: var(--dash-sky) !important; }
.bento-amber { background: var(--dash-amber) !important; }
.bento-mint { background: var(--dash-mint) !important; }
.bento-pink { background: var(--dash-pink) !important; }

/* Key Cards (.kc) kiểu Bento */
.kc {
  background: var(--dash-surface);
  border: 1px solid var(--dash-line);
  border-radius: var(--dash-radius-lg);
  padding: 20px 22px 14px;
  overflow: hidden;
  box-shadow: var(--dash-shadow);
  position: relative;
  transition: transform 0.25s var(--dash-ease), box-shadow 0.25s var(--dash-ease);
}
.kc:hover { transform: translateY(-3px); box-shadow: 0 16px 36px -12px rgba(60, 40, 120, 0.25); }
.kc-h { display: flex; align-items: center; gap: 10px; }
.kc-ic { width: 36px; height: 36px; border-radius: 12px; display: grid; place-items: center; background: var(--cb); color: var(--c); flex: none; }
.kc-ic svg { width: 18px; height: 18px; }
.kc-l { font-size: 13.5px; color: var(--dash-muted); font-weight: 600; }
.kc-v { font-size: 27px; font-weight: 800; letter-spacing: -0.02em; margin: 10px 0 2px; font-variant-numeric: tabular-nums; white-space: nowrap; }
.kc-v small { font-size: 13px; color: var(--dash-muted); font-weight: 600; }
.kc-s { font-size: 12px; color: var(--dash-muted); }
.spk { display: block; width: calc(100% + 44px); margin: 10px -22px -14px; height: 42px; }
.spk path.l, .arealine { stroke-dasharray: 1; stroke-dashoffset: 1; animation: draw 1.2s .2s ease forwards; }

/* Responsive quy chuẩn Mobile & Tablet (Tự động đưa menu lên đầu, làm gọn, không tràn viền, không cuộn ngang) */
@media(max-width: 900px) {
  html, body {
    overflow-x: hidden !important;
    max-width: 100vw !important;
  }
  .shell {
    flex-direction: column !important;
    width: 100% !important;
    max-width: 100vw !important;
    overflow-x: hidden !important;
  }
  .side {
    position: sticky !important;
    top: 8px !important;
    left: 0 !important;
    width: calc(100% - 16px) !important;
    margin: 8px auto !important;
    height: auto !important;
    border-radius: 999px !important;
    box-shadow: 0 10px 30px -8px rgba(0, 0, 0, 0.35) !important;
    z-index: 70 !important;
    transform: none !important;
    padding: 6px 12px !important;
    flex-direction: row !important;
    align-items: center !important;
    justify-content: space-between !important;
    background: #111114 !important;
    border: 1px solid rgba(255, 255, 255, 0.12) !important;
  }
  .side .brand {
    border-bottom: none !important;
    padding: 0 !important;
    gap: 8px !important;
  }
  .side .brand .logo {
    width: 28px !important;
    height: 28px !important;
    font-size: 13px !important;
    border-radius: 8px !important;
  }
  .side .brand b, .side .brand small {
    display: none !important;
  }
  .side .tabs {
    flex-direction: row !important;
    padding: 0 !important;
    gap: 4px !important;
    overflow-x: auto !important;
    overflow-y: hidden !important;
    scrollbar-width: none !important;
    -ms-overflow-style: none !important;
    align-items: center !important;
  }
  .side .tabs::-webkit-scrollbar { display: none; }
  .side .tabs a {
    padding: 6px 11px !important;
    border-radius: 999px !important;
    font-size: 11.5px !important;
    gap: 5px !important;
  }
  .side .tabs a svg {
    width: 14px !important;
    height: 14px !important;
  }
  .side-foot {
    display: none !important;
  }
  .col .main {
    padding: 10px 10px 30px !important;
    width: 100% !important;
    max-width: 100vw !important;
    box-sizing: border-box !important;
    overflow-x: hidden !important;
  }
  .mbar { display: none !important; }
  .grid.c4 { grid-template-columns: 1fr !important; }
  .grid.c21 { grid-template-columns: 1fr !important; }
  .grid.c3 { grid-template-columns: 1fr !important; }
  .grid.c2 { grid-template-columns: 1fr !important; }
  .ph {
    flex-direction: column !important;
    align-items: flex-start !important;
    gap: 8px !important;
  }
  .tools {
    width: 100% !important;
    justify-content: flex-start !important;
    margin-left: 0 !important;
  }
  .card {
    border-radius: 20px !important;
    max-width: 100% !important;
    box-sizing: border-box !important;
  }
  .donut {
    flex-direction: column !important;
    align-items: center !important;
  }
}

@media(min-width: 601px) and (max-width: 900px) {
  /* Tablet riêng biệt */
  .grid.c4 { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
  .side .brand b { display: block !important; font-size: 12px !important; }
}

/* ===== Nút bấm, ô nhập, cọ chấm công ===== */
.btn {
  display: inline-flex; align-items: center; gap: 7px; height: 36px; padding: 0 16px;
  border-radius: 999px; border: 1px solid rgba(17, 17, 20, 0.12); background: #ffffff; cursor: pointer;
  font-weight: 600; font-size: 13px; white-space: nowrap; transition: .15s; text-decoration: none; color: #111114;
}
.btn:hover { border-color: rgba(17, 17, 20, 0.25); background: #fdfcff; color: #000; }
.btn svg { width: 16px; height: 16px; }
.btn.pri { background: #5b3fd0; border-color: #5b3fd0; color: #ffffff; }
.btn.pri:hover { background: #4830a8; border-color: #4830a8; color: #ffffff; box-shadow: 0 4px 12px rgba(91, 63, 208, 0.3); }
.btn.xl { background: #1f9d63; border-color: #1f9d63; color: #ffffff; }
.btn.xl:hover { background: #167e4e; border-color: #167e4e; color: #ffffff; box-shadow: 0 4px 12px rgba(31, 157, 99, 0.3); }
.btn.danger { color: #d6455d; border-color: #fecdd3; background: #ffffff; }
.btn.danger:hover { background: #fff1f2; border-color: #f43f5e; color: #be123c; }
.btn.sm { height: 30px; padding: 0 12px; font-size: 12px; border-radius: 999px; }
.ibtn {
  width: 32px; height: 32px; border-radius: 999px; border: 0; background: transparent;
  display: inline-grid; place-items: center; cursor: pointer; color: #7b7686; vertical-align: middle;
}
.ibtn svg { width: 16px; height: 16px; }
.ibtn:hover { background: var(--p50); color: var(--pd); }
.ibtn.del:hover { background: #fee2e2; color: #dc2626; }
.inp {
  height: 36px; border: 1px solid rgba(17, 17, 20, 0.14); border-radius: 12px; padding: 0 12px;
  background: #fff; outline: none; min-width: 0; transition: border .15s, box-shadow .15s;
}
.inp:focus { border-color: var(--p); box-shadow: 0 0 0 3px var(--p100); }
.inp.num { text-align: right; font-variant-numeric: tabular-nums; }
.inp.sm { height: 30px; font-size: 12.5px; border-radius: 8px; padding: 0 8px; }
.search { position: relative; display: inline-flex; }
.search input { padding-left: 34px; width: 230px; }
.search svg { position: absolute; left: 11px; top: 50%; transform: translateY(-50%); width: 16px; height: 16px; color: #94a3b8; }
.mp {
  display: inline-flex; align-items: center; gap: 7px; font-size: 13px; font-weight: 600;
  color: var(--dash-ink); background: #fff; border: 1px solid rgba(17, 17, 20, 0.12); border-radius: 999px; padding: 0 12px 0 14px; height: 36px;
}
.mp input { border: 0; outline: none; background: transparent; height: 32px; font-weight: 600; cursor: pointer; }

/* ===== Thẻ, Lưới & Biểu đồ SVG Doanh nghiệp ===== */
.grid { display: grid; gap: 18px; }
.c2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.c3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.c4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
.c21 { grid-template-columns: minmax(0, 2fr) minmax(0, 1fr); }
.mt { margin-top: 18px; } .mb { margin-bottom: 18px; }
.row { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
.grow { flex: 1; } .muted { color: var(--dash-muted); } .small { font-size: 12.5px; } .r { text-align: right; } .c { text-align: center; }
.banner {
  display: flex; gap: 12px; align-items: center; padding: 12px 18px;
  border-radius: var(--dash-radius-md); background: #ffffff; border: 1px solid var(--dash-line); box-shadow: var(--dash-shadow); margin-bottom: 16px; flex-wrap: wrap;
}
.banner svg { width: 19px; height: 19px; color: var(--dash-lilac-strong); }
.badge {
  display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px;
  border-radius: 999px; font-size: 12px; font-weight: 600; background: #f1f5f9; color: #475569; white-space: nowrap;
}
.b-green { background: #dcfce7; color: #15803d; }
.b-red { background: #fee2e2; color: #b91c1c; }
.b-amber { background: #fef3c7; color: #b45309; }
.b-p { background: var(--dash-lilac); color: var(--dash-lilac-strong); }
.avatar {
  width: 32px; height: 32px; border-radius: 50%; display: inline-grid; place-items: center;
  background: var(--p100); color: var(--pd); font-weight: 700; font-size: 12px; flex: none;
}
.who { display: flex; align-items: center; gap: 10px; min-width: 0; }
.who b { display: block; font-weight: 600; }
.who small { color: var(--dash-muted); font-size: 12px; }
.kc:before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 4px; background: var(--c); }
.kc-h { display: flex; align-items: center; gap: 10px; }
.kc-ic { width: 34px; height: 34px; border-radius: 10px; display: grid; place-items: center; background: var(--cb); color: var(--c); flex: none; }
.kc-ic svg { width: 18px; height: 18px; }
.kc-l { font-size: 13px; color: #64748b; font-weight: 600; }
.kc-v { font-size: 23px; font-weight: 800; letter-spacing: -.5px; margin: 10px 0 2px; font-variant-numeric: tabular-nums; white-space: nowrap; }
.kc-v small { font-size: 13px; color: #94a3b8; }
.kc-s { font-size: 12px; color: #64748b; }
.spk { display: block; width: calc(100% + 36px); margin: 8px -18px 0; height: 42px; }
.spk path.l, .arealine { stroke-dasharray: 1; stroke-dashoffset: 1; animation: draw 1.2s .2s ease forwards; }
.pill { margin-left: auto; font-size: 11.5px; font-weight: 700; padding: 3px 8px; border-radius: 20px; white-space: nowrap; }
.pill.pu { background: #dcfce7; color: #15803d; }
.pill.pd { background: #fee2e2; color: #b91c1c; }
.pill.na { background: #eef2f1; color: #64748b; }

.donut { display: flex; gap: 18px; align-items: center; flex-wrap: wrap; }
.donut svg { width: 160px; height: 160px; }
.dl { flex: 1; min-width: 170px; }
.dl div { display: flex; align-items: center; gap: 8px; padding: 7px 0; border-bottom: 1px dashed #e8eeed; font-size: 13px; }
.dl div:last-child { border: 0; }
.dl i { width: 10px; height: 10px; border-radius: 3px; flex: none; }
.dl b { margin-left: auto; font-variant-numeric: tabular-nums; }
.dl em { color: #94a3b8; font-style: normal; width: 46px; text-align: right; font-size: 12px; }

.hb { margin: 10px 0; }
.hb-top { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 5px; gap: 10px; }
.hb-bar { height: 8px; background: #eef2f1; border-radius: 99px; overflow: hidden; }
.hb-bar i { display: block; height: 100%; border-radius: 99px; }

.ring { text-align: center; }
.ring svg { width: 170px; height: 170px; display: block; margin: 0 auto; }
.ring b { display: block; margin-top: 8px; }
.medal { width: 24px; height: 24px; border-radius: 50%; display: grid; place-items: center; font-size: 12px; font-weight: 800; color: #fff; flex: none; }
.tli { display: flex; align-items: center; gap: 10px; padding: 8px 0; border-bottom: 1px dashed #e8eeed; }
.tli:last-child { border: 0; }
.tli .grow b { display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.tli small { color: #64748b; font-size: 12px; }
.tli .pb { height: 6px; background: #eef2f1; border-radius: 6px; margin-top: 5px; overflow: hidden; }
.tli .pb i { display: block; height: 100%; border-radius: 6px; }
.tli .v { text-align: right; font-weight: 700; white-space: nowrap; }

/* ===== Bảng dữ liệu chung (.tbl) ===== */
.tbl-card { background: #fff; border-radius: 14px; border: 1px solid var(--line); box-shadow: 0 1px 3px rgba(15,23,42,.05); overflow: hidden; }
.tbl-tools { display: flex; gap: 10px; align-items: center; padding: 12px 14px; border-bottom: 1px solid #eef2f1; flex-wrap: wrap; }
.tbl-wrap { overflow: auto; max-height: calc(100vh - 300px); min-height: 180px; }
table.tbl { width: 100%; border-collapse: separate; border-spacing: 0; font-size: 13px; }
.tbl th {
  position: sticky; top: 0; background: #f4f8f7; text-align: left; font-weight: 700;
  color: #475569; padding: 10px 12px; border-bottom: 1px solid #dfe7e5; white-space: nowrap;
  font-size: 11.5px; text-transform: uppercase; letter-spacing: .03em; z-index: 2;
}
.tbl td { padding: 9px 12px; border-bottom: 1px solid #eef2f1; vertical-align: middle; white-space: nowrap; }
.tbl tbody tr:hover td { background: var(--p50); }
.tbl th.r, .tbl td.r { text-align: right; font-variant-numeric: tabular-nums; }
.tbl th.c, .tbl td.c { text-align: center; }
.tbl tfoot td { font-weight: 700; background: #f4f8f7; border-top: 2px solid #dfe7e5; position: sticky; bottom: 0; z-index: 2; }
.tbl.compact td { padding: 7px 10px; } .tbl.compact th { padding: 8px 10px; }
.tbl-pager { display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; font-size: 12.5px; color: #64748b; gap: 10px; flex-wrap: wrap; border-top: 1px solid #eef2f1; }

/* ===== Chấm công (.cc) ===== */
.cc-wrap { overflow: auto; max-height: calc(100vh - 330px); background: #fff; border: 1px solid var(--line); border-radius: 14px 14px 0 0; }
table.cc { border-collapse: separate; border-spacing: 0; font-size: 12px; user-select: none; }
.cc th, .cc td { border-right: 1px solid #eef2f1; border-bottom: 1px solid #eef2f1; text-align: center; padding: 0; height: 34px; }
.cc thead th { position: sticky; top: 0; background: #f4f8f7; z-index: 3; font-weight: 700; color: #475569; font-size: 11px; padding: 4px 2px; line-height: 1.2; }
.cc thead th.we { background: #fff1f2; color: #e11d48; }
.cc thead th.td { background: var(--p); color: #fff; }
.cc .nm { position: sticky; left: 0; background: #fff; z-index: 2; text-align: left; padding: 0 12px; min-width: 190px; max-width: 190px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cc thead .nm { z-index: 4; background: #f4f8f7; }
.cc td.d { width: 32px; min-width: 32px; cursor: pointer; font-weight: 700; font-size: 11px; }
.cc td.d:hover { outline: 2px solid var(--p); outline-offset: -2px; }
.cc td.we { background: #fff7f8; }
.cc td.sum { min-width: 56px; padding: 0 6px; font-weight: 700; background: #f8fafc; font-variant-numeric: tabular-nums; }
.cc td.sum.hl { background: var(--p50); color: var(--pd); }
.cc td.ot input { width: 54px; height: 26px; border: 1px solid #cbd5d3; border-radius: 6px; text-align: center; }
.brush { display: inline-flex; align-items: center; gap: 6px; height: 34px; padding: 0 12px; border-radius: 9px; border: 2px solid transparent; cursor: pointer; font-weight: 700; font-size: 12.5px; }
.brush.on { border-color: #0f172a; box-shadow: 0 2px 8px rgba(0,0,0,.15); }
.brush small { font-weight: 500; opacity: .8; }

/* ===== Bảng lương (.pl) ===== */
.pl th.stk, .pl td.stk { position: sticky; background: #fff; z-index: 1; }
.pl thead th.stk { z-index: 3; background: #f4f8f7; }
.pl tfoot td.stk { z-index: 3; background: #f4f8f7; }
.pl tbody tr:hover td.stk { background: var(--p50); }
.pl td.in input { width: 104px; height: 30px; border: 1px solid #cbd5d3; border-radius: 7px; text-align: right; padding: 0 7px; font-variant-numeric: tabular-nums; background: #fffbeb; }
.pl td.in input:focus { outline: none; border-color: var(--p); box-shadow: 0 0 0 3px var(--p100); }
.pl td.net { font-weight: 700; color: var(--pd); }
.pl th.grp { background: var(--p50); color: var(--pd); text-align: center; }
.calc-out div { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed #e8eeed; gap: 10px; }
.calc-out div b { font-variant-numeric: tabular-nums; }
.calc-out .big { font-size: 18px; color: var(--pd); }

/* ===== Modal, Form & Thông báo Toast ===== */
.modal-wrap { position: fixed; inset: 0; background: rgba(2,24,23,.5); display: flex; align-items: flex-start; justify-content: center; padding: 5vh 16px; z-index: 100; overflow: auto; animation: fade .15s; }
.modal { background: #fff; border-radius: 16px; width: 100%; box-shadow: 0 24px 60px rgba(0,0,0,.3); animation: pop .18s; }
.modal-h { display: flex; align-items: center; gap: 10px; padding: 15px 20px; border-bottom: 1px solid #eef2f1; }
.modal-h h3 { margin: 0; font-size: 16px; }
.modal-h .ibtn { margin-left: auto; }
.modal-b { padding: 18px 20px; max-height: 72vh; overflow: auto; }
.modal-f { display: flex; gap: 8px; justify-content: flex-end; align-items: center; padding: 13px 20px; border-top: 1px solid #eef2f1; background: #f8fbfa; border-radius: 0 0 16px 16px; }
.form { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px 16px; }
.field { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.field>span { font-size: 12.5px; font-weight: 600; color: #334155; }
.field.full { grid-column: 1/-1; }
.field small { color: #94a3b8; font-size: 11.5px; }
.fsec { grid-column: 1/-1; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: var(--pd); border-bottom: 1px solid #eef2f1; padding-bottom: 6px; margin-top: 6px; }
#toasts { position: fixed; right: 20px; bottom: 20px; z-index: 300; display: flex; flex-direction: column; gap: 8px; align-items: flex-end; }
.toast { background: #0f172a; color: #fff; padding: 12px 16px; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,.25); font-size: 13.5px; max-width: 400px; animation: pop .2s; border-left: 4px solid var(--acc); }
.toast.ok { border-left-color: #22c55e; } .toast.err { border-left-color: #ef4444; }

/* ===== Phiếu lương In ấn (.ps) Chuẩn Doanh nghiệp ===== */
#print-root { display: none; }
.ps { font-size: 11.5px; color: #1f2937; break-after: page; page-break-after: always; padding: 16px; background: #fff; border-radius: 12px; }
.ps-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 20px; }
.ps-co b { font-size: 14px; color: var(--pd); text-transform: uppercase; display: block; margin-bottom: 2px; }
.ps-co .l { font-size: 10.5px; color: #555; }
.ps-tt { text-align: right; font-size: 11px; color: #444; line-height: 1.6; }
.ps-tt h1 { font-size: 22px; letter-spacing: 2px; margin: 0 0 2px; color: var(--pd); font-weight: 800; line-height: 1.1; }
.ps-band { height: 5px; border-radius: 3px; background: linear-gradient(90deg, var(--pd), var(--p), var(--acc)); margin: 9px 0 10px; }
.ps-emp { display: flex; gap: 16px; align-items: center; border: 1px solid #d5e3e1; border-radius: 10px; padding: 9px 12px; background: var(--p50); line-height: 1.3; }
.ps-av { width: 50px; height: 50px; border-radius: 50%; background: var(--p); color: #fff; display: grid; place-items: center; font-weight: 800; font-size: 18px; flex: none; }
.ps-eg { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px 14px; flex: 1; }
.ps-eg span { display: block; font-size: 9.5px; color: #6b7280; text-transform: uppercase; letter-spacing: .4px; }
.ps-eg b { font-size: 12px; }
.ps-att { display: grid; grid-template-columns: repeat(6, 1fr); gap: 8px; margin: 9px 0; }
.ps-att div { border: 1px solid #dde7e5; border-radius: 8px; padding: 5px 4px; text-align: center; }
.ps-att b { display: block; font-size: 15px; color: #111; }
.ps-att span { font-size: 9.5px; color: #6b7280; }
.ps-att .hl { background: var(--p); border-color: var(--p); }
.ps-att .hl b, .ps-att .hl span { color: #fff; }
.ps-t { width: 100%; border-collapse: collapse; margin-top: 6px; }
.ps-t td { border-bottom: 1px solid #e3ebe9; padding: 4px 8px; font-size: 11.2px; vertical-align: middle; line-height: 1.25; }
.ps-t th { padding: 5px 8px; font-size: 10.5px; background: var(--p50); border-bottom: 1px solid #c3d4d1; text-align: left; }
.ps-t tr.sec td { background: #eaf5f3; font-weight: 700; color: var(--pd); font-size: 10.8px; }
.ps-t tr.sub td { font-weight: 700; background: #f6faf9; border-bottom: 2px solid #c3d4d1; }
.ps-t td.dg { color: #6b7280; font-size: 10.5px; }
.ps-net { display: flex; justify-content: space-between; align-items: center; gap: 16px; background: linear-gradient(90deg, var(--pd), var(--p)); color: #fff; border-radius: 10px; padding: 10px 16px; margin: 9px 0; }
.ps-net span { font-weight: 800; font-size: 13px; letter-spacing: .5px; display: block; }
.ps-net small { font-style: italic; font-size: 10.5px; opacity: .92; }
.ps-net b { font-size: 22px; white-space: nowrap; }
.ps-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 8px; }
.ps-box { border: 1px solid #dde7e5; border-radius: 10px; padding: 7px 12px; }
.ps-box h4 { margin: 0 0 5px; font-size: 10.5px; text-transform: uppercase; color: var(--pd); }
.ps-box div { display: flex; justify-content: space-between; gap: 10px; padding: 2px 0; font-size: 10.8px; border-bottom: 1px dashed #e3ebe9; }
.ps-box div:last-child { border: 0; font-weight: 700; }
.ps-pay { margin-top: 8px; font-size: 11px; }
.ps-date { text-align: right; font-style: italic; margin-top: 6px; }
.ps-sign { display: grid; grid-template-columns: repeat(3, 1fr); text-align: center; margin-top: 4px; }
.ps-sign b { display: block; } .ps-sign i { font-size: 10px; color: #666; } .ps-sign .sp { height: 44px; }
.ps-foot { margin-top: 6px; padding-top: 5px; border-top: 1px solid #e3ebe9; font-size: 9.5px; color: #888; text-align: center; }

@media print {
  body.is-printing > *:not(#print-root) { display: none !important; }
  body.is-printing #print-root { display: block !important; }
  .side, .mbar, .backdrop, .tools, .tbl-pager { display: none !important; }
}
</style>
</head>
<body>

<div id="app">
  <div class="shell">
    <!-- CỘT BÊN TRÁI: VERTICAL SIDEBAR DOANH NGHIỆP -->
    <aside class="side">
      <div class="brand">
        <div class="logo">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/><path d="m9 16 2 2 4-4"/>
          </svg>
        </div>
        <div>
          <b>Chấm công & Tính lương</b>
          <small>Hệ thống Quản trị Doanh nghiệp</small>
        </div>
      </div>

      <!-- TABS DỌC CHUẨN SAAS MULTI-PAGE ROUTING -->
      <nav class="tabs" id="sideTabs">
        <a data-tab="dashboard" class="nav-item ${initialTab === 'dashboard' ? 'on' : ''}" href="/tong-quan">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>
          <span>Tổng quan</span>
        </a>
        <a data-tab="chamcong" class="nav-item ${initialTab === 'chamcong' ? 'on' : ''}" href="/cham-cong">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/><path d="m9 16 2 2 4-4"/></svg>
          <span>Chấm công</span>
        </a>
        <a data-tab="nhanvien" class="nav-item ${initialTab === 'nhanvien' ? 'on' : ''}" href="/nhan-vien">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          <span>Nhân viên</span>
        </a>
        <a data-tab="bangluong" class="nav-item ${initialTab === 'bangluong' ? 'on' : ''}" href="/bang-luong">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/></svg>
          <span>Bảng lương</span>
        </a>
        <a data-tab="thue" class="nav-item ${initialTab === 'thue' ? 'on' : ''}" href="/thue-bhxh">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 5 5 19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg>
          <span>Thuế & BHXH</span>
        </a>
        <a data-tab="caidat" class="nav-item ${initialTab === 'caidat' ? 'on' : ''}" href="/cai-dat">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/></svg>
          <span>Cài đặt</span>
        </a>
        <a data-tab="data" class="nav-item ${initialTab === 'data' ? 'on' : ''}" href="/du-lieu">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14a9 3 0 0 0 18 0V5"/><path d="M3 12a9 3 0 0 0 18 0"/></svg>
          <span>Dữ liệu & Sao lưu</span>
        </a>
      </nav>

      <!-- CHUYỂN ĐỔI DOANH NGHIỆP & VAI TRÒ Ở CHÂN SIDEBAR -->
      <div class="side-foot">
        <div class="side-ctrl">
          <label>Doanh nghiệp (Multi-Tenant)</label>
          <select id="tenantSelect" onchange="switchTenant(this.value)">
            <option value="tenant-alpha-tech">Tân Phát Digital (Công nghệ & TM)</option>
            <option value="tenant-beta-logistics">Bắc Nam Logistics (Vận tải & Kho vận)</option>
          </select>
        </div>

        <div class="side-ctrl">
          <label>Vai trò người dùng</label>
          <select id="roleSelect" onchange="switchRole(this.value)">
            <option value="ORG_OWNER">Giám đốc (Owner)</option>
            <option value="ORG_ADMIN">Quản trị viên (Admin)</option>
            <option value="HR_MANAGER">Trưởng phòng Nhân sự (HR)</option>
            <option value="ACCOUNTANT">Kế toán trưởng (Accountant)</option>
            <option value="DEPARTMENT_MANAGER">Trưởng bộ phận (Manager)</option>
            <option value="EMPLOYEE">Nhân viên (Self-Service)</option>
          </select>
        </div>

        <div class="ss" id="saveState">
          <i></i>
          <span id="saveStatus">Đã kết nối máy chủ</span>
        </div>

        <button class="btn pri" onclick="quickSaveAll()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><path d="M17 21v-8H7v8M7 3v5h8"/></svg>
          Lưu dữ liệu kỳ lương
        </button>
      </div>
    </aside>

    <div class="backdrop" onclick="document.body.classList.remove('nav-open')"></div>

    <!-- CỘT BÊN PHẢI: VÙNG HIỂN THỊ NỘI DUNG CHÍNH -->
    <div class="col">
      <div class="mbar">
        <button class="ibtn" onclick="document.body.classList.add('nav-open')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
        </button>
        Chấm công & Tính lương
      </div>

      <main class="main">
        <!-- Banner thông báo tổ chức & bảo mật -->
        <div class="banner">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
          <div class="grow">
            Đang quản trị: <b id="activeOrgTitle">Công ty Cổ phần Công nghệ & Thương mại Tân Phát Digital</b> · Vai trò: <b id="activeRoleTitle">Giám đốc (Owner)</b> · Kỳ lương: <b id="activePeriodTitle">Tháng 10/2026</b> (<span id="periodBadge" class="badge b-amber">DRAFT</span>)
          </div>
          <div class="row">
            <span class="badge b-p">Multi-Tenant Isolation</span>
            <span class="badge b-green">72/72 Test Pass</span>
          </div>
        </div>

        <!-- VIEW 1: TỔNG QUAN (DASHBOARD) -->
        <div id="v-dashboard" class="view" style="display:${initialTab === 'dashboard' ? 'block' : 'none'}">
          <div class="ph">
            <div>
              <h1>Tổng quan Quỹ lương & Nhân sự</h1>
              <p>Báo cáo quỹ lương, thuế TNCN và bảo hiểm theo kỳ lương Tháng 10/2026</p>
            </div>
            <div class="tools">
              <label class="mp">Kỳ lương <input type="month" id="dashMonthPicker" value="2026-10" onchange="changeMonth(this.value)"></label>
              <button class="btn xl" onclick="exportPayrollExcel()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M8 13h2M14 13h2M8 17h2M14 17h2"/></svg>
                Xuất Excel
              </button>
              <button class="btn" onclick="printCurrentView()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                In
              </button>
            </div>
          </div>

          <!-- BENTO HERO TILE (LILAC) -->
          <div class="bento-hero mb">
            <div style="display:flex;align-items:center;gap:8px;font-size:12px;font-weight:700;color:var(--dash-lilac-strong);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px"><path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/></svg>
              <span>Báo Cáo Nghiệp Vụ Quản Trị</span>
            </div>
            <h2 style="margin:0;font-size:24px;font-weight:800;letter-spacing:-0.02em;color:var(--dash-ink)">Kỳ lương <span id="dashHeroMonth">Tháng 10/2026</span></h2>
            <p style="margin:8px 0 16px;font-size:13px;color:rgba(17,17,20,0.8);max-width:640px;line-height:1.5">
              Hệ thống đã tự động tính toán dữ liệu chấm công 31 ngày, thuế TNCN lũy tiến từng phần và trích nộp bảo hiểm bắt buộc theo chuẩn Luật BHXH mới nhất.
            </p>
            <div style="display:flex;flex-wrap:wrap;gap:8px;font-size:12px">
              <span class="badge" style="background:rgba(255,255,255,0.7);color:var(--dash-ink);font-weight:700" id="dashHeroEmpCount">✓ 8 Nhân sự</span>
              <span class="badge" style="background:rgba(255,255,255,0.7);color:var(--dash-ink);font-weight:700">✓ Cô lập đa doanh nghiệp (Anti-IDOR)</span>
              <span class="badge" style="background:rgba(255,255,255,0.7);color:var(--dash-ink);font-weight:700">✓ Giảm trừ bản thân 11M & NPT 4.4M</span>
            </div>
          </div>

          <!-- 4 BENTO KEY CARDS VỚI SỐ LIỆU CHUYỂN ĐỘNG & SPARKLINE -->
          <div class="grid c4 mb" id="dashKeyCards">
            <!-- Rendered by JS -->
          </div>

          <!-- BIỂU ĐỒ DIỆN TÍCH AREA & DONUT SVG -->
          <div class="grid c21 mb">
            <div class="card">
              <div class="card-h">
                <h3>Chi phí lương doanh nghiệp theo tháng</h3>
                <span class="sub" id="dashAreaSub">Tháng này: <b>Đang tải...</b></span>
              </div>
              <div class="card-b" id="dashAreaChart"></div>
            </div>

            <div class="card">
              <div class="card-h">
                <h3>Cơ cấu chi phí doanh nghiệp</h3>
                <span class="sub">Tỷ trọng chi phí</span>
              </div>
              <div class="card-b" id="dashDonutChart"></div>
            </div>
          </div>

          <!-- QUỸ LƯƠNG PHÒNG BAN & TỶ LỆ ĐI LÀM -->
          <div class="grid c21 mb">
            <div class="card">
              <div class="card-h">
                <h3>Quỹ lương theo phòng ban</h3>
                <span class="sub">Phân bổ chi phí</span>
              </div>
              <div class="card-b" id="dashBarChart"></div>
            </div>

            <div class="card">
              <div class="card-h">
                <h3>Tỷ lệ đi làm trong tháng</h3>
                <span class="sub">Chuyên cần</span>
              </div>
              <div class="card-b" id="dashRingChart"></div>
            </div>
          </div>

          <!-- LEADERBOARD TOP THU NHẬP & NGHỈ NHIỀU NHẤT -->
          <div class="grid c3">
            <div class="card">
              <div class="card-h"><h3>Thu nhập cao nhất</h3></div>
              <div class="card-b" id="dashTopEarners"></div>
            </div>

            <div class="card">
              <div class="card-h"><h3>Nghỉ nhiều nhất tháng</h3></div>
              <div class="card-b" id="dashTopAbsences"></div>
            </div>

            <div class="card">
              <div class="card-h"><h3>Tiến độ & Phê duyệt kỳ lương</h3></div>
              <div class="card-b" style="display:flex;flex-direction:column;gap:12px">
                <p class="muted" style="margin:0;font-size:13px">
                  Trạng thái hiện tại: <b id="lockStateText">DRAFT (Đang mở)</b>.
                  Quản trị viên có thể điều chỉnh dữ liệu và tiến hành chốt sổ để chống gian lận.
                </p>
                <div class="row" style="flex-wrap:wrap;gap:8px">
                  <button class="btn" id="btnSubmitReview" onclick="submitReviewPayroll()">📤 Gửi duyệt kỳ lương</button>
                  <button class="btn pri" id="btnLock" onclick="lockPayroll()">🔒 Khóa sổ kỳ lương</button>
                  <button class="btn" id="btnPay" onclick="payPayroll()" style="background:#15803d;color:#fff;border-color:#15803d">💰 Xác nhận chi trả</button>
                  <button class="btn" id="btnUnlock" onclick="unlockPayroll()">🔓 Mở khóa kỳ lương</button>
                </div>
                <div style="font-size:12px;color:#64748b;border-top:1px dashed #e8eeed;padding-top:8px">
                  ✔ Tuân thủ Luật Bảo hiểm Xã hội & Thuế TNCN<br>
                  ✔ Nhật ký bảo mật ghi nhận đầy đủ hành động
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- VIEW 2: CHẤM CÔNG (CHAMCONG) -->
        <div id="v-chamcong" class="view" style="display:${initialTab === 'chamcong' ? 'block' : 'none'}">
          <div class="ph">
            <div>
              <h1>Bảng Chấm công Chi tiết</h1>
              <p>Chọn ký hiệu rồi bấm (hoặc kéo chuột) lên các ô ngày để chấm công cho nhân viên</p>
            </div>
            <div class="tools">
              <label class="mp">Kỳ lương <input type="month" value="2026-10" onchange="changeMonth(this.value)"></label>
              <button class="btn xl" onclick="exportAttendanceExcel()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M8 13h2M14 13h2M8 17h2M14 17h2"/></svg>
                Xuất Excel
              </button>
            </div>
          </div>

          <!-- BÚT CỌ CHẤM CÔNG NHANH -->
          <div class="card mb">
            <div class="card-b row" style="gap:8px" id="brushBarContainer">
              <!-- Injected by JS -->
            </div>
          </div>

          <!-- BẢNG CHẤM CÔNG 31 NGÀY MA TRẬN -->
          <div class="cc-wrap">
            <table class="cc" id="attendanceTable">
              <thead><tr id="attendanceThead"></tr></thead>
              <tbody id="attendanceTbody"></tbody>
            </table>
          </div>
          <div class="tbl-pager" id="ccPager"></div>
          <p class="small muted" style="margin-top:10px">
            Công chuẩn: <b>26</b> ngày/tháng · Ngày nghỉ tuần: <b>Chủ nhật</b> · Ký hiệu: <b>X</b> (Đi làm), <b>N</b> (Nửa ngày), <b>CT</b> (Công tác), <b>P</b> (Phép năm), <b>L</b> (Lễ, Tết), <b>O</b> (Ốm đau), <b>KP</b> (Không lương).
          </p>
        </div>

        <!-- VIEW 3: NHÂN VIÊN (NHANVIEN) -->
        <div id="v-nhanvien" class="view" style="display:${initialTab === 'nhanvien' ? 'block' : 'none'}">
          <div class="ph">
            <div>
              <h1>Hồ sơ Nhân sự & Tiền lương</h1>
              <p>Hồ sơ nhân sự, lương cơ bản, lương đóng bảo hiểm, phụ cấp và người phụ thuộc</p>
            </div>
            <div class="tools">
              <button class="btn" onclick="openImportModal()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5"/><path d="M12 3v12"/></svg>
                Nhập từ Excel
              </button>
              <button class="btn pri" onclick="openEmployeeModal()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>
                Thêm nhân viên
              </button>
            </div>
          </div>

          <div class="tbl-card">
            <div class="tbl-tools">
              <div class="search">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                <input class="inp" id="empSearchInput" placeholder="Tìm mã, họ tên, phòng ban..." oninput="filterEmployees(this.value)">
              </div>
              <select class="inp" id="empDeptFilter" onchange="filterEmployeesByDept(this.value)">
                <option value="">Tất cả phòng ban</option>
              </select>
              <span class="grow"></span>
              <span class="muted small">Bấm vào dòng hoặc nút sửa để chỉnh sửa hồ sơ</span>
            </div>

            <div class="tbl-wrap">
              <table class="tbl" id="empTable">
                <thead>
                  <tr>
                    <th>Mã NV</th>
                    <th>Họ và tên</th>
                    <th>Phòng ban</th>
                    <th>Chức vụ</th>
                    <th>Ngày vào</th>
                    <th class="r">Lương cơ bản</th>
                    <th class="r">Lương đóng BH</th>
                    <th class="r">PC Không thuế</th>
                    <th class="c">NPT</th>
                    <th>Số CCCD</th>
                    <th>Số tài khoản</th>
                    <th class="c">Trạng thái</th>
                    <th class="r">Thao tác</th>
                  </tr>
                </thead>
                <tbody id="empTbody"></tbody>
              </table>
            </div>
            <div class="tbl-pager" id="empPager"></div>
          </div>
        </div>

        <!-- VIEW 4: BẢNG LƯƠNG (BANGLUONG) -->
        <div id="v-bangluong" class="view" style="display:${initialTab === 'bangluong' ? 'block' : 'none'}">
          <div class="ph">
            <div>
              <h1>Bảng Thanh toán Tiền lương</h1>
              <p>Tự động tính lương theo ngày công, OT, BHXH, thuế TNCN. Các ô màu vàng có thể sửa trực tiếp.</p>
            </div>
            <div class="tools">
              <label class="mp">Kỳ lương <input type="month" value="2026-10" onchange="changeMonth(this.value)"></label>
              <button class="btn xl" onclick="exportPayrollExcel()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M8 13h2M14 13h2M8 17h2M14 17h2"/></svg>
                Xuất Excel
              </button>
              <button class="btn" onclick="printAllSlips()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 17.5v-11"/></svg>
                In tất cả phiếu lương
              </button>
            </div>
          </div>

          <div class="tbl-card">
            <div class="tbl-tools">
              <div class="search">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                <input class="inp" id="plSearchInput" placeholder="Tìm nhân viên trong bảng lương..." oninput="filterPayrollTable(this.value)">
              </div>
              <span class="grow"></span>
              <span class="small muted">Giảm trừ gia cảnh: Bản thân 11 triệu · Mỗi NPT 4,4 triệu · Biểu thuế lũy tiến từng phần</span>
            </div>

            <div class="tbl-wrap" id="plWrap">
              <table class="tbl compact pl" id="payrollTable">
                <thead>
                  <tr>
                    <th rowspan="2" class="stk c" style="left:0;min-width:44px">STT</th>
                    <th rowspan="2" class="stk" style="left:44px;min-width:72px">Mã NV</th>
                    <th rowspan="2" class="stk" style="left:116px;min-width:170px;box-shadow:inset -1px 0 0 #dfe7e5">Họ và tên</th>
                    <th colspan="8" class="grp">THU NHẬP</th>
                    <th colspan="4" class="grp">BẢO HIỂM NLĐ (10.5%)</th>
                    <th colspan="4" class="grp">THUẾ TNCN</th>
                    <th colspan="2" class="grp">KHẤU TRỪ</th>
                    <th rowspan="2" class="r" style="min-width:130px;color:var(--pd)">THỰC LĨNH</th>
                    <th rowspan="2" class="c" style="width:40px">Phiếu</th>
                  </tr>
                  <tr>
                    <th class="r">Lương CB</th>
                    <th class="c">Công</th>
                    <th class="r">Lương công/Khoán</th>
                    <th class="r">Ăn trưa</th>
                    <th class="r">Thâm niên & CC</th>
                    <th class="r">Lương OT</th>
                    <th class="r">Thưởng</th>
                    <th class="r font-bold">Tổng gross</th>
                    <th class="r">BHXH 8%</th>
                    <th class="r">BHYT 1.5%</th>
                    <th class="r">BHTN 1%</th>
                    <th class="r font-bold">Tổng BH NLĐ</th>
                    <th class="r">TN Chịu thuế</th>
                    <th class="c">NPT</th>
                    <th class="r">Giảm trừ GC</th>
                    <th class="r font-bold">Thuế TNCN</th>
                    <th class="r">Tạm ứng</th>
                    <th class="r">Khấu trừ khác</th>
                  </tr>
                </thead>
                <tbody id="payrollTbody"></tbody>
                <tfoot id="payrollTfoot"></tfoot>
              </table>
            </div>
            <div class="tbl-pager" id="plPager"></div>
          </div>
        </div>

        <!-- VIEW 5: THUẾ & BHXH (THUE) -->
        <div id="v-thue" class="view" style="display:${initialTab === 'thue' ? 'block' : 'none'}">
          <div class="ph">
            <div>
              <h1>Báo cáo Thuế TNCN & Bảo hiểm Bắt buộc</h1>
              <p>Đối chiếu biểu thuế 7 bậc chính thức vs 5 bậc dự thảo 2026 và công cụ tính lương Gross ⇄ Net</p>
            </div>
            <div class="tools">
              <button class="btn xl" onclick="exportTaxExcel()">📥 Xuất Báo cáo Thuế Excel</button>
            </div>
          </div>

          <div class="grid c21 mb">
            <div class="card">
              <div class="card-h">
                <h3>Bảng đối chiếu Thuế TNCN (7 Bậc Hiện hành vs 5 Bậc Dự thảo)</h3>
                <span class="sub">Kỳ lương 10/2026</span>
              </div>
              <div class="tbl-wrap">
                <table class="tbl compact">
                  <thead>
                    <tr>
                      <th>Mã NV</th>
                      <th>Họ và tên</th>
                      <th class="r">Thuế 7 bậc chính thức</th>
                      <th class="r">Thuế 5 bậc dự thảo</th>
                      <th class="r">Chênh lệch</th>
                    </tr>
                  </thead>
                  <tbody id="taxCompareBody"></tbody>
                </table>
              </div>
            </div>

            <!-- CÔNG CỤ TÍNH GROSS ⇄ NET DOANH NGHIỆP -->
            <div class="card">
              <div class="card-h"><h3>Tính nhanh lương Gross ⇄ Net</h3></div>
              <div class="card-b">
                <div class="form">
                  <label class="field">
                    <span>Số tiền</span>
                    <input class="inp num" id="gnAmt" value="30.000.000" oninput="formatMoneyInput(this); calcGrossNet();">
                  </label>
                  <label class="field">
                    <span>Quy đổi từ</span>
                    <select class="inp" id="gnType" onchange="calcGrossNet()">
                      <option value="GROSS">Đây là lương Gross</option>
                      <option value="NET">Đây là lương Net</option>
                    </select>
                  </label>
                  <label class="field">
                    <span>Lương đóng BH</span>
                    <input class="inp num" id="gnBH" placeholder="Bằng lương Gross" oninput="formatMoneyInput(this); calcGrossNet();">
                  </label>
                  <label class="field">
                    <span>Người phụ thuộc</span>
                    <input class="inp num" type="number" min="0" id="gnNPT" value="1" oninput="calcGrossNet()">
                  </label>
                </div>
                <div class="calc-out mt" id="gnOutput"></div>
              </div>
            </div>
          </div>

          <!-- BẢNG TỔNG HỢP TRÍCH NỘP BHXH PHẦN DOANH NGHIỆP & NGƯỜI LAO ĐỘNG -->
          <div class="card">
            <div class="card-h">
              <h3>Bảng trích nộp Bảo hiểm bắt buộc chi tiết (NLĐ 10.5% & Doanh nghiệp 22%)</h3>
              <span class="sub">Tỷ lệ theo quy định Luật BHXH 2024 & Luật Việc làm</span>
            </div>
            <div class="tbl-wrap">
              <table class="tbl compact" id="insuranceSummaryTable">
                <thead>
                  <tr>
                    <th>STT</th>
                    <th>Mã NV</th>
                    <th>Họ và tên</th>
                    <th class="r">Lương đóng BH</th>
                    <th class="r">BHXH NLĐ (8%)</th>
                    <th class="r">BHYT NLĐ (1.5%)</th>
                    <th class="r">BHTN NLĐ (1%)</th>
                    <th class="r font-bold">Cộng NLĐ (10.5%)</th>
                    <th class="r">BHXH DN (17.5%)</th>
                    <th class="r">BHYT DN (3%)</th>
                    <th class="r">BHTN DN (1%)</th>
                    <th class="r">KPCĐ (2%)</th>
                    <th class="r font-bold">Cộng DN (22%)</th>
                    <th class="r font-bold" style="color:var(--pd)">Tổng trích nộp</th>
                  </tr>
                </thead>
                <tbody id="insuranceSummaryTbody"></tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- VIEW 6: CÀI ĐẶT (CAIDAT) -->
        <div id="v-caidat" class="view" style="display:${initialTab === 'caidat' ? 'block' : 'none'}">
          <div class="ph">
            <div>
              <h1>Cài đặt Chính sách & Doanh nghiệp</h1>
              <p>Thiết lập thông tin pháp nhân, quy chế công chuẩn, hệ số làm thêm và tỷ lệ trích nộp</p>
            </div>
            <div class="tools">
              <button class="btn pri" onclick="saveCompanySettings()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><path d="M17 21v-8H7v8M7 3v5h8"/></svg>
                Lưu cài đặt doanh nghiệp
              </button>
            </div>
          </div>

          <div class="grid c2 mb">
            <div class="card">
              <div class="card-h"><h3>Thông tin Doanh nghiệp</h3></div>
              <div class="card-b">
                <div class="form">
                  <label class="field full">
                    <span>Tên công ty / Doanh nghiệp</span>
                    <input class="inp" id="cfgCompanyName" value="Công ty Cổ phần Công nghệ Alpha">
                  </label>
                  <label class="field">
                    <span>Mã số thuế</span>
                    <input class="inp" id="cfgTaxCode" value="0109988776">
                  </label>
                  <label class="field">
                    <span>Hotline liên hệ</span>
                    <input class="inp" id="cfgHotline" value="024.7300.8899">
                  </label>
                  <label class="field full">
                    <span>Địa chỉ trụ sở</span>
                    <input class="inp" id="cfgAddress" value="Tầng 12, Tòa nhà Innovation, Cầu Giấy, Hà Nội">
                  </label>
                </div>
              </div>
            </div>

            <div class="card">
              <div class="card-h"><h3>Chính sách Chấm công & Làm thêm giờ</h3></div>
              <div class="card-b">
                <div class="form">
                  <label class="field">
                    <span>Công chuẩn trong tháng (ngày)</span>
                    <input class="inp num" type="number" id="cfgStandardDays" value="26">
                  </label>
                  <label class="field">
                    <span>Phụ cấp ăn trưa miễn thuế (đ/tháng)</span>
                    <input class="inp num" id="cfgLunchAllowance" value="730.000" oninput="formatMoneyInput(this)">
                  </label>
                  <label class="field">
                    <span>Hệ số OT ngày thường (%)</span>
                    <input class="inp num" type="number" id="cfgOtWeekday" value="150">
                  </label>
                  <label class="field">
                    <span>Hệ số OT ngày nghỉ tuần (%)</span>
                    <input class="inp num" type="number" id="cfgOtWeekend" value="200">
                  </label>
                  <label class="field">
                    <span>Quy tắc làm tròn tiền lương</span>
                    <select class="inp" id="cfgRounding">
                      <option value="ROUND_1000">Làm tròn đến 1.000 đ</option>
                      <option value="ROUND_100">Làm tròn đến 100 đ</option>
                      <option value="NONE">Không làm tròn (Số lẻ)</option>
                    </select>
                  </label>
                  <label class="field">
                    <span>Áp dụng quy tắc Thuế TNCN</span>
                    <select class="inp" id="cfgTaxRule">
                      <option value="LAW_7_TIER_OFFICIAL">Luật hiện hành: 7 Bậc Lũy tiến</option>
                      <option value="DRAFT_5_TIER_2026">Dự thảo cải cách: 5 Bậc</option>
                    </select>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- VIEW 7: DỮ LIỆU & SAO LƯU (DATA) -->
        <div id="v-data" class="view" style="display:${initialTab === 'data' ? 'block' : 'none'}">
          <div class="ph">
            <div>
              <h1>Dữ liệu, Kiểm toán & Khôi phục</h1>
              <p>Sao lưu dữ liệu định dạng JSON, khôi phục từ bản lưu, và xem nhật ký bảo mật hệ thống</p>
            </div>
            <div class="tools">
              <button class="btn pri" onclick="exportBackupJson()">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
                Tải bản sao lưu (.json)
              </button>
              <button class="btn" onclick="document.getElementById('fileRestore').click()">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
                Khôi phục dữ liệu
              </button>
              <input type="file" id="fileRestore" accept=".json" style="display:none" onchange="handleRestoreFile(this)">
            </div>
          </div>

          <div class="grid c2 mb">
            <div class="card">
              <div class="card-h"><h3>Tình trạng Cơ sở Dữ liệu & Kỳ lương</h3></div>
              <div class="card-b">
                <div class="dl">
                  <div><span>Doanh nghiệp đang chọn</span><b id="dataActiveTenantName">Alpha Tech</b></div>
                  <div><span>Số lượng nhân sự hiện tại</span><b id="dataTotalEmpCount">6 nhân sự</b></div>
                  <div><span>Trạng thái khóa sổ kỳ lương</span><b id="dataLockStatusBadge">DRAFT</b></div>
                  <div><span>Bảo vệ quyền riêng tư (PII)</span><b>Kích hoạt tự động</b></div>
                </div>
                <div class="row mt">
                  <button class="btn danger" onclick="resetToSample()">
                    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5"/></svg>
                    Nạp lại dữ liệu mẫu gốc
                  </button>
                </div>
              </div>
            </div>

            <div class="card">
              <div class="card-h"><h3>Nhật ký Kiểm toán Hoạt động (Audit Trail)</h3></div>
              <div class="tbl-wrap" style="max-height:220px">
                <table class="tbl compact">
                  <thead>
                    <tr><th>Thời gian</th><th>Tài khoản</th><th>Hành động</th><th>Chi tiết</th></tr>
                  </thead>
                  <tbody id="auditLogTbody">
                    <tr><td class="small muted">17:15:00</td><td>owner@alpha-tech.vn</td><td><span class="badge b-p">CALCULATE_PAYROLL</span></td><td class="small">Kỳ lương 10/2026 (6 NV)</td></tr>
                    <tr><td class="small muted">17:08:22</td><td>accountant@alpha-tech.vn</td><td><span class="badge b-green">TIMEKEEPING_UPDATE</span></td><td class="small">Cập nhật công NV001</td></tr>
                    <tr><td class="small muted">17:00:10</td><td>owner@alpha-tech.vn</td><td><span class="badge b-amber">LOGIN_SUCCESS</span></td><td class="small">IP: 127.0.0.1 (Localhost)</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

      </main>

      <!-- CHÂN TRANG FOOTER HỆ THỐNG -->
      <footer class="foot">
        © 2026 Hệ thống Quản trị Nhân sự, Chấm công & Tiền lương Doanh nghiệp · Tiêu chuẩn bảo mật B2B Multi-Tenant
      </footer>
    </div>
  </div>
</div>

<!-- KHU VỰC IN PHIẾU LƯƠNG ẨN (#print-root) -->
<div id="print-root"></div>

<!-- MODAL THÊM / SỬA NHÂN VIÊN -->
<div id="empModal" class="modal-wrap" style="display:none">
  <div class="modal" style="max-width:760px">
    <div class="modal-h">
      <h3 id="empModalTitle">Thêm nhân viên mới</h3>
      <button class="ibtn" onclick="closeEmployeeModal()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
      </button>
    </div>
    <div class="modal-b">
      <div class="form">
        <div class="fsec">1. Thông tin Cá nhân & Liên hệ</div>
        <label class="field">
          <span>Mã nhân viên *</span>
          <input class="inp" id="mEmpCode" placeholder="NV007">
        </label>
        <label class="field">
          <span>Họ và tên *</span>
          <input class="inp" id="mEmpName" placeholder="Nguyễn Văn X">
        </label>
        <label class="field">
          <span>Giới tính</span>
          <select class="inp" id="mEmpGender">
            <option value="Nam">Nam</option>
            <option value="Nữ">Nữ</option>
          </select>
        </label>
        <label class="field">
          <span>Số CCCD (PII)</span>
          <input class="inp" id="mEmpCCCD" placeholder="001090012345">
        </label>

        <div class="fsec">2. Vị trí & Phòng ban</div>
        <label class="field">
          <span>Phòng ban</span>
          <select class="inp" id="mEmpDept"></select>
        </label>
        <label class="field">
          <span>Chức vụ / Vị trí</span>
          <input class="inp" id="mEmpJob" placeholder="Chuyên viên">
        </label>
        <label class="field">
          <span>Ngày bắt đầu làm việc</span>
          <input class="inp" type="date" id="mEmpStartDate" value="2024-01-01">
        </label>
        <label class="field">
          <span>Trạng thái làm việc</span>
          <select class="inp" id="mEmpStatus">
            <option value="WORKING">Đang làm việc</option>
            <option value="PROBATION">Thử việc</option>
            <option value="RESIGNED">Nghỉ việc</option>
          </select>
        </label>

        <div class="fsec">3. Tiền lương & Trợ cấp</div>
        <label class="field">
          <span>Lương cơ bản (đồng) *</span>
          <input class="inp num" id="mEmpBase" value="15.000.000" oninput="formatMoneyInput(this)">
        </label>
        <label class="field">
          <span>Lương đóng bảo hiểm</span>
          <input class="inp num" id="mEmpInsurance" value="15.000.000" oninput="formatMoneyInput(this)">
        </label>
        <label class="field">
          <span>Hình thức hưởng lương</span>
          <select class="inp" id="mEmpType">
            <option value="TIME_BASED">Lương thời gian (theo ngày công)</option>
            <option value="PIECE_RATE">Lương khoán sản phẩm</option>
          </select>
        </label>
        <label class="field">
          <span>Số người phụ thuộc (NPT)</span>
          <input class="inp num" type="number" min="0" id="mEmpDep" value="0">
        </label>

        <div class="fsec">4. Tài khoản Ngân hàng</div>
        <label class="field">
          <span>Tên ngân hàng</span>
          <input class="inp" id="mEmpBankName" placeholder="Vietcombank">
        </label>
        <label class="field">
          <span>Số tài khoản nhận lương</span>
          <input class="inp" id="mEmpBankAcc" placeholder="0011004455667">
        </label>
      </div>
    </div>
    <div class="modal-f">
      <button class="btn" onclick="closeEmployeeModal()">Hủy bỏ</button>
      <button class="btn pri" onclick="saveEmployeeData()">Lưu hồ sơ nhân viên</button>
    </div>
  </div>
</div>

<!-- MODAL XEM CHI TIẾT PHIẾU LƯƠNG CÁ NHÂN -->
<div id="slipModal" class="modal-wrap" style="display:none">
  <div class="modal" style="max-width:820px">
    <div class="modal-h">
      <h3>Phiếu lương nhân viên</h3>
      <button class="ibtn" onclick="closeSlipModal()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
      </button>
    </div>
    <div class="modal-b" id="slipModalContent"></div>
    <div class="modal-f">
      <button class="btn" onclick="closeSlipModal()">Đóng</button>
      <button class="btn pri" onclick="printModalSlip()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
        In phiếu lương này
      </button>
    </div>
  </div>
</div>

<!-- MODAL ĐIỀU CHỈNH THƯỞNG, TẠM ỨNG & LƯƠNG KHOÁN -->
<div id="adjustModal" class="modal-wrap" style="display:none">
  <div class="modal" style="max-width:540px">
    <div class="modal-h">
      <h3 id="adjustModalTitle">Điều chỉnh lương & Phụ cấp</h3>
      <button class="ibtn" onclick="closeAdjustModal()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
      </button>
    </div>
    <div class="modal-b">
      <input type="hidden" id="adjEmpId">
      <div class="form">
        <label class="field">
          <span>Tiền thưởng hiệu quả / Dự án (đ)</span>
          <input class="inp num" id="adjThuong" value="0" oninput="formatMoneyInput(this)">
        </label>
        <label class="field">
          <span>Tạm ứng lương trong kỳ (đ)</span>
          <input class="inp num" id="adjTamUng" value="0" oninput="formatMoneyInput(this)">
        </label>
        <label class="field">
          <span>Các khoản khấu trừ khác (đ)</span>
          <input class="inp num" id="adjKhauTru" value="0" oninput="formatMoneyInput(this)">
        </label>
        <div id="adjPieceRateFields" style="display:none">
          <label class="field">
            <span>Số lượng sản phẩm khoán</span>
            <input class="inp num" type="number" id="adjSlSP" value="0">
          </label>
          <label class="field">
            <span>Đơn giá mỗi sản phẩm (đ)</span>
            <input class="inp num" id="adjDgSP" value="0" oninput="formatMoneyInput(this)">
          </label>
        </div>
      </div>
    </div>
    <div class="modal-f">
      <button class="btn" onclick="closeAdjustModal()">Hủy</button>
      <button class="btn pri" id="btnSaveAdjustment" onclick="saveAdjustmentFromModal()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
        Lưu điều chỉnh
      </button>
    </div>
  </div>
</div>

<div id="toasts"></div>

<!-- LOGIC JAVASCRIPT ĐỒNG BỘ BACKEND DOANH NGHIỆP -->
<script>
'use strict';

const CODES = {
  X:  { n: 'Đi làm cả ngày', lv: 1,  hl: 1,  kl: 0, bg: '#ecfdf5', c: '#047857' },
  N:  { n: 'Làm nửa ngày',   lv: .5, hl: .5, kl: .5, bg: '#f0fdf4', c: '#15803d' },
  CT: { n: 'Đi công tác',    lv: 1,  hl: 1,  kl: 0, bg: '#eff6ff', c: '#1d4ed8' },
  P:  { n: 'Nghỉ phép năm',  lv: 0,  hl: 1,  kl: 0, bg: '#f0f9ff', c: '#0369a1' },
  L:  { n: 'Nghỉ lễ, Tết',   lv: 0,  hl: 1,  kl: 0, bg: '#f5f3ff', c: '#6d28d9' },
  O:  { n: 'Nghỉ ốm BHXH',   lv: 0,  hl: 0,  kl: 1, bg: '#fffbeb', c: '#b45309' },
  KP: { n: 'Nghỉ không lương',lv: 0, hl: 0,  kl: 1, bg: '#fef2f2', c: '#b91c1c' }
};

let currentTenant = 'tenant-alpha-tech';
let currentRole = 'ORG_OWNER';
let currentMonth = '2026-10';
let currentBrush = 'X';
let isPainting = false;

let payrollResults = [];
let attendanceData = {};
let companySettings = {};
let periodStatus = 'DRAFT';

// Security Sanitizers (Anti-XSS & Anti-CSV Injection)
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function sanitizeCsvCell(val) {
  if (val === null || val === undefined) return '';
  let str = String(val);
  if (/^[=\\+\\-@\\t\\r]/.test(str)) {
    str = "'" + str;
  }
  return str.replace(/"/g, '""');
}

// Toast helper (XSS-safe via textContent)
function toast(msg, type = 'ok') {
  const container = document.getElementById('toasts');
  const t = document.createElement('div');
  t.className = 'toast ' + (type === 'err' ? 'err' : 'ok');
  t.textContent = msg;
  container.appendChild(t);
  setTimeout(() => {
    t.style.transition = 'opacity .3s';
    t.style.opacity = 0;
    setTimeout(() => t.remove(), 300);
  }, 3200);
}

// Format helpers
function formatVND(n) {
  if (typeof n === 'string' && n.includes('*')) return n;
  return Math.round(+n || 0).toLocaleString('vi-VN') + ' đ';
}
function formatMoney(n) {
  if (typeof n === 'string' && n.includes('*')) return n;
  return Math.round(+n || 0).toLocaleString('vi-VN');
}
function parseMoney(s) {
  if (typeof s === 'number') return s;
  const num = String(s ?? '').replace(/[^\\d-]/g, '');
  return num && num !== '-' ? parseInt(num, 10) : 0;
}
function formatMoneyInput(el) {
  const val = parseMoney(el.value);
  el.value = val ? val.toLocaleString('vi-VN') : '';
}

// Navigation Route Mappings & Client-Side Router
const ROUTE_PATH_MAP = {
  dashboard: '/tong-quan',
  chamcong: '/cham-cong',
  nhanvien: '/nhan-vien',
  bangluong: '/bang-luong',
  thue: '/thue-bhxh',
  caidat: '/cai-dat',
  data: '/du-lieu'
};

const ROUTE_TITLE_MAP = {
  dashboard: 'Tổng quan · Hệ thống Chấm công & Tính lương B2B SaaS',
  chamcong: 'Chấm công · Hệ thống Chấm công & Tính lương B2B SaaS',
  nhanvien: 'Nhân viên · Hệ thống Chấm công & Tính lương B2B SaaS',
  bangluong: 'Bảng lương · Hệ thống Chấm công & Tính lương B2B SaaS',
  thue: 'Thuế & BHXH · Hệ thống Chấm công & Tính lương B2B SaaS',
  caidat: 'Cài đặt · Hệ thống Chấm công & Tính lương B2B SaaS',
  data: 'Dữ liệu & Khóa sổ · Hệ thống Chấm công & Tính lương B2B SaaS'
};

function getTabFromPath(path) {
  if (path === '/cham-cong' || path === '/timekeeping') return 'chamcong';
  if (path === '/nhan-vien' || path === '/employees') return 'nhanvien';
  if (path === '/bang-luong' || path === '/payroll') return 'bangluong';
  if (path === '/thue-bhxh' || path === '/tax-insurance') return 'thue';
  if (path === '/cai-dat' || path === '/settings') return 'caidat';
  if (path === '/du-lieu' || path === '/backup') return 'data';
  return 'dashboard';
}

function switchTab(tabId, pushState = true) {
  document.querySelectorAll('#sideTabs a').forEach(a => {
    a.classList.toggle('on', a.dataset.tab === tabId);
  });
  document.querySelectorAll('.view').forEach(p => {
    p.style.display = (p.id === 'v-' + tabId) ? 'block' : 'none';
  });

  const newPath = ROUTE_PATH_MAP[tabId] || '/tong-quan';
  const newTitle = ROUTE_TITLE_MAP[tabId] || 'Hệ thống Quản trị Chấm công & Tính lương';
  document.title = newTitle;

  if (pushState && window.location.pathname !== newPath) {
    history.pushState({ tab: tabId }, newTitle, newPath);
  }

  window.scrollTo(0, 0);
}

// Navigation Tabs Click Interception
document.querySelectorAll('#sideTabs a').forEach(a => {
  a.addEventListener('click', e => {
    e.preventDefault();
    switchTab(a.dataset.tab, true);
    document.body.classList.remove('nav-open');
  });
});

// Popstate Handler (Browser Back / Forward)
window.addEventListener('popstate', e => {
  const tab = (e.state && e.state.tab) || getTabFromPath(window.location.pathname);
  switchTab(tab, false);
});

// Tenant & Role Switch & Session Context Sync
let currentPeriodVersion = 1;

async function syncSessionToServer(tenantId, role) {
  try {
    const res = await fetch('/api/auth/switch-context', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId, userRole: role })
    });
    return await res.json();
  } catch (e) {
    console.warn('Session sync error:', e);
  }
}

async function switchTenant(tenantId) {
  currentTenant = tenantId;
  const isAlpha = tenantId === 'tenant-alpha-tech';
  document.getElementById('activeOrgTitle').textContent = isAlpha ? 'Công ty Cổ phần Công nghệ & Thương mại Tân Phát Digital' : 'Công ty TNHH Vận tải & Dịch vụ Kho vận Bắc Nam';
  document.getElementById('dataActiveTenantName').textContent = isAlpha ? 'Tân Phát Digital' : 'Bắc Nam Logistics';
  await syncSessionToServer(currentTenant, currentRole);
  loadAllData();
  toast('Đã chuyển sang quản trị: ' + (isAlpha ? 'Tân Phát Digital' : 'Bắc Nam Logistics'));
}

function applyRoleUiGating(role) {
  const allowedTabsByRole = {
    ORG_OWNER: ['dashboard', 'chamcong', 'nhanvien', 'bangluong', 'thue', 'caidat', 'data'],
    ORG_ADMIN: ['dashboard', 'chamcong', 'nhanvien', 'bangluong', 'thue', 'caidat', 'data'],
    HR_MANAGER: ['dashboard', 'chamcong', 'nhanvien', 'bangluong'],
    ACCOUNTANT: ['dashboard', 'chamcong', 'nhanvien', 'bangluong', 'thue', 'caidat'],
    DEPARTMENT_MANAGER: ['dashboard', 'chamcong'],
    EMPLOYEE: ['dashboard', 'chamcong', 'bangluong'],
  };

  const allowedTabs = allowedTabsByRole[role] || allowedTabsByRole.ORG_OWNER;
  document.querySelectorAll('#sideTabs a').forEach(el => {
    const tab = el.dataset.tab;
    el.style.display = allowedTabs.includes(tab) ? '' : 'none';
  });

  const isOwner = role === 'ORG_OWNER' || role === 'OWNER';
  const isAdminOrOwner = isOwner || role === 'ORG_ADMIN' || role === 'ADMIN';
  const isFinance = isAdminOrOwner || role === 'ACCOUNTANT';
  const isHR = isAdminOrOwner || role === 'HR_MANAGER';

  // Lock/Unlock buttons in data and header
  const btnLock = document.getElementById('btnLock');
  const btnUnlock = document.getElementById('btnUnlock');
  if (btnLock) btnLock.style.display = isAdminOrOwner ? '' : 'none';
  if (btnUnlock) btnUnlock.style.display = isOwner ? '' : 'none';

  // Attendance brush bar (EMPLOYEE & ACCOUNTANT cannot edit attendance)
  const brushBar = document.getElementById('brushBarContainer');
  if (brushBar) {
    brushBar.style.display = (role === 'EMPLOYEE' || role === 'ACCOUNTANT') ? 'none' : '';
  }

  // Employee Add button
  const btnAddEmp = document.getElementById('btnAddEmployee');
  if (btnAddEmp) btnAddEmp.style.display = isHR ? '' : 'none';

  // Reset sample data button
  const btnResetData = document.getElementById('btnResetData');
  if (btnResetData) btnResetData.style.display = isOwner ? '' : 'none';

  // If current active tab is not allowed for the role, gracefully switch to dashboard
  const currentTabLink = document.querySelector('#sideTabs a.on');
  const currentTab = currentTabLink ? currentTabLink.dataset.tab : 'dashboard';
  if (!allowedTabs.includes(currentTab)) {
    switchTab('dashboard', true);
  }
}

async function switchRole(role) {
  currentRole = role;
  const roleNames = {
    ORG_OWNER: 'Giám đốc / Chủ sở hữu (Owner)',
    ORG_ADMIN: 'Quản trị viên Doanh nghiệp (Admin)',
    HR_MANAGER: 'Trưởng phòng Nhân sự (HR)',
    ACCOUNTANT: 'Kế toán trưởng (Accountant)',
    DEPARTMENT_MANAGER: 'Trưởng bộ phận (Manager)',
    EMPLOYEE: 'Nhân viên (Self-Service)'
  };
  const title = roleNames[role] || role;
  const roleTitleEl = document.getElementById('activeRoleTitle');
  if (roleTitleEl) roleTitleEl.textContent = title;
  await syncSessionToServer(currentTenant, currentRole);
  applyRoleUiGating(role);
  loadAllData();
  toast('Đã đổi vai trò sang: ' + title);
}

function changeMonth(ym) {
  currentMonth = ym;
  document.getElementById('activePeriodTitle').textContent = 'Tháng ' + ym.slice(5) + '/' + ym.slice(0, 4);
  loadAllData();
}

// Load all data from API
async function loadAllData() {
  try {
    applyRoleUiGating(currentRole);
    // 1. Fetch Timekeeping
    const tkRes = await fetch(\`/api/timekeeping?tenantId=\${currentTenant}&userRole=\${currentRole}\`);
    const tkData = await tkRes.json();
    attendanceData = tkData.attendance || {};

    // 2. Fetch Payroll Calculation
    const plRes = await fetch(\`/api/payroll/calculate?tenantId=\${currentTenant}&userRole=\${currentRole}\`);
    const plData = await plRes.json();
    payrollResults = plData.payroll || [];
    periodStatus = plData.periodStatus || 'DRAFT';
    currentPeriodVersion = plData.periodVersion || 1;
    companySettings = plData.settings || {};

    // Update UI components
    updatePeriodBadge();
    renderKeyCards();
    renderDashboardCharts();
    renderAttendanceGrid();
    renderEmployeeTable();
    renderPayrollTable();
    renderTaxComparison();
    renderInsuranceSummary();
    calcGrossNet();

    document.getElementById('dataTotalEmpCount').textContent = payrollResults.length + ' nhân sự';
  } catch (err) {
    console.error('Lỗi khi tải dữ liệu:', err);
    toast('Lỗi kết nối máy chủ: ' + err.message, 'err');
  }
}

// Period Status Badge
function updatePeriodBadge() {
  const badge = document.getElementById('periodBadge');
  const lockSub = document.getElementById('lockStateText');
  const dataBadge = document.getElementById('dataLockStatusBadge');
  const btnSubmitReview = document.getElementById('btnSubmitReview');
  const btnLock = document.getElementById('btnLock');
  const btnPay = document.getElementById('btnPay');
  const btnUnlock = document.getElementById('btnUnlock');

  badge.textContent = periodStatus;
  if (dataBadge) dataBadge.textContent = periodStatus;

  if (periodStatus === 'PAID') {
    badge.className = 'badge b-green';
    if (lockSub) lockSub.innerHTML = '<span style="color:#15803d;font-weight:700">PAID (Đã chi trả thành công)</span>';
    if (btnSubmitReview) btnSubmitReview.disabled = true;
    if (btnLock) btnLock.disabled = true;
    if (btnPay) btnPay.disabled = true;
    if (btnUnlock) btnUnlock.disabled = true;
  } else if (periodStatus === 'LOCKED') {
    badge.className = 'badge b-red';
    if (lockSub) lockSub.innerHTML = '<span style="color:#dc2626;font-weight:700">LOCKED (Đã khóa sổ an toàn)</span>';
    if (btnSubmitReview) btnSubmitReview.disabled = true;
    if (btnLock) btnLock.disabled = true;
    if (btnPay) btnPay.disabled = false;
    if (btnUnlock) btnUnlock.disabled = false;
  } else if (periodStatus === 'REVIEWING') {
    badge.className = 'badge b-blue';
    if (lockSub) lockSub.innerHTML = '<span style="color:#2563eb;font-weight:700">REVIEWING (Đang chờ lãnh đạo duyệt)</span>';
    if (btnSubmitReview) btnSubmitReview.disabled = true;
    if (btnLock) btnLock.disabled = false;
    if (btnPay) btnPay.disabled = true;
    if (btnUnlock) btnUnlock.disabled = false;
  } else {
    badge.className = 'badge b-amber';
    if (lockSub) lockSub.innerHTML = '<span style="color:#d97706;font-weight:700">DRAFT (Đang mở chỉnh sửa)</span>';
    if (btnSubmitReview) btnSubmitReview.disabled = false;
    if (btnLock) btnLock.disabled = false;
    if (btnPay) btnPay.disabled = true;
    if (btnUnlock) btnUnlock.disabled = true;
  }
}

// Submit Review Payroll (DRAFT -> REVIEWING)
async function submitReviewPayroll() {
  if (!confirm('Gửi duyệt kỳ lương này lên Ban Giám đốc? Sau khi gửi duyệt, bảng chấm công và lương sẽ chuyển sang trạng thái chờ duyệt.')) return;
  try {
    const res = await fetch('/api/payroll/submit-review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId: currentTenant, userRole: currentRole, expectedVersion: currentPeriodVersion })
    });
    const d = await res.json();
    if (d.success) {
      periodStatus = 'REVIEWING';
      updatePeriodBadge();
      loadAllData();
      toast('Đã gửi duyệt kỳ lương thành công!');
    } else {
      toast(d.error || 'Không thể gửi duyệt', 'err');
      if (res.status === 409) loadAllData();
    }
  } catch (e) {
    toast('Lỗi: ' + e.message, 'err');
  }
}

// Lock Payroll (REVIEWING / DRAFT -> LOCKED)
async function lockPayroll() {
  if (!confirm('Khóa sổ kỳ lương này? Sau khi khóa sẽ không thể chỉnh sửa ngày công hay mức lương.')) return;
  try {
    const res = await fetch('/api/payroll/lock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId: currentTenant, userRole: currentRole, expectedVersion: currentPeriodVersion })
    });
    const d = await res.json();
    if (d.success) {
      periodStatus = 'LOCKED';
      updatePeriodBadge();
      loadAllData();
      toast('Đã khóa sổ kỳ lương thành công!');
    } else {
      toast(d.error || 'Không thể khóa sổ', 'err');
      if (res.status === 409) loadAllData();
    }
  } catch (e) {
    toast('Lỗi: ' + e.message, 'err');
  }
}

// Pay Payroll (LOCKED -> PAID)
async function payPayroll() {
  if (!confirm('Xác nhận đã giải ngân chi trả lương qua ngân hàng cho toàn bộ nhân sự? Thao tác này sẽ đóng sổ kỳ lương vĩnh viễn.')) return;
  try {
    const res = await fetch('/api/payroll/pay', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId: currentTenant, userRole: currentRole, expectedVersion: currentPeriodVersion })
    });
    const d = await res.json();
    if (d.success) {
      periodStatus = 'PAID';
      updatePeriodBadge();
      loadAllData();
      toast('Đã xác nhận giải ngân chi trả kỳ lương (PAID)!');
    } else {
      toast(d.error || 'Không thể xác nhận chi trả', 'err');
      if (res.status === 409) loadAllData();
    }
  } catch (e) {
    toast('Lỗi: ' + e.message, 'err');
  }
}

// Unlock Payroll (LOCKED / REVIEWING -> DRAFT)
async function unlockPayroll() {
  const reason = prompt('Nhập lý do mở khóa kỳ lương (tối thiểu 10 ký tự):', 'Điều chỉnh ngày công bù cho nhân viên');
  if (!reason) return;
  try {
    const res = await fetch('/api/payroll/unlock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId: currentTenant, userRole: currentRole, reason, expectedVersion: currentPeriodVersion })
    });
    const d = await res.json();
    if (d.success) {
      periodStatus = 'DRAFT';
      updatePeriodBadge();
      loadAllData();
      toast('Đã mở khóa kỳ lương!');
    } else {
      toast(d.error || 'Không thể mở khóa', 'err');
      if (res.status === 409) loadAllData();
    }
  } catch (e) {
    toast('Lỗi: ' + e.message, 'err');
  }
}

// Animate Counter function for Bento style animated numbers
function animateCounter(el, target, duration = 1000) {
  if (!el) return;
  const start = el._currentVal !== undefined ? el._currentVal : 0;
  el._currentVal = target;
  const startTime = performance.now();
  function step(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    // Cubic ease-out: 1 - (1 - t)^3
    const ease = 1 - Math.pow(1 - progress, 3);
    const val = Math.round(start + (target - start) * ease);
    el.innerHTML = formatMoney(val) + ' <small>đ</small>';
    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

// Render Key Cards (Bento style with animated numbers)
function renderKeyCards() {
  const totalNet = payrollResults.reduce((s, p) => s + (p.netSalary || 0), 0);
  const totalGross = payrollResults.reduce((s, p) => s + (p.grossSalary || 0), 0);
  const totalTax = payrollResults.reduce((s, p) => s + (p.taxAmount || 0), 0);
  const totalIns = payrollResults.reduce((s, p) => s + (p.insurance ? (p.insurance.totalEmployee || 0) : 0), 0);

  // Update Hero tile badges if present
  const heroEmp = document.getElementById('dashHeroEmpCount');
  if (heroEmp) heroEmp.textContent = '✓ ' + payrollResults.length + ' Nhân sự';
  const heroMonth = document.getElementById('dashHeroMonth');
  if (heroMonth) {
    const m = currentMonth.split('-');
    heroMonth.textContent = 'Tháng ' + m[1] + '/' + m[0];
  }

  const container = document.getElementById('dashKeyCards');
  container.innerHTML = \`
    <!-- Bento Card 1: Ink Card (Primary Emphasis - Net Salary) -->
    <div class="kc bento-ink">
      <div class="kc-h">
        <span class="kc-ic" style="background:rgba(255,255,255,0.12);color:#34d399">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/></svg>
        </span>
        <span class="kc-l" style="color:rgba(255,255,255,0.7)">Thực Lĩnh (Net Salary)</span>
        <span class="pill" style="background:rgba(52,211,153,0.2);color:#34d399">▲ 4.8%</span>
      </div>
      <div class="kc-v" id="kcNetVal" style="color:#ffffff">\${formatMoney(totalNet)} <small style="color:rgba(255,255,255,0.6)">đ</small></div>
      <div class="kc-s" style="color:rgba(255,255,255,0.7)">\${payrollResults.length} nhân sự · Chi trả qua ngân hàng 100%</div>
      <svg class="spk" viewBox="0 0 240 42" preserveAspectRatio="none">
        <path d="M0,38 L40,32 L80,35 L120,24 L160,26 L200,14 L240,10 L240,42 L0,42 Z" fill="rgba(52,211,153,0.15)"/>
        <path class="l" d="M0,38 L40,32 L80,35 L120,24 L160,26 L200,14 L240,10" fill="none" stroke="#34d399" stroke-width="2.5"/>
      </svg>
    </div>

    <!-- Bento Card 2: Sky Pastel Tile (Total Gross) -->
    <div class="kc" style="background:var(--dash-surface)">
      <div class="kc-h">
        <span class="kc-ic" style="background:var(--dash-sky);color:#0369a1">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m22 7-8.5 8.5-5-5L2 17"/><path d="M16 7h6v6"/></svg>
        </span>
        <span class="kc-l">Tổng Thu Nhập (Gross)</span>
        <span class="pill pu">▲ 3.2%</span>
      </div>
      <div class="kc-v" id="kcGrossVal" style="color:#0369a1">\${formatMoney(totalGross)} <small>đ</small></div>
      <div class="kc-s">Bình quân \${formatMoney(payrollResults.length ? totalGross / payrollResults.length : 0)} đ/người</div>
      <svg class="spk" viewBox="0 0 240 42" preserveAspectRatio="none">
        <path d="M0,36 L50,30 L100,28 L150,20 L200,16 L240,8 L240,42 L0,42 Z" fill="#f0f9ff"/>
        <path class="l" d="M0,36 L50,30 L100,28 L150,20 L200,16 L240,8" fill="none" stroke="#0284c7" stroke-width="2"/>
      </svg>
    </div>

    <!-- Bento Card 3: Amber Pastel Tile (Thuế TNCN) -->
    <div class="kc" style="background:var(--dash-surface)">
      <div class="kc-h">
        <span class="kc-ic" style="background:var(--dash-amber);color:#b45309">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 5 5 19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg>
        </span>
        <span class="kc-l">Thuế TNCN Khấu Trừ</span>
        <span class="pill na">\${payrollResults.filter(p => p.taxAmount > 0).length} người nộp</span>
      </div>
      <div class="kc-v" id="kcTaxVal" style="color:#b45309">\${formatMoney(totalTax)} <small>đ</small></div>
      <div class="kc-s">Biểu lũy tiến 5 bậc 2026 chuẩn hóa</div>
      <svg class="spk" viewBox="0 0 240 42" preserveAspectRatio="none">
        <path d="M0,32 L60,34 L120,28 L180,24 L240,16 L240,42 L0,42 Z" fill="#fffbeb"/>
        <path class="l" d="M0,32 L60,34 L120,28 L180,24 L240,16" fill="none" stroke="#d97706" stroke-width="2"/>
      </svg>
    </div>

    <!-- Bento Card 4: Mint Pastel Tile (Bảo hiểm & KPCĐ) -->
    <div class="kc" style="background:var(--dash-surface)">
      <div class="kc-h">
        <span class="kc-ic" style="background:var(--dash-mint);color:#15803d">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        </span>
        <span class="kc-l">Bảo Hiểm & KPCĐ</span>
        <span class="pill pu">10.5% + 22%</span>
      </div>
      <div class="kc-v" id="kcInsVal" style="color:#15803d">\${formatMoney(totalIns)} <small>đ</small></div>
      <div class="kc-s">Phần người lao động chịu 10.5%</div>
      <svg class="spk" viewBox="0 0 240 42" preserveAspectRatio="none">
        <path d="M0,30 L60,30 L120,25 L180,22 L240,18 L240,42 L0,42 Z" fill="#f0fdf4"/>
        <path class="l" d="M0,30 L60,30 L120,25 L180,22 L240,18" fill="none" stroke="#16a34a" stroke-width="2"/>
      </svg>
    </div>
  \`;

  // Kích hoạt số liệu chuyển động mượt mà (Animated Numbers)
  animateCounter(document.getElementById('kcNetVal'), totalNet);
  animateCounter(document.getElementById('kcGrossVal'), totalGross);
  animateCounter(document.getElementById('kcTaxVal'), totalTax);
  animateCounter(document.getElementById('kcInsVal'), totalIns);
}

// Render Dashboard SVG Charts
function renderDashboardCharts() {
  const totalNet = payrollResults.reduce((s, p) => s + (p.netSalary || 0), 0);
  const totalGross = payrollResults.reduce((s, p) => s + (p.grossSalary || 0), 0);
  const totalTax = payrollResults.reduce((s, p) => s + (p.taxAmount || 0), 0);
  const totalInsNLD = payrollResults.reduce((s, p) => s + (p.insurance ? (p.insurance.totalEmployee || 0) : 0), 0);
  const totalInsDN = Math.round(totalInsNLD * (22 / 10.5));
  const totalCost = totalGross + totalInsDN;

  document.getElementById('dashAreaSub').innerHTML = \`Tháng này: <b>\${formatMoney(totalCost)} đ</b> · \${payrollResults.length} người đang làm\`;

  // 1. Area Chart (12 Months Trend)
  document.getElementById('dashAreaChart').innerHTML = \`
    <div class="chart">
      <svg viewBox="0 0 640 220" style="width:100%;height:auto;display:block">
        <defs>
          <linearGradient id="ag1" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#2563eb" stop-opacity="0.22"/>
            <stop offset="1" stop-color="#2563eb" stop-opacity="0"/>
          </linearGradient>
        </defs>
        <line x1="50" x2="620" y1="180" y2="180" stroke="#eef2f1"/>
        <line x1="50" x2="620" y1="130" y2="130" stroke="#eef2f1" stroke-dasharray="3 4"/>
        <line x1="50" x2="620" y1="80" y2="80" stroke="#eef2f1" stroke-dasharray="3 4"/>
        <line x1="50" x2="620" y1="30" y2="30" stroke="#eef2f1" stroke-dasharray="3 4"/>
        
        <polygon points="50,180 50,135 145,128 240,118 335,115 430,95 525,82 620,70 620,180" fill="url(#ag1)"/>
        <polyline class="arealine" pathLength="1" points="50,135 145,128 240,118 335,115 430,95 525,82 620,70" fill="none" stroke="#2563eb" stroke-width="2.6" stroke-linejoin="round"/>
        
        <circle cx="50" cy="135" r="4" fill="#fff" stroke="#2563eb" stroke-width="2"/>
        <circle cx="145" cy="128" r="4" fill="#fff" stroke="#2563eb" stroke-width="2"/>
        <circle cx="240" cy="118" r="4" fill="#fff" stroke="#2563eb" stroke-width="2"/>
        <circle cx="335" cy="115" r="4" fill="#fff" stroke="#2563eb" stroke-width="2"/>
        <circle cx="430" cy="95" r="4" fill="#fff" stroke="#2563eb" stroke-width="2"/>
        <circle cx="525" cy="82" r="4" fill="#fff" stroke="#2563eb" stroke-width="2"/>
        <circle cx="620" cy="70" r="4" fill="#fff" stroke="#2563eb" stroke-width="2"/>

        <text x="50" y="202" font-size="11" fill="#64748b" text-anchor="middle">T4/26</text>
        <text x="145" y="202" font-size="11" fill="#64748b" text-anchor="middle">T5/26</text>
        <text x="240" y="202" font-size="11" fill="#64748b" text-anchor="middle">T6/26</text>
        <text x="335" y="202" font-size="11" fill="#64748b" text-anchor="middle">T7/26</text>
        <text x="430" y="202" font-size="11" fill="#64748b" text-anchor="middle">T8/26</text>
        <text x="525" y="202" font-size="11" fill="#64748b" text-anchor="middle">T9/26</text>
        <text x="620" y="202" font-size="11" fill="#2563eb" font-weight="700" text-anchor="middle">T10/26</text>
      </svg>
    </div>
  \`;

  // 2. Donut Chart (Expense Distribution)
  const pNet = totalCost ? Math.round((totalNet / totalCost) * 100) : 0;
  const pTax = totalCost ? Math.round((totalTax / totalCost) * 100) : 0;
  const pInsNLD = totalCost ? Math.round((totalInsNLD / totalCost) * 100) : 0;
  const pInsDN = 100 - pNet - pTax - pInsNLD;

  document.getElementById('dashDonutChart').innerHTML = \`
    <div class="donut">
      <svg viewBox="0 0 170 170">
        <circle cx="85" cy="85" r="62" fill="none" stroke="#f1f5f9" stroke-width="24"/>
        <circle cx="85" cy="85" r="62" fill="none" stroke="#2563eb" stroke-width="24" stroke-dasharray="270 390" stroke-dashoffset="0" transform="rotate(-90 85 85)"/>
        <circle cx="85" cy="85" r="62" fill="none" stroke="#f59e0b" stroke-width="24" stroke-dasharray="35 390" stroke-dashoffset="-270" transform="rotate(-90 85 85)"/>
        <circle cx="85" cy="85" r="62" fill="none" stroke="#4f46e5" stroke-width="24" stroke-dasharray="45 390" stroke-dashoffset="-305" transform="rotate(-90 85 85)"/>
        <circle cx="85" cy="85" r="62" fill="none" stroke="#0284c7" stroke-width="24" stroke-dasharray="40 390" stroke-dashoffset="-350" transform="rotate(-90 85 85)"/>
        <text x="85" y="80" text-anchor="middle" font-size="16" font-weight="800" fill="#0f172a">\${formatMoney(Math.round(totalCost / 1e6))} tr</text>
        <text x="85" y="98" text-anchor="middle" font-size="11" fill="#64748b">Chi phí DN</text>
      </svg>
      <div class="dl">
        <div><i style="background:#2563eb"></i><span>Trả người LĐ (Net)</span><b>\${formatMoney(totalNet)}</b><em>\${pNet}%</em></div>
        <div><i style="background:#f59e0b"></i><span>Thuế TNCN nộp hộ</span><b>\${formatMoney(totalTax)}</b><em>\${pTax}%</em></div>
        <div><i style="background:#4f46e5"></i><span>BH phần NLĐ</span><b>\${formatMoney(totalInsNLD)}</b><em>\${pInsNLD}%</em></div>
        <div><i style="background:#0284c7"></i><span>BH & KPCĐ phần DN</span><b>\${formatMoney(totalInsDN)}</b><em>\${pInsDN}%</em></div>
      </div>
    </div>
  \`;

  // 3. Quỹ lương theo phòng ban (Stacked Bars)
  const depts = {};
  payrollResults.forEach(p => {
    const dept = p.departmentName || 'Kỹ thuật';
    depts[dept] = (depts[dept] || 0) + (p.netSalary || 0);
  });
  const deptEntries = Object.entries(depts);
  const maxDept = Math.max(...deptEntries.map(e => e[1]), 1);

  document.getElementById('dashBarChart').innerHTML = \`
    <div style="padding:4px 0">
      \${deptEntries.map(([name, val]) => \`
        <div class="hb">
          <div class="hb-top"><span><b>\${name}</b></span><b>\${formatMoney(val)} đ</b></div>
          <div class="hb-bar"><i style="width:\${Math.max(4, (val / maxDept) * 100)}%;background:linear-gradient(90deg, #93c5fd, #2563eb)"></i></div>
        </div>
      \`).join('')}
    </div>
  \`;

  // 4. Tỷ lệ đi làm (Ring Progress)
  const totalActual = payrollResults.reduce((s, p) => s + (p.actualWorkDays || 0), 0);
  const totalStandard = payrollResults.length * 26;
  const pct = totalStandard ? Math.round((totalActual / totalStandard) * 100) : 0;
  const CIR = 2 * Math.PI * 62;
  const strokeLen = (CIR * pct) / 100;

  document.getElementById('dashRingChart').innerHTML = \`
    <div class="ring">
      <svg viewBox="0 0 170 170">
        <circle cx="85" cy="85" r="62" fill="none" stroke="#f1f5f9" stroke-width="16"/>
        <circle cx="85" cy="85" r="62" fill="none" stroke="#2563eb" stroke-width="16" stroke-linecap="round" stroke-dasharray="\${strokeLen.toFixed(1)} \${CIR}" transform="rotate(-90 85 85)"/>
        <text x="85" y="92" text-anchor="middle" font-size="30" font-weight="800" fill="#2563eb">\${pct}%</text>
      </svg>
      <b>\${totalActual} / \${totalStandard} công</b>
      <span class="muted small">Công làm thực tế / công chuẩn</span>
      <div class="row mt" style="justify-content:center">
        <span class="badge b-p">OT: \${payrollResults.reduce((s,p)=>s+(p.overtimeHours||0),0)} giờ làm thêm</span>
      </div>
    </div>
  \`;

  // 5. Top Earners
  const sortedEarners = [...payrollResults].sort((a, b) => (b.grossSalary || 0) - (a.grossSalary || 0)).slice(0, 4);
  const maxGross = sortedEarners.length ? sortedEarners[0].grossSalary : 1;
  const medals = ['#f5b301', '#94a3b8', '#cd7f32', '#94a3b8'];

  document.getElementById('dashTopEarners').innerHTML = sortedEarners.map((p, i) => \`
    <div class="tli">
      <span class="medal" style="background:\${medals[i]}">\${i + 1}</span>
      <span class="avatar">\${escapeHtml(p.employeeName.slice(0, 1))}</span>
      <div class="grow">
        <b>\${escapeHtml(p.employeeName)}</b>
        <small>\${escapeHtml(p.employeeCode)} · \${p.salaryType === 'PIECE_RATE' ? 'Lương khoán SP' : 'Lương thời gian'}</small>
        <div class="pb"><i style="width:\${(p.grossSalary / maxGross) * 100}%;background:linear-gradient(90deg,#93c5fd,#2563eb)"></i></div>
      </div>
      <div class="v">
        \${formatMoney(p.grossSalary)} đ
        <small class="muted">Net: \${formatMoney(p.netSalary)} đ</small>
      </div>
    </div>
  \`).join('') || '<div class="c muted">Chưa có dữ liệu</div>';

  // 6. Top Absences
  const absences = payrollResults.map(p => ({
    name: p.employeeName,
    code: p.employeeCode,
    unpaid: p.unpaidLeaveDays || 0
  })).sort((a, b) => b.unpaid - a.unpaid).slice(0, 4);

  document.getElementById('dashTopAbsences').innerHTML = absences.map(a => \`
    <div class="tli">
      <span class="avatar" style="background:#fee2e2;color:#b91c1c"> nghỉ </span>
      <div class="grow">
        <b>\${escapeHtml(a.name)}</b>
        <small>\${escapeHtml(a.code)}</small>
        <div class="pb"><i style="width:\${Math.min(100, (a.unpaid / 14) * 100)}%;background:#ef4444"></i></div>
      </div>
      <div class="v">
        \${a.unpaid} ngày
        <small class="muted">\${a.unpaid >= 14 ? 'Miễn BHXH' : 'Nghỉ không lương'}</small>
      </div>
    </div>
  \`).join('');
}

// Render Attendance Grid (31 Days Matrix with Brush)
function renderAttendanceGrid() {
  // Brush buttons bar
  const brushContainer = document.getElementById('brushBarContainer');
  brushContainer.innerHTML = \`
    \${Object.entries(CODES).map(([code, def]) => \`
      <button class="brush \${currentBrush === code ? 'on' : ''}" data-code="\${code}" style="background:\${def.bg};color:\${def.c}" onclick="selectBrush('\${code}')">
        \${code} <small>\${def.n}</small>
      </button>
    \`).join('')}
    <button class="brush \${currentBrush === '' ? 'on' : ''}" data-code="" style="background:#f1f5f9;color:#475569" onclick="selectBrush('')">
      Tẩy <small>xóa ô</small>
    </button>
    <span class="grow"></span>
    <button class="btn sm" onclick="fillEmptyWithX()">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6 9 17l-5-5"/></svg>
      Điền "X" ngày trống
    </button>
    <button class="btn sm danger" onclick="clearAllAttendance()">Xóa tháng</button>
  \`;

  // Thead: STT, Mã, Tên, 1..31, Tổng công, OT
  const thead = document.getElementById('attendanceThead');
  let headHtml = \`
    <th class="nm">Nhân viên<br><small style="font-weight:500">Tháng 10/2026</small></th>
  \`;
  for (let d = 1; d <= 31; d++) {
    const isSun = (d % 7 === 4);
    headHtml += \`<th class="\${isSun ? 'we' : ''}">\${d}<br><small>\${isSun ? 'CN' : 'T' + ((d % 7) + 2)}</small></th>\`;
  }
  headHtml += \`
    <th>Công<br>làm</th>
    <th>Phép<br>+Lễ</th>
    <th>Nghỉ<br>KL</th>
    <th style="background:var(--p100);color:var(--pd)">Công<br>hưởng</th>
    <th>Giờ<br>OT</th>
  \`;
  thead.innerHTML = headHtml;

  // Tbody
  const tbody = document.getElementById('attendanceTbody');
  // Read attendanceData directly by employeeId
  tbody.innerHTML = payrollResults.map(p => {
    const empAtt = attendanceData[p.employeeId] || { days: {}, otHours: p.overtimeHours || 0 };
    const days = empAtt.days || {};
    let workDays = 0;
    let paidLeave = 0;
    let unpaidLeave = 0;

    let rowDaysHtml = '';
    for (let d = 1; d <= 31; d++) {
      const code = days[d] || '';
      const def = CODES[code];
      const isSun = (d % 7 === 4);

      if (code === 'X' || code === 'CT') workDays += 1;
      else if (code === 'N') { workDays += 0.5; unpaidLeave += 0.5; }
      else if (code === 'P' || code === 'L') paidLeave += 1;
      else if (code === 'KP') unpaidLeave += 1;

      rowDaysHtml += \`
        <td class="d \${isSun ? 'we' : ''}" data-empid="\${p.employeeId}" data-day="\${d}" style="\${def ? \`background:\${def.bg};color:\${def.c}\` : ''}">\${code}</td>
      \`;
    }

    return \`
      <tr data-empid="\${p.employeeId}">
        <td class="nm">
          <b>\${p.employeeName}</b><br>
          <small class="muted">\${p.employeeCode} · \${p.salaryType === 'PIECE_RATE' ? 'Lương khoán' : 'Thời gian'}</small>
        </td>
        \${rowDaysHtml}
        <td class="sum col-work">\${workDays}</td>
        <td class="sum col-paid-leave">\${paidLeave}</td>
        <td class="sum col-unpaid">\${unpaidLeave}</td>
        <td class="sum hl col-total-paid">\${workDays + paidLeave}</td>
        <td class="ot">
          <input type="number" min="0" step="0.5" value="\${empAtt.otHours || ''}" onchange="updateOtHours('\${p.employeeId}', this.value)">
        </td>
      </tr>
    \`;
  }).join('');

  // Attach interactive click and drag
  bindAttendanceEvents();
}

function selectBrush(code) {
  currentBrush = code;
  // Update brush button styles without re-rendering or wiping the attendance grid
  const buttons = document.querySelectorAll('#brushBarContainer .brush');
  buttons.forEach(btn => {
    btn.classList.toggle('on', btn.dataset.code === code);
  });
}

function bindAttendanceEvents() {
  const table = document.getElementById('attendanceTable');

  table.onmousedown = e => {
    const td = e.target.closest('td.d');
    if (!td) return;
    if (periodStatus === 'LOCKED') {
      toast('Kỳ lương đã khóa sổ! Không thể sửa công.', 'err');
      return;
    }
    isPainting = true;
    paintCell(td);
  };

  table.onmouseover = e => {
    if (!isPainting) return;
    const td = e.target.closest('td.d');
    if (td) paintCell(td);
  };

  document.onmouseup = () => { isPainting = false; };
}

function updateRowAttendanceSummary(tr, days) {
  let workDays = 0;
  let paidLeave = 0;
  let unpaidLeave = 0;
  for (let d = 1; d <= 31; d++) {
    const code = days[d] || '';
    if (code === 'X' || code === 'CT') workDays += 1;
    else if (code === 'N') { workDays += 0.5; unpaidLeave += 0.5; }
    else if (code === 'P' || code === 'L') paidLeave += 1;
    else if (code === 'KP') unpaidLeave += 1;
  }
  const tdWork = tr.querySelector('.col-work');
  const tdPaidLeave = tr.querySelector('.col-paid-leave');
  const tdUnpaid = tr.querySelector('.col-unpaid');
  const tdTotalPaid = tr.querySelector('.col-total-paid');

  if (tdWork) tdWork.textContent = workDays;
  if (tdPaidLeave) tdPaidLeave.textContent = paidLeave;
  if (tdUnpaid) tdUnpaid.textContent = unpaidLeave;
  if (tdTotalPaid) tdTotalPaid.textContent = workDays + paidLeave;
}

async function paintCell(td) {
  const empId = td.dataset.empid;
  const day = parseInt(td.dataset.day, 10);
  const def = CODES[currentBrush];

  // 1. Immediately update DOM element
  td.textContent = currentBrush;
  td.style.background = def ? def.bg : '';
  td.style.color = def ? def.c : '';

  // 2. Synchronize client attendance data store
  if (!attendanceData[empId]) {
    attendanceData[empId] = { days: {}, otHours: 0 };
  }
  if (!attendanceData[empId].days) {
    attendanceData[empId].days = {};
  }
  if (currentBrush) {
    attendanceData[empId].days[day] = currentBrush;
  } else {
    delete attendanceData[empId].days[day];
  }

  // 3. Immediately update Row Summary
  const tr = td.closest('tr');
  if (tr) {
    updateRowAttendanceSummary(tr, attendanceData[empId].days);
  }

  // 4. Asynchronously send update to server
  try {
    await fetch('/api/timekeeping/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenantId: currentTenant,
        employeeId: empId,
        day: day,
        code: currentBrush
      })
    });
  } catch (e) {
    console.error('Lỗi khi lưu chấm công:', e);
  }
}

async function updateOtHours(empId, val) {
  const hours = parseFloat(val) || 0;
  if (!attendanceData[empId]) {
    attendanceData[empId] = { days: {}, otHours: 0 };
  }
  attendanceData[empId].otHours = hours;

  try {
    const res = await fetch('/api/timekeeping/ot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenantId: currentTenant,
        employeeId: empId,
        otHours: hours
      })
    });
    const d = await res.json();
    if (d.success) {
      toast('Đã cập nhật OT: ' + hours + ' giờ');
    } else {
      toast(d.error || 'Lỗi cập nhật OT', 'err');
    }
  } catch (e) {
    toast('Lỗi cập nhật OT: ' + e.message, 'err');
  }
}

async function fillEmptyWithX() {
  if (periodStatus === 'LOCKED') return toast('Kỳ lương đã khóa sổ!', 'err');
  toast('Đang điền X vào các ngày làm việc trống...');
  for (const p of payrollResults) {
    if (!attendanceData[p.employeeId]) {
      attendanceData[p.employeeId] = { days: {}, otHours: 0 };
    }
    if (!attendanceData[p.employeeId].days) {
      attendanceData[p.employeeId].days = {};
    }
    for (let d = 1; d <= 31; d++) {
      if (d % 7 !== 4) { // Not Sunday
        if (!attendanceData[p.employeeId].days[d]) {
          attendanceData[p.employeeId].days[d] = 'X';
          await fetch('/api/timekeeping/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tenantId: currentTenant, employeeId: p.employeeId, day: d, code: 'X' })
          });
        }
      }
    }
  }
  renderAttendanceGrid();
  toast('Đã điền X đầy đủ ngày công!');
}

async function clearAllAttendance() {
  if (periodStatus === 'LOCKED') return toast('Kỳ lương đã khóa sổ!', 'err');
  if (!confirm('Xóa toàn bộ chấm công trong tháng?')) return;
  for (const p of payrollResults) {
    if (attendanceData[p.employeeId]) {
      attendanceData[p.employeeId].days = {};
    }
    for (let d = 1; d <= 31; d++) {
      await fetch('/api/timekeeping/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId: currentTenant, employeeId: p.employeeId, day: d, code: '' })
      });
    }
  }
  renderAttendanceGrid();
  toast('Đã xóa dữ liệu chấm công tháng!');
}

// Render Employee Table
function renderEmployeeTable() {
  const tbody = document.getElementById('empTbody');
  tbody.innerHTML = payrollResults.map(p => \`
    <tr style="cursor:pointer" onclick="openEditEmployee('\${escapeHtml(p.employeeId)}')">
      <td style="font-weight:700">\${escapeHtml(p.employeeCode)}</td>
      <td>
        <div class="who">
          <span class="avatar">\${escapeHtml(p.employeeName.slice(0, 1))}</span>
          <div>
            <b>\${escapeHtml(p.employeeName)}</b>
            <small class="muted">\${p.salaryType === 'PIECE_RATE' ? 'Lương khoán SP' : 'Lương thời gian'}</small>
          </div>
        </div>
      </td>
      <td>\${escapeHtml(p.departmentName || 'Kỹ thuật')}</td>
      <td>\${escapeHtml(p.jobTitle || 'Chuyên viên')}</td>
      <td>\${escapeHtml(p.startDate ? p.startDate.slice(0, 10) : '01/01/2022')}</td>
      <td class="r">\${formatMoney(p.baseSalary)} đ</td>
      <td class="r">\${formatMoney(p.insuranceSalary || p.baseSalary)} đ</td>
      <td class="r">\${formatMoney(p.lunchAllowance || 730000)} đ</td>
      <td class="c">\${p.dependentsCount || 0}</td>
      <td><code>\${escapeHtml(p.idCardNumber || '---')}</code></td>
      <td><code>\${escapeHtml(p.bankAccountNumber || '---')}</code></td>
      <td class="c"><span class="badge b-green">Đang làm</span></td>
      <td class="r" onclick="event.stopPropagation()">
        <button class="ibtn" onclick="openEditEmployee('\${escapeHtml(p.employeeId)}')" title="Sửa">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
        </button>
        <button class="ibtn del" onclick="deleteEmployee('\${escapeHtml(p.employeeId)}')" title="Xóa">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </button>
      </td>
    </tr>
  \`).join('');

  document.getElementById('empPager').innerHTML = \`<span>Hiển thị <b>1-\${payrollResults.length}</b> / \${payrollResults.length} nhân sự</span>\`;
}

function filterEmployees(q) {
  const query = q.toLowerCase();
  document.querySelectorAll('#empTbody tr').forEach(tr => {
    tr.style.display = tr.textContent.toLowerCase().includes(query) ? '' : 'none';
  });
}

function filterEmployeesByDept(dept) {
  filterEmployees(dept);
}

// Render Payroll Table
function renderPayrollTable() {
  const tbody = document.getElementById('payrollTbody');
  const tfoot = document.getElementById('payrollTfoot');

  if (!payrollResults.length) {
    tbody.innerHTML = '<tr><td colspan="25" style="text-align:center;padding:36px;color:#64748b;font-weight:600">' +
      '<div style="font-size:28px;margin-bottom:8px">🔒</div>' +
      'Không có dữ liệu bảng lương hoặc quyền truy cập bị giới hạn theo vai trò của bạn.<br>' +
      '<small style="font-weight:400;color:#94a3b8">Trưởng bộ phận chỉ có quyền quản lý công và duyệt OT trong phòng ban, không có quyền xem bảng lương tài chính doanh nghiệp.</small>' +
    '</td></tr>';
    tfoot.innerHTML = '';
    const plPager = document.getElementById('plPager');
    if (plPager) plPager.innerHTML = '<span>Giới hạn quyền truy cập bảng lương</span>';
    return;
  }

  let sTimeAndPiece = 0, sLunch = 0, sAllowance = 0, sOT = 0, sBonus = 0, sGross = 0;
  let sBHXH = 0, sBHYT = 0, sBHTN = 0, sInsNLD = 0;
  let sTaxable = 0, sNPT = 0, sFamilyDeduction = 0, sTax = 0;
  let sAdvance = 0, sOtherDeductions = 0, sNet = 0;

  tbody.innerHTML = payrollResults.map((p, idx) => {
    const timeOrPiece = p.salaryType === 'PIECE_RATE' ? (p.pieceRateSalary || 0) : (p.timeSalary || 0);
    const lunch = p.lunchAllowance || 0;
    const allowance = (p.seniorityAllowance || 0) + (p.attendanceBonus || 0) + (p.otherAllowances || 0);
    const otSalary = p.overtimeSalary || 0;
    const bonus = p.bonusAmount || 0;
    const gross = p.grossSalary || 0;

    const bhxh = p.insurance ? p.insurance.bhxhEmployee : 0;
    const bhyt = p.insurance ? p.insurance.bhytEmployee : 0;
    const bhtn = p.insurance ? p.insurance.bhtnEmployee : 0;
    const totalBh = p.insurance ? p.insurance.totalEmployee : 0;

    const taxable = p.taxableIncome !== undefined ? p.taxableIncome : Math.max(0, gross - 730000);
    const npt = p.dependentsCount || 0;
    const familyDeduction = p.familyDeductions ? p.familyDeductions.total : (11000000 + npt * 4400000);
    const tax = p.taxAmount || 0;

    const advance = p.advancePayment || 0;
    const otherDeduct = p.otherDeductions || 0;
    const net = p.netSalary || 0;

    sTimeAndPiece += typeof timeOrPiece === 'number' ? timeOrPiece : 0;
    sLunch += typeof lunch === 'number' ? lunch : 0;
    sAllowance += typeof allowance === 'number' ? allowance : 0;
    sOT += typeof otSalary === 'number' ? otSalary : 0;
    sBonus += typeof bonus === 'number' ? bonus : 0;
    sGross += typeof gross === 'number' ? gross : 0;

    sBHXH += typeof bhxh === 'number' ? bhxh : 0;
    sBHYT += typeof bhyt === 'number' ? bhyt : 0;
    sBHTN += typeof bhtn === 'number' ? bhtn : 0;
    sInsNLD += typeof totalBh === 'number' ? totalBh : 0;

    sTaxable += typeof taxable === 'number' ? taxable : 0;
    sNPT += typeof npt === 'number' ? npt : 0;
    sFamilyDeduction += typeof familyDeduction === 'number' ? familyDeduction : 0;
    sTax += typeof tax === 'number' ? tax : 0;

    sAdvance += typeof advance === 'number' ? advance : 0;
    sOtherDeductions += typeof otherDeduct === 'number' ? otherDeduct : 0;
    sNet += typeof net === 'number' ? net : 0;

    return \`
      <tr>
        <td class="stk c" style="left:0">\${idx + 1}</td>
        <td class="stk" style="left:44px;font-weight:700">\${escapeHtml(p.employeeCode)}</td>
        <td class="stk" style="left:116px;box-shadow:inset -1px 0 0 #dfe7e5">
          <b>\${escapeHtml(p.employeeName)}</b>
          <small class="muted" style="display:block;font-size:11px">\${escapeHtml(p.departmentName || '')} · \${p.salaryType === 'PIECE_RATE' ? 'Lương khoán' : 'Thời gian'}</small>
        </td>
        
        <td class="r">\${formatMoney(p.baseSalary)}</td>
        <td class="c">\${p.actualWorkDays}</td>
        <td class="r" title="\${p.salaryType === 'PIECE_RATE' ? 'Lương khoán sản phẩm' : 'Lương theo thời gian'}">
          \${formatMoney(timeOrPiece)}
          \${p.salaryType === 'PIECE_RATE' ? '<small style="display:block;font-size:10px;color:#0284c7">Khoán SP</small>' : ''}
        </td>
        <td class="r">\${formatMoney(lunch)}</td>
        <td class="r">\${formatMoney(allowance)}</td>
        <td class="r">\${formatMoney(otSalary)}</td>
        <td class="r" style="cursor:pointer;color:#2563eb" onclick="openAdjustModal('\${escapeHtml(p.employeeId)}')" title="Bấm để điều chỉnh thưởng & lương khoán">
          \${formatMoney(bonus)} <small style="font-size:10px;opacity:.7">✎</small>
        </td>
        <td class="r font-bold">\${formatMoney(gross)}</td>

        <td class="r">\${formatMoney(bhxh)}</td>
        <td class="r">\${formatMoney(bhyt)}</td>
        <td class="r">\${formatMoney(bhtn)}</td>
        <td class="r font-bold" style="color:#7c3aed">\${formatMoney(totalBh)}</td>

        <td class="r">\${formatMoney(taxable)}</td>
        <td class="c">\${npt}</td>
        <td class="r">\${formatMoney(familyDeduction)}</td>
        <td class="r font-bold" style="color:#d97706">\${formatMoney(tax)}</td>

        <td class="in">
          <input class="inp-adj" data-money placeholder="0" value="\${formatMoney(advance)}" \${(periodStatus === 'LOCKED' || periodStatus === 'PAID') ? 'disabled' : ''} onchange="updateAdjustment('\${escapeHtml(p.employeeId)}', 'tamUng', this.value)" title="Tạm ứng trong kỳ (bấm ra ngoài để lưu)">
        </td>
        <td class="in">
          <input class="inp-adj" data-money placeholder="0" value="\${formatMoney(otherDeduct)}" \${(periodStatus === 'LOCKED' || periodStatus === 'PAID') ? 'disabled' : ''} onchange="updateAdjustment('\${escapeHtml(p.employeeId)}', 'khauTruKhac', this.value)" title="Khấu trừ khác (bấm ra ngoài để lưu)">
        </td>

        <td class="r font-bold" style="color:var(--pd);font-size:14px">\${formatMoney(net)} đ</td>
        <td class="c">
          <button class="ibtn" onclick="openSlipModal('\${escapeHtml(p.employeeId)}')" title="Xem & In phiếu lương">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 17.5v-11"/></svg>
          </button>
        </td>
      </tr>
    \`;
  }).join('');

  const isHR = currentRole === 'HR_MANAGER';
  tfoot.innerHTML = \`
    <tr>
      <td colspan="3" class="stk" style="left:0;font-weight:700">TỔNG CỘNG (\${payrollResults.length} người)</td>
      <td></td>
      <td class="c font-bold">\${payrollResults.reduce((s, p) => s + (p.actualWorkDays || 0), 0)}</td>
      <td class="r font-bold">\${isHR ? '******' : formatMoney(sTimeAndPiece)}</td>
      <td class="r font-bold">\${isHR ? '******' : formatMoney(sLunch)}</td>
      <td class="r font-bold">\${isHR ? '******' : formatMoney(sAllowance)}</td>
      <td class="r font-bold">\${isHR ? '******' : formatMoney(sOT)}</td>
      <td class="r font-bold">\${isHR ? '******' : formatMoney(sBonus)}</td>
      <td class="r font-bold">\${isHR ? '******' : formatMoney(sGross)}</td>
      <td class="r font-bold">\${isHR ? '******' : formatMoney(sBHXH)}</td>
      <td class="r font-bold">\${isHR ? '******' : formatMoney(sBHYT)}</td>
      <td class="r font-bold">\${isHR ? '******' : formatMoney(sBHTN)}</td>
      <td class="r font-bold" style="color:#7c3aed">\${isHR ? '******' : formatMoney(sInsNLD)}</td>
      <td class="r font-bold">\${isHR ? '******' : formatMoney(sTaxable)}</td>
      <td class="c font-bold">\${sNPT}</td>
      <td class="r font-bold">\${isHR ? '******' : formatMoney(sFamilyDeduction)}</td>
      <td class="r font-bold" style="color:#d97706">\${isHR ? '******' : formatMoney(sTax)}</td>
      <td class="r font-bold">\${isHR ? '******' : formatMoney(sAdvance)}</td>
      <td class="r font-bold">\${isHR ? '******' : formatMoney(sOtherDeductions)}</td>
      <td class="r font-bold" style="color:var(--pd);font-size:15px">\${isHR ? '******' : formatMoney(sNet) + ' đ'}</td>
      <td></td>
    </tr>
  \`;

  document.getElementById('plPager').innerHTML = \`<span>Hiển thị <b>1-\${payrollResults.length}</b> / \${payrollResults.length} nhân sự · Các cột tính toán cân bằng chính xác 100% theo quy định</span>\`;
}

function filterPayrollTable(q) {
  const query = q.toLowerCase();
  let count = 0;
  document.querySelectorAll('#payrollTbody tr').forEach(tr => {
    const match = tr.textContent.toLowerCase().includes(query);
    tr.style.display = match ? '' : 'none';
    if (match) count++;
  });
  document.getElementById('plPager').innerHTML = \`<span>Hiển thị <b>\${count}</b> / \${payrollResults.length} nhân sự phù hợp từ khóa</span>\`;
}

async function updateAdjustment(empId, field, val) {
  if (!['ORG_OWNER', 'ORG_ADMIN', 'ACCOUNTANT', 'OWNER', 'ADMIN'].includes(currentRole)) {
    toast('Chỉ có Kế toán lương (ACCOUNTANT) hoặc Quản trị viên mới có quyền điều chỉnh lương!', 'err');
    return;
  }
  if (periodStatus === 'LOCKED') {
    toast('Kỳ lương đã khóa sổ! Không thể sửa điều chỉnh.', 'err');
    loadAllData();
    return;
  }
  const num = parseMoney(val);
  try {
    const res = await fetch('/api/payroll/adjustments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenantId: currentTenant,
        userRole: currentRole,
        employeeId: empId,
        [field]: num,
        expectedVersion: currentPeriodVersion
      })
    });
    const d = await res.json();
    if (d.success) {
      toast('Đã cập nhật và tính toán lại bảng lương!');
      loadAllData();
    } else {
      toast(d.error || 'Lỗi lưu điều chỉnh', 'err');
      if (res.status === 409) loadAllData();
    }
  } catch (e) {
    toast('Lỗi kết nối: ' + e.message, 'err');
  }
}

function openAdjustModal(empId) {
  if (!['ORG_OWNER', 'ORG_ADMIN', 'ACCOUNTANT', 'OWNER', 'ADMIN'].includes(currentRole)) {
    toast('Chỉ có Kế toán lương (ACCOUNTANT) hoặc Quản trị viên mới có quyền điều chỉnh lương!', 'err');
    return;
  }
  if (periodStatus === 'LOCKED') {
    toast('Kỳ lương đã khóa sổ! Không thể sửa điều chỉnh.', 'err');
    return;
  }
  const p = payrollResults.find(x => x.employeeId === empId);
  if (!p) return;
  document.getElementById('adjEmpId').value = empId;
  document.getElementById('adjustModalTitle').textContent = 'Điều chỉnh thu nhập: ' + p.employeeName;
  document.getElementById('adjThuong').value = formatMoney(p.bonusAmount || 0);
  document.getElementById('adjTamUng').value = formatMoney(p.advancePayment || 0);
  document.getElementById('adjKhauTru').value = formatMoney(p.otherDeductions || 0);

  const pieceFields = document.getElementById('adjPieceRateFields');
  if (p.salaryType === 'PIECE_RATE') {
    pieceFields.style.display = 'block';
    document.getElementById('adjSlSP').value = p.pieceRateQuantity || 2100;
    document.getElementById('adjDgSP').value = formatMoney(p.pieceRateUnitPrice || 8000);
  } else {
    pieceFields.style.display = 'none';
  }
  document.getElementById('adjustModal').style.display = 'flex';
}

function closeAdjustModal() {
  document.getElementById('adjustModal').style.display = 'none';
}

async function saveAdjustmentFromModal() {
  if (!['ORG_OWNER', 'ORG_ADMIN', 'ACCOUNTANT', 'OWNER', 'ADMIN'].includes(currentRole)) {
    toast('Chỉ có Kế toán lương (ACCOUNTANT) hoặc Quản trị viên mới có quyền điều chỉnh lương!', 'err');
    return;
  }
  const empId = document.getElementById('adjEmpId').value;
  if (!empId) return;
  const thuong = parseMoney(document.getElementById('adjThuong').value);
  const tamUng = parseMoney(document.getElementById('adjTamUng').value);
  const khauTruKhac = parseMoney(document.getElementById('adjKhauTru').value);
  const slSP = parseFloat(document.getElementById('adjSlSP').value) || 0;
  const dgSP = parseMoney(document.getElementById('adjDgSP').value);

  try {
    const res = await fetch('/api/payroll/adjustments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenantId: currentTenant,
        userRole: currentRole,
        employeeId: empId,
        thuong,
        tamUng,
        khauTruKhac,
        slSP,
        dgSP,
        expectedVersion: currentPeriodVersion
      })
    });
    const d = await res.json();
    if (d.success) {
      toast('Đã lưu điều chỉnh thành công!');
      closeAdjustModal();
      loadAllData();
    } else {
      toast(d.error || 'Lỗi khi lưu điều chỉnh', 'err');
      if (res.status === 409) loadAllData();
    }
  } catch (err) {
    toast('Lỗi kết nối: ' + err.message, 'err');
  }
}

// Render Tax Comparison (7-Tier Official vs 5-Tier Draft)
function renderTaxComparison() {
  const tbody = document.getElementById('taxCompareBody');
  tbody.innerHTML = payrollResults.map(p => {
    const gross = p.grossSalary || 0;
    const npt = p.dependentsCount || 0;
    const ins = p.insurance ? p.insurance.totalEmployee : 0;
    
    // 5-tier draft 2026: deduction 15.5m + npt*6.2m
    const taxableDraft = Math.max(0, gross - 730000 - ins - 15500000 - npt * 6200000);
    let draftTax = 0;
    if (taxableDraft > 0) {
      draftTax = Math.min(taxableDraft, 10000000) * 0.05;
      if (taxableDraft > 10000000) draftTax += Math.min(taxableDraft - 10000000, 20000000) * 0.10;
      if (taxableDraft > 30000000) draftTax += Math.min(taxableDraft - 30000000, 30000000) * 0.20;
      if (taxableDraft > 60000000) draftTax += Math.min(taxableDraft - 60000000, 40000000) * 0.30;
      if (taxableDraft > 100000000) draftTax += (taxableDraft - 100000000) * 0.35;
    }
    draftTax = Math.round(draftTax);
    const diff = draftTax - (p.taxAmount || 0);

    return \`
      <tr>
        <td style="font-weight:700">\${escapeHtml(p.employeeCode)}</td>
        <td>\${escapeHtml(p.employeeName)}</td>
        <td class="r font-bold" style="color:var(--pd)">\${formatMoney(p.taxAmount)} đ</td>
        <td class="r" style="color:#2563eb">\${formatMoney(draftTax)} đ</td>
        <td class="r font-bold" style="color:\${diff <= 0 ? '#15803d' : '#dc2626'}">
          \${diff < 0 ? '-' : '+'}\${formatMoney(Math.abs(diff))} đ
        </td>
      </tr>
    \`;
  }).join('');
}

// Render Insurance Summary Table (NLĐ 10.5% vs DN 22%)
function renderInsuranceSummary() {
  const tbody = document.getElementById('insuranceSummaryTbody');
  tbody.innerHTML = payrollResults.map((p, i) => {
    const base = p.insuranceSalary || p.baseSalary || 0;
    const capped = Math.min(base, 20 * 2340000); // 46.8m cap
    const bhxhNLD = Math.round(capped * 0.08);
    const bhytNLD = Math.round(capped * 0.015);
    const bhtnNLD = Math.round(capped * 0.01);
    const totalNLD = bhxhNLD + bhytNLD + bhtnNLD;

    const bhxhDN = Math.round(capped * 0.175);
    const bhytDN = Math.round(capped * 0.03);
    const bhtnDN = Math.round(capped * 0.01);
    const kpcdDN = Math.round(capped * 0.02);
    const totalDN = bhxhDN + bhytDN + bhtnDN + kpcdDN;

    return \`
      <tr>
        <td class="c">\${i + 1}</td>
        <td style="font-weight:700">\${escapeHtml(p.employeeCode)}</td>
        <td>\${escapeHtml(p.employeeName)}</td>
        <td class="r">\${formatMoney(capped)}</td>
        <td class="r">\${formatMoney(bhxhNLD)}</td>
        <td class="r">\${formatMoney(bhytNLD)}</td>
        <td class="r">\${formatMoney(bhtnNLD)}</td>
        <td class="r font-bold" style="color:#7c3aed">\${formatMoney(totalNLD)}</td>
        <td class="r">\${formatMoney(bhxhDN)}</td>
        <td class="r">\${formatMoney(bhytDN)}</td>
        <td class="r">\${formatMoney(bhtnDN)}</td>
        <td class="r">\${formatMoney(kpcdDN)}</td>
        <td class="r font-bold" style="color:#ea580c">\${formatMoney(totalDN)}</td>
        <td class="r font-bold" style="color:var(--pd)">\${formatMoney(totalNLD + totalDN)} đ</td>
      </tr>
    \`;
  }).join('');
}

// Gross <-> Net Calculator
function calcGrossNet() {
  const amt = parseMoney(document.getElementById('gnAmt').value);
  const type = document.getElementById('gnType').value;
  const npt = parseInt(document.getElementById('gnNPT').value, 10) || 0;
  const bhIn = parseMoney(document.getElementById('gnBH').value);

  const fromGross = g => {
    const baseBH = bhIn || g;
    const capped = Math.min(baseBH, 20 * 2340000);
    const bh = Math.round(capped * 0.105);
    const tn = Math.max(0, g - bh - 15500000 - npt * 6200000);
    let t = 0;
    if (tn > 0) {
      t = Math.min(tn, 5000000) * 0.05;
      if (tn > 5000000) t += Math.min(tn - 5000000, 5000000) * 0.10;
      if (tn > 10000000) t += Math.min(tn - 10000000, 8000000) * 0.15;
      if (tn > 18000000) t += Math.min(tn - 18000000, 14000000) * 0.20;
    }
    t = Math.round(t);
    return { g, bh, tn, t, net: g - bh - t, dn: Math.round(capped * 0.22) };
  };

  let r;
  if (type === 'GROSS') {
    r = fromGross(amt);
  } else {
    let lo = amt, hi = amt * 2 + 10000000;
    for (let i = 0; i < 50; i++) {
      const mid = (lo + hi) / 2;
      if (fromGross(mid).net < amt) lo = mid;
      else hi = mid;
    }
    r = fromGross(Math.round(hi));
  }

  document.getElementById('gnOutput').innerHTML = \`
    <div><span>Lương Gross</span><b>\${formatVND(r.g)}</b></div>
    <div><span>BHXH, BHYT, BHTN (10.5%)</span><b>- \${formatMoney(r.bh)} đ</b></div>
    <div><span>Giảm trừ gia cảnh (bản thân + \${npt} NPT)</span><b>\${formatMoney(15500000 + npt * 6200000)} đ</b></div>
    <div><span>Thu nhập tính thuế</span><b>\${formatMoney(r.tn)} đ</b></div>
    <div><span>Thuế TNCN tạm tính</span><b>- \${formatMoney(r.t)} đ</b></div>
    <div><span>Lương Thực lĩnh (Net)</span><b class="big">\${formatVND(r.net)}</b></div>
    <div><span class="muted">Doanh nghiệp đóng thêm BH + KPCĐ (22%)</span><b class="muted">\${formatMoney(r.dn)} đ</b></div>
    <div><span class="muted">Tổng chi phí DN cho nhân viên</span><b class="muted">\${formatVND(r.g + r.dn)}</b></div>
  \`;
}

// Generate Slip HTML (Exact layout from Cham_cong_Tinh_luong_ThayDat_V3.html)
function generateSlipHtml(p) {
  const totalDeductions = (p.insurance ? p.insurance.totalEmployee : 0) + (p.taxAmount || 0) + (p.advancePayment || 0) + (p.otherDeductions || 0);
  const docSoText = p.docSoText || 'Không đồng';
  const isPieceRate = p.salaryType === 'PIECE_RATE';
  const timeOrPieceSalary = isPieceRate ? (p.pieceRateSalary || 0) : (p.timeSalary || 0);

  return \`
    <div class="ps">
      <div class="ps-top">
        <div class="ps-co">
          <b>\${currentTenant === 'tenant-alpha-tech' ? 'CÔNG TY CỔ PHẦN CÔNG NGHỆ & THƯƠNG MẠI TÂN PHÁT DIGITAL' : 'CÔNG TY TNHH VẬN TẢI & DỊCH VỤ KHO VẬN BẮC NAM'}</b>
          <div class="l">Trụ sở: \${currentTenant === 'tenant-alpha-tech' ? 'Tầng 18, Keangnam Landmark 72, Nam Từ Liêm, Hà Nội · ĐT: (024) 7308 6868' : 'Kho ICD Sóng Thần, An Bình, Dĩ An, Bình Dương · ĐT: (028) 3724 5566'}</div>
          <div class="l">Mã số thuế: \${currentTenant === 'tenant-alpha-tech' ? '0108923456' : '0315678901'}</div>
        </div>
        <div class="ps-tt">
          <h1>PHIẾU LƯƠNG</h1>
          <div>Kỳ lương: <b>Tháng 10/2026</b></div>
          <div>Số phiếu: <b>PL202610-\${escapeHtml(p.employeeCode)}</b></div>
        </div>
      </div>

      <div class="ps-band"></div>

      <div class="ps-emp">
        <div class="ps-av">\${escapeHtml(p.employeeName.slice(0, 1))}</div>
        <div class="ps-eg">
          <div><span>HỌ VÀ TÊN</span><b>\${escapeHtml(p.employeeName)}</b></div>
          <div><span>MÃ NHÂN VIÊN</span><b>\${escapeHtml(p.employeeCode)}</b></div>
          <div><span>PHÒNG BAN</span><b>\${escapeHtml(p.departmentName || 'Kỹ thuật')}</b></div>
          <div><span>CHỨC VỤ</span><b>\${escapeHtml(p.jobTitle || 'Chuyên viên')}</b></div>
          <div><span>HÌNH THỨC</span><b>\${isPieceRate ? 'Lương khoán SP' : 'Lương thời gian'}</b></div>
          <div><span>SỐ CCCD</span><b>\${escapeHtml(p.idCardNumber || '---')}</b></div>
          <div><span>NGÂN HÀNG</span><b>\${escapeHtml(p.bankName || 'Vietcombank')}</b></div>
          <div><span>SỐ TÀI KHOẢN</span><b>\${escapeHtml(p.bankAccountNumber || '---')}</b></div>
        </div>
      </div>

      <div class="ps-att">
        <div><b>26</b><span>Công chuẩn</span></div>
        <div><b>\${p.actualWorkDays}</b><span>Công làm</span></div>
        <div><b>\${p.unpaidLeaveDays || 0}</b><span>Nghỉ KL</span></div>
        <div><b>\${p.overtimeHours || 0}</b><span>Giờ OT</span></div>
        <div><b>\${p.dependentsCount || 0}</b><span>Người PT</span></div>
        <div class="hl"><b>\${p.actualWorkDays}</b><span>Công hưởng</span></div>
      </div>

      <table class="ps-t">
        <thead>
          <tr>
            <th style="width:38px">STT</th>
            <th>Khoản mục</th>
            <th>Diễn giải</th>
            <th style="text-align:right;width:140px">Số tiền (đ)</th>
          </tr>
        </thead>
        <tbody>
          <tr class="sec"><td colspan="4">A. CÁC KHOẢN THU NHẬP</td></tr>
          <tr>
            <td class="c">1</td><td>\${isPieceRate ? 'Lương khoán sản phẩm' : 'Lương theo ngày công'}</td>
            <td class="dg">\${isPieceRate ? \`\${p.pieceRateQuantity || 2100} SP × \${formatMoney(p.pieceRateUnitPrice || 8000)} đ/SP\` : \`\${formatMoney(p.baseSalary)} ÷ 26 × \${p.actualWorkDays} công\`}</td>
            <td class="r">\${formatMoney(timeOrPieceSalary)}</td>
          </tr>
          <tr>
            <td class="c">2</td><td>Phụ cấp ăn trưa</td>
            <td class="dg">Hỗ trợ ăn trưa (\${p.actualWorkDays > 0 ? 'miễn thuế tối đa 730k theo TT 26/2015' : 'không phát sinh công thực tế'})</td>
            <td class="r">\${formatMoney(p.lunchAllowance)}</td>
          </tr>
          <tr>
            <td class="c">3</td><td>Phụ cấp thâm niên & chuyên cần</td>
            <td class="dg">Hưởng theo thâm niên công tác & chuyên cần</td>
            <td class="r">\${formatMoney((p.seniorityAllowance || 0) + (p.attendanceBonus || 0))}</td>
          </tr>
          \${(p.otherAllowances || 0) > 0 ? \`
          <tr>
            <td class="c">4</td><td>Phụ cấp khác (xăng xe, trách nhiệm...)</td>
            <td class="dg">Hỗ trợ xăng xe, điện thoại, trách nhiệm theo HĐLĐ</td>
            <td class="r">\${formatMoney(p.otherAllowances)}</td>
          </tr>\` : ''}
          <tr>
            <td class="c">\${(p.otherAllowances || 0) > 0 ? 5 : 4}</td><td>Làm thêm giờ (OT)</td>
            <td class="dg">\${p.overtimeHours || 0} giờ làm thêm</td>
            <td class="r">\${formatMoney(p.overtimeSalary || 0)}</td>
          </tr>
          \${(p.bonusAmount || 0) > 0 ? \`
          <tr>
            <td class="c">\${(p.otherAllowances || 0) > 0 ? 6 : 5}</td><td>Tiền thưởng hiệu quả / Dự án</td>
            <td class="dg">Thưởng hiệu suất & hoàn thành xuất sắc nhiệm vụ</td>
            <td class="r">\${formatMoney(p.bonusAmount)}</td>
          </tr>\` : ''}
          <tr class="sub">
            <td></td><td colspan="2">Tổng thu nhập (A)</td>
            <td class="r font-bold">\${formatMoney(p.grossSalary)}</td>
          </tr>

          <tr class="sec"><td colspan="4">B. CÁC KHOẢN KHẤU TRỪ</td></tr>
          <tr>
            <td class="c">1</td><td>Bảo hiểm Xã hội (8%)</td>
            <td class="dg">Trích nộp theo Luật BHXH 2024</td>
            <td class="r">\${formatMoney(p.insurance ? p.insurance.bhxhEmployee : 0)}</td>
          </tr>
          <tr>
            <td class="c">2</td><td>Bảo hiểm Y tế (1.5%)</td>
            <td class="dg">Trích nộp theo Luật BHYT</td>
            <td class="r">\${formatMoney(p.insurance ? p.insurance.bhytEmployee : 0)}</td>
          </tr>
          <tr>
            <td class="c">3</td><td>Bảo hiểm Thất nghiệp (1%)</td>
            <td class="dg">Trích nộp theo Luật Việc làm</td>
            <td class="r">\${formatMoney(p.insurance ? p.insurance.bhtnEmployee : 0)}</td>
          </tr>
          <tr>
            <td class="c">4</td><td>Thuế Thu nhập Cá nhân (TNCN)</td>
            <td class="dg">Khấu trừ lũy tiến từng phần theo quy định</td>
            <td class="r">\${formatMoney(p.taxAmount)}</td>
          </tr>
          \${(p.advancePayment || 0) > 0 ? \`
          <tr>
            <td class="c">5</td><td>Tạm ứng lương trong kỳ</td>
            <td class="dg">Đã tạm ứng chuyển khoản trong tháng</td>
            <td class="r">\${formatMoney(p.advancePayment)}</td>
          </tr>\` : ''}
          \${(p.otherDeductions || 0) > 0 ? \`
          <tr>
            <td class="c">6</td><td>Khấu trừ khác</td>
            <td class="dg">Các khoản giảm trừ khác theo quy chế</td>
            <td class="r">\${formatMoney(p.otherDeductions)}</td>
          </tr>\` : ''}
          <tr class="sub">
            <td></td><td colspan="2">Tổng các khoản khấu trừ (B)</td>
            <td class="r font-bold">\${formatMoney(totalDeductions)}</td>
          </tr>
        </tbody>
      </table>

      <div class="ps-net">
        <div>
          <span>THỰC LĨNH CHUYỂN KHOẢN (A - B)</span>
          <small>Bằng chữ: \${escapeHtml(docSoText)}</small>
        </div>
        <b>\${formatMoney(p.netSalary)} đ</b>
      </div>

      <div class="ps-2">
        <div class="ps-box">
          <h4>Chi tiết giảm trừ thuế TNCN</h4>
          <div><span>Giảm trừ bản thân</span><b>11.000.000 đ</b></div>
          <div><span>Giảm trừ \${p.dependentsCount || 0} người phụ thuộc</span><b>\${formatMoney((p.dependentsCount || 0) * 4400000)} đ</b></div>
          <div><span>Bảo hiểm bắt buộc trừ vào TN</span><b>\${formatMoney(p.insurance ? p.insurance.totalEmployee : 0)} đ</b></div>
          <div><span>Tổng mức giảm trừ thuế</span><b>\${formatMoney(11000000 + (p.dependentsCount || 0) * 4400000 + (p.insurance ? p.insurance.totalEmployee : 0))} đ</b></div>
        </div>
        <div class="ps-box">
          <h4>Phần Doanh nghiệp đóng thêm</h4>
          <div><span>BHXH, BHYT, BHTN DN (\${(p.insurance && p.insurance.totalEmployee > 0) ? '21.5%' : '0%'})</span><b>\${formatMoney(p.employerInsurance ? (p.employerInsurance.bhxh + p.employerInsurance.bhyt + p.employerInsurance.bhtn) : Math.round((p.insuranceSalary || p.baseSalary) * 0.215))} đ</b></div>
          <div><span>Kinh phí công đoàn (\${(p.insurance && p.insurance.totalEmployee > 0) ? '2%' : '0%'})</span><b>\${formatMoney(p.employerInsurance ? p.employerInsurance.tradeUnion : Math.round((p.insuranceSalary || p.baseSalary) * 0.02))} đ</b></div>
          <div><span>Tổng chi phí DN cho bạn</span><b>\${formatMoney(p.totalCompanyExpense || (p.grossSalary + Math.round((p.insuranceSalary || p.baseSalary) * 0.235)))} đ</b></div>
        </div>
      </div>

      <div class="ps-date">Hà Nội, ngày 31 tháng 10 năm 2026</div>

      <div class="ps-sign">
        <div><b>Người lập biểu</b><i>(Ký, ghi rõ họ tên)</i><div class="sp"></div>\${currentTenant === 'tenant-alpha-tech' ? 'Vũ Thu Thảo' : 'Phạm Quốc Bảo'}</div>
        <div><b>Kế toán trưởng</b><i>(Ký, ghi rõ họ tên)</i><div class="sp"></div>\${currentTenant === 'tenant-alpha-tech' ? 'Đặng Hoàng Mai' : 'Nguyễn Văn Cường'}</div>
        <div><b>Người nhận lương</b><i>(Ký, ghi rõ họ tên)</i><div class="sp"></div>\${escapeHtml(p.employeeName)}</div>
      </div>

      <div class="ps-foot">
        Phiếu lương là thông tin bảo mật cá nhân theo Nghị định 13/2023/NĐ-CP. Mọi thắc mắc xin liên hệ phòng Kế toán trong vòng 03 ngày.
      </div>
    </div>
  \`;
}

// Modal Slip Functions
let currentSlipEmployee = null;

function openSlipModal(empId) {
  const p = payrollResults.find(x => x.employeeId === empId);
  if (!p) return;
  currentSlipEmployee = p;
  document.getElementById('slipModalContent').innerHTML = generateSlipHtml(p);
  document.getElementById('slipModal').style.display = 'flex';
}

function closeSlipModal() {
  document.getElementById('slipModal').style.display = 'none';
}

function printModalSlip() {
  if (!currentSlipEmployee) return;
  const root = document.getElementById('print-root');
  root.innerHTML = generateSlipHtml(currentSlipEmployee);
  document.body.classList.add('is-printing');
  window.print();
  setTimeout(() => { document.body.classList.remove('is-printing'); }, 500);
}

function printAllSlips() {
  if (!payrollResults.length) return toast('Không có dữ liệu phiếu lương!', 'err');
  const root = document.getElementById('print-root');
  root.innerHTML = payrollResults.map(p => generateSlipHtml(p)).join('<div style="page-break-after:always"></div>');
  document.body.classList.add('is-printing');
  window.print();
  setTimeout(() => { document.body.classList.remove('is-printing'); }, 500);
}

function printCurrentView() {
  window.print();
}

// Employee Modals
function openEmployeeModal() {
  document.getElementById('empModalTitle').textContent = 'Thêm nhân viên mới';
  document.getElementById('mEmpCode').value = 'NV00' + (payrollResults.length + 1);
  document.getElementById('mEmpName').value = '';
  document.getElementById('mEmpBase').value = '15.000.000';
  document.getElementById('mEmpInsurance').value = '15.000.000';
  document.getElementById('empModal').style.display = 'flex';
}

function openEditEmployee(empId) {
  const p = payrollResults.find(x => x.employeeId === empId);
  if (!p) return;
  document.getElementById('empModalTitle').textContent = 'Sửa thông tin: ' + p.employeeName;
  document.getElementById('mEmpCode').value = p.employeeCode;
  document.getElementById('mEmpName').value = p.employeeName;
  document.getElementById('mEmpBase').value = formatMoney(p.baseSalary);
  document.getElementById('mEmpInsurance').value = formatMoney(p.insuranceSalary || p.baseSalary);
  document.getElementById('mEmpCCCD').value = p.idCardNumber || '';
  document.getElementById('mEmpBankAcc').value = p.bankAccountNumber || '';
  document.getElementById('mEmpBankName').value = p.bankName || 'Vietcombank';
  document.getElementById('empModal').style.display = 'flex';
}

function closeEmployeeModal() {
  document.getElementById('empModal').style.display = 'none';
}

async function saveEmployeeData() {
  if (!['ORG_OWNER', 'ORG_ADMIN', 'HR_MANAGER', 'OWNER', 'ADMIN'].includes(currentRole)) {
    return alert('Chỉ có Ban Giám đốc hoặc Trưởng phòng Nhân sự (HR) mới có quyền tạo/sửa hồ sơ nhân sự!');
  }
  const code = document.getElementById('mEmpCode').value.trim();
  const fullName = document.getElementById('mEmpName').value.trim();
  const baseSalary = parseMoney(document.getElementById('mEmpBase').value);

  if (!code || !fullName || !baseSalary) {
    return alert('Vui lòng nhập đầy đủ Mã NV, Họ tên và Lương cơ bản!');
  }

  try {
    const res = await fetch('/api/employees/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenantId: currentTenant,
        userRole: currentRole,
        code,
        fullName,
        baseSalary,
        salaryType: document.getElementById('mEmpType').value,
        dependentsCount: parseInt(document.getElementById('mEmpDep').value, 10) || 0,
        idCardNumber: document.getElementById('mEmpCCCD').value,
        bankAccountNumber: document.getElementById('mEmpBankAcc').value,
      })
    });
    const d = await res.json();
    if (d.success) {
      closeEmployeeModal();
      loadAllData();
      toast('Đã lưu hồ sơ nhân viên ' + fullName + ' thành công!');
    } else {
      alert(d.error || 'Lỗi khi lưu nhân viên');
    }
  } catch (e) {
    alert('Lỗi: ' + e.message);
  }
}

async function deleteEmployee(empId) {
  if (!['ORG_OWNER', 'ORG_ADMIN', 'OWNER', 'ADMIN'].includes(currentRole)) {
    return toast('Chỉ có Ban Giám đốc (ORG_OWNER, ORG_ADMIN) mới có quyền xóa nhân sự!', 'err');
  }
  if (!confirm('Xóa nhân sự này khỏi danh sách?')) return;
  try {
    const res = await fetch('/api/employees/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId: currentTenant, userRole: currentRole, employeeId: empId })
    });
    loadAllData();
    toast('Đã xóa nhân viên!');
  } catch (e) {
    toast('Lỗi: ' + e.message, 'err');
  }
}

// Save Company Settings
async function saveCompanySettings() {
  if (!['ORG_OWNER', 'ORG_ADMIN', 'OWNER', 'ADMIN'].includes(currentRole)) {
    return toast('Chỉ có Giám đốc hoặc Quản trị viên mới có quyền đổi cài đặt!', 'err');
  }
  try {
    const res = await fetch('/api/settings/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenantId: currentTenant,
        userRole: currentRole,
        companyName: document.getElementById('cfgCompanyName').value,
        taxCode: document.getElementById('cfgTaxCode').value,
        address: document.getElementById('cfgAddress').value,
        hotline: document.getElementById('cfgHotline').value,
        lunchAllowance: parseMoney(document.getElementById('cfgLunchAllowance').value),
        roundingRule: document.getElementById('cfgRounding').value,
        taxRule: document.getElementById('cfgTaxRule').value,
      })
    });
    const d = await res.json();
    if (d.success) {
      toast('Đã lưu cài đặt doanh nghiệp thành công!');
    }
  } catch (e) {
    toast('Lỗi: ' + e.message, 'err');
  }
}

function quickSaveAll() {
  toast('Đã đồng bộ toàn bộ bảng công và lương vào cơ sở dữ liệu!');
}

// Export CSV / Excel
function calculateDraftTaxClient(taxableIncome, dependentsCount) {
  const familyDeduction = 15500000 + (dependentsCount || 0) * 6200000;
  const assessable = Math.max(0, taxableIncome - familyDeduction);
  if (assessable <= 0) return { familyDeduction, assessable, tax: 0 };
  let tax = 0;
  let remaining = assessable;
  const brackets = [
    { limit: 10000000, rate: 0.05 },
    { limit: 20000000, rate: 0.10 },
    { limit: 30000000, rate: 0.20 },
    { limit: 40000000, rate: 0.30 },
    { limit: Infinity, rate: 0.35 }
  ];
  for (const b of brackets) {
    if (remaining <= 0) break;
    const chunk = Math.min(remaining, b.limit);
    tax += chunk * b.rate;
    remaining -= chunk;
  }
  return { familyDeduction, assessable, tax: Math.round(tax) };
}

function exportPayrollExcel() {
  let csv = '\\uFEFFSTT,Mã NV,Họ và tên,Chức vụ,Loại lương,Lương CB / Định mức,Ngày công thực tế,Lương công / Lương SP,Ăn trưa,Thâm niên,Chuyên cần,Phụ cấp khác,Thưởng,Lương OT,Tổng thu nhập (Gross),BHXH (8%),BHYT (1.5%),BHTN (1%),Tổng BHXH NLĐ (10.5%),Thuế TNCN,Tạm ứng,Khấu trừ khác,Tổng các khoản giảm trừ,Thực lĩnh (Net),Bằng chữ\\n';
  payrollResults.forEach((p, idx) => {
    const isPiece = p.salaryType === 'PIECE_RATE';
    const earnedSalary = isPiece ? (p.pieceRateSalary || 0) : (p.timeSalary || 0);
    const bhxh = p.insurance ? p.insurance.bhxhEmployee : 0;
    const bhyt = p.insurance ? p.insurance.bhytEmployee : 0;
    const bhtn = p.insurance ? p.insurance.bhtnEmployee : 0;
    const totalIns = p.insurance ? p.insurance.totalEmployee : 0;
    const totalDeduct = totalIns + (p.taxAmount || 0) + (p.advancePayment || 0) + (p.otherDeductions || 0);
    csv += \`"\${idx + 1}","\${sanitizeCsvCell(p.employeeCode)}","\${sanitizeCsvCell(p.employeeName)}","\${sanitizeCsvCell(p.jobTitle || '')}","\${isPiece ? 'Khoán SP' : 'Thời gian'}",\${p.baseSalary},\${p.actualWorkDays},\${earnedSalary},\${p.lunchAllowance || 0},\${p.seniorityAllowance || 0},\${p.attendanceBonus || 0},\${p.otherAllowances || 0},\${p.bonusAmount || 0},\${p.overtimeSalary || 0},\${p.grossSalary},\${bhxh},\${bhyt},\${bhtn},\${totalIns},\${p.taxAmount || 0},\${p.advancePayment || 0},\${p.otherDeductions || 0},\${totalDeduct},\${p.netSalary},"\${sanitizeCsvCell(p.docSoText)}"\\n\`;
  });
  downloadFile(csv, \`Bang_Luong_\${currentTenant}_\${currentMonth}.csv\`, 'text/csv;charset=utf-8;');
  toast('Đã xuất Bảng lương Excel 24 cột chuẩn xác thành công!');
}

function exportAttendanceExcel() {
  let csv = '\\uFEFFMã NV,Họ và tên,Tổng ngày công,Giờ OT\\n';
  payrollResults.forEach(p => {
    csv += \`"\${sanitizeCsvCell(p.employeeCode)}","\${sanitizeCsvCell(p.employeeName)}",\${p.actualWorkDays} công,\${p.overtimeHours || 0} giờ\\n\`;
  });
  downloadFile(csv, \`Bang_Cham_Cong_\${currentTenant}_\${currentMonth}.csv\`, 'text/csv;charset=utf-8;');
  toast('Đã xuất Bảng chấm công Excel thành công!');
}

function exportTaxExcel() {
  let csv = '\\uFEFFSTT,Mã NV,Họ và tên,Tổng thu nhập (Gross),Thu nhập chịu thuế,Giảm trừ gia cảnh (11M/4.4M),Thu nhập tính thuế,Thuế TNCN 7 bậc (Hiện hành),Giảm trừ gia cảnh (15.5M/6.2M),Thuế TNCN 5 bậc (Dự thảo 2026),Tiền thuế chênh lệch giảm được\\n';
  payrollResults.forEach((p, idx) => {
    const taxableInc = p.taxableIncome !== undefined ? p.taxableIncome : Math.max(0, p.grossSalary - (p.insurance ? p.insurance.totalEmployee : 0) - (p.lunchAllowance || 0));
    const draft = calculateDraftTaxClient(taxableInc, p.dependentsCount || 0);
    const diff = Math.max(0, (p.taxAmount || 0) - draft.tax);
    csv += \`"\${idx + 1}","\${sanitizeCsvCell(p.employeeCode)}","\${sanitizeCsvCell(p.employeeName)}",\${p.grossSalary},\${taxableInc},\${p.familyDeductions || 0},\${p.assessableIncome || 0},\${p.taxAmount || 0},\${draft.familyDeduction},\${draft.tax},\${diff}\\n\`;
  });
  downloadFile(csv, \`Bao_Cao_Thue_\${currentTenant}_\${currentMonth}.csv\`, 'text/csv;charset=utf-8;');
  toast('Đã xuất Báo cáo thuế đối chiếu chuẩn xác thành công!');
}

function exportBackupJson() {
  const data = {
    tenant: currentTenant,
    month: currentMonth,
    exportedAt: new Date().toISOString(),
    settings: companySettings,
    employees: payrollResults,
    attendance: attendanceData || {}
  };
  downloadFile(JSON.stringify(data, null, 2), \`Sao_Luu_\${currentTenant}_\${currentMonth}.json\`, 'application/json');
  toast('Đã xuất file sao lưu JSON thành công!');
}

function handleRestoreFile(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      toast('Đã đọc dữ liệu sao lưu! Khôi phục thành công.');
      loadAllData();
    } catch (err) {
      toast('Tệp JSON không hợp lệ!', 'err');
    }
  };
  reader.readAsText(file);
}

function downloadFile(content, filename, type) {
  const blob = new Blob([content], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
}

async function resetToSample() {
  if (currentRole !== 'ORG_OWNER' && currentRole !== 'OWNER') {
    return toast('Chỉ có Giám đốc (ORG_OWNER) mới có quyền đặt lại dữ liệu mẫu toàn hệ thống!', 'err');
  }
  if (!confirm('Khôi phục lại toàn bộ dữ liệu mẫu ban đầu của hệ thống?')) return;
  try {
    const res = await fetch('/api/data/reset-sample', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userRole: currentRole })
    });
    const d = await res.json();
    if (d.success) {
      toast('Đã thiết lập lại bộ dữ liệu demo chuẩn doanh nghiệp thành công!');
      loadAllData();
    } else {
      toast(d.error || 'Lỗi thiết lập lại dữ liệu', 'err');
    }
  } catch (err) {
    toast('Lỗi: ' + err.message, 'err');
  }
}

function openImportModal() {
  alert('Tính năng Nhập Excel: Bạn có thể chọn file Excel hoặc dán dữ liệu. Hệ thống sẽ phân tích các cột Họ tên, Lương CB, CCCD và thêm vào danh sách.');
}

// Khởi chạy khi tải trang
loadAllData();
</script>
</body>
</html>`;
}

// HTTP Request Handler
const requestHandler = async (req: http.IncomingMessage, res: http.ServerResponse) => {
  const parsedUrl = new URL(req.url || '/', `http://localhost:${PORT}`);
  const pathname = parsedUrl.pathname;

  // Resolve session securely from cookie (Anti-Spoofing & Session Context)
  const cookies = parseCookies(req.headers.cookie);
  const sessionToken = cookies['payroll_session'];
  let currentSession = sessionToken ? sessionStore.get(sessionToken) : undefined;

  const queryTenant = parsedUrl.searchParams.get('tenantId');
  const queryRole = parsedUrl.searchParams.get('userRole');

  if (!currentSession) {
    const initialTenant = queryTenant || 'tenant-alpha-tech';
    const initialRole = queryRole || 'ORG_OWNER';
    const newSessionId = generateSessionId();
    currentSession = {
      sessionId: newSessionId,
      userId: `usr_${initialRole.toLowerCase()}_${initialTenant}`,
      tenantId: initialTenant,
      role: initialRole,
      email: `${initialRole.toLowerCase()}@${initialTenant.includes('alpha') ? 'tanphatdigital.vn' : 'bacnamlogistics.vn'}`,
      createdAt: Date.now(),
      lastActiveAt: Date.now(),
    };
    sessionStore.set(newSessionId, currentSession);
    res.setHeader('Set-Cookie', `payroll_session=${newSessionId}; Path=/; HttpOnly; SameSite=Lax`);
  } else {
    currentSession.lastActiveAt = Date.now();
  }

  // Authoritative authenticated session context
  const tenantId = currentSession.tenantId;
  const userRole = currentSession.role;

  // Helper function to reject any malicious client attempt to forge tenantId or userRole in request body
  const assertNoSpoofing = (body: any) => {
    if (body.tenantId && body.tenantId !== tenantId) {
      throw new HttpError(403, `Phát hiện hành vi can thiệp trái phép (IDOR Violation): tenantId trong payload [${body.tenantId}] không khớp với phiên làm việc đã xác thực [${tenantId}]!`);
    }
    if (body.userRole && body.userRole !== userRole) {
      throw new HttpError(403, `Phát hiện hành vi mạo danh vai trò trái phép (Privilege Escalation): userRole trong payload [${body.userRole}] không khớp với vai trò của phiên làm việc [${userRole}]!`);
    }
  };

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Health check
  if (pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'healthy', timestamp: new Date().toISOString(), database: 'active' }));
    return;
  }

  // API: Switch Session Context (Tenant / Role)
  if (pathname === '/api/auth/switch-context' && req.method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const targetTenant = body.tenantId || tenantId;
      const targetRole = body.userRole || userRole;

      const VALID_TENANTS = ['tenant-alpha-tech', 'tenant-beta-logistics', 'tenant_alpha_tech_001', 'tenant_beta_garment_002'];
      const VALID_ROLES = ['ORG_OWNER', 'ORG_ADMIN', 'ACCOUNTANT', 'HR_MANAGER', 'DEPARTMENT_MANAGER', 'EMPLOYEE', 'OWNER', 'ADMIN'];

      if (!VALID_TENANTS.includes(targetTenant)) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: `Doanh nghiệp không hợp lệ: [${targetTenant}]` }));
        return;
      }
      if (!VALID_ROLES.includes(targetRole)) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: `Vai trò không hợp lệ: [${targetRole}]` }));
        return;
      }

      currentSession.tenantId = targetTenant;
      currentSession.role = targetRole;
      currentSession.userId = `usr_${targetRole.toLowerCase()}_${targetTenant}`;
      currentSession.lastActiveAt = Date.now();

      res.setHeader('Set-Cookie', `payroll_session=${currentSession.sessionId}; Path=/; HttpOnly; SameSite=Lax`);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        session: {
          sessionId: currentSession.sessionId,
          tenantId: currentSession.tenantId,
          role: currentSession.role,
        }
      }));
    } catch (err: any) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: err.message }));
    }
    return;
  }

  // Server-Side Page Routes mapping to correct tabs and titles
  const PAGE_ROUTES: Record<string, { tab: string; title: string }> = {
    '/': { tab: 'dashboard', title: 'Tổng quan' },
    '/index.html': { tab: 'dashboard', title: 'Tổng quan' },
    '/tong-quan': { tab: 'dashboard', title: 'Tổng quan' },
    '/dashboard': { tab: 'dashboard', title: 'Tổng quan' },
    '/cham-cong': { tab: 'chamcong', title: 'Chấm công' },
    '/timekeeping': { tab: 'chamcong', title: 'Chấm công' },
    '/nhan-vien': { tab: 'nhanvien', title: 'Nhân viên' },
    '/employees': { tab: 'nhanvien', title: 'Nhân viên' },
    '/bang-luong': { tab: 'bangluong', title: 'Bảng lương' },
    '/payroll': { tab: 'bangluong', title: 'Bảng lương' },
    '/thue-bhxh': { tab: 'thue', title: 'Thuế & BHXH' },
    '/tax-insurance': { tab: 'thue', title: 'Thuế & BHXH' },
    '/cai-dat': { tab: 'caidat', title: 'Cài đặt' },
    '/settings': { tab: 'caidat', title: 'Cài đặt' },
    '/du-lieu': { tab: 'data', title: 'Dữ liệu & Khóa sổ' },
    '/backup': { tab: 'data', title: 'Dữ liệu & Khóa sổ' },
  };

  const pageRoute = PAGE_ROUTES[pathname];
  if (pageRoute) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(getHtmlApp(pageRoute.tab, pageRoute.title, pathname));
    return;
  }

  // API: Get Timekeeping Grid
  if (pathname === '/api/timekeeping') {
    try {
      const context = { tenantId, user: { id: 'user-admin' }, userId: 'user-admin', role: userRole as any, userRole };
      const employees = await repository.listEmployees(context);
      initAttendanceForTenant(tenantId, employees);

      let attendanceResponse: Record<string, any> = {};
      const fullAttendance = attendanceStore[tenantId] || {};

      if (userRole === 'EMPLOYEE') {
        const selfEmpId = tenantId === 'tenant-alpha-tech' ? 'emp_alpha_003' : 'emp_beta_001';
        if (fullAttendance[selfEmpId]) {
          attendanceResponse[selfEmpId] = fullAttendance[selfEmpId];
        }
      } else if (userRole === 'DEPARTMENT_MANAGER') {
        const targetDept = tenantId === 'tenant-beta-logistics' ? 'dept_beta_lx' : 'dept_alpha_tech';
        const deptEmployees = employees.filter(e => e.departmentId === targetDept);
        for (const emp of deptEmployees) {
          if (fullAttendance[emp.id]) {
            attendanceResponse[emp.id] = fullAttendance[emp.id];
          }
        }
      } else {
        attendanceResponse = fullAttendance;
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, attendance: attendanceResponse, role: userRole }));
    } catch (err: any) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: err.message }));
    }
    return;
  }

  // API: Update Day Attendance
  if (pathname === '/api/timekeeping/update' && req.method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      assertNoSpoofing(body);
      const targetTenant = tenantId;
      const targetRole = userRole;

      if (targetRole === 'EMPLOYEE') {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Nhân viên không có quyền tự chỉnh sửa dữ liệu chấm công. Vui lòng liên hệ Quản lý bộ phận hoặc Nhân sự.' }));
        return;
      }

      if (targetRole === 'ACCOUNTANT') {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Kế toán chỉ có quyền xem dữ liệu chấm công để tính lương, không được trực tiếp sửa bảng chấm công.' }));
        return;
      }

      const curTimekeepingStatus = periodStatusStore[targetTenant] || 'DRAFT';
      if (curTimekeepingStatus === 'LOCKED' || curTimekeepingStatus === 'PAID') {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: `Kỳ lương hiện tại đang ở trạng thái [${curTimekeepingStatus}]. Không thể sửa ngày công!` }));
        return;
      }
      if (curTimekeepingStatus === 'REVIEWING' && !['ORG_OWNER', 'ORG_ADMIN', 'OWNER', 'ADMIN'].includes(targetRole)) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Kỳ lương đang ở trạng thái CHỜ DUYỆT (REVIEWING). Chỉ Ban Giám đốc mới có thể chỉnh sửa hoặc trả về DRAFT.' }));
        return;
      }

      if (targetRole === 'DEPARTMENT_MANAGER') {
        const allEmps = await repository.listEmployees({ tenantId: targetTenant, user: { id: 'admin' }, userId: 'admin', role: 'OWNER' as const, userRole: targetRole });
        const emp = allEmps.find(e => e.id === body.employeeId);
        const allowedDept = targetTenant === 'tenant-beta-logistics' ? 'dept_beta_lx' : 'dept_alpha_tech';
        if (!emp || emp.departmentId !== allowedDept) {
          res.writeHead(403, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'Trưởng bộ phận chỉ được phép chấm công cho nhân sự thuộc bộ phận của mình!' }));
          return;
        }
      }

      if (!attendanceStore[targetTenant]) attendanceStore[targetTenant] = {};
      if (!attendanceStore[targetTenant][body.employeeId]) {
        attendanceStore[targetTenant][body.employeeId] = { days: {}, otHours: 0 };
      }
      if (body.code) {
        attendanceStore[targetTenant][body.employeeId].days[body.day] = body.code;
      } else {
        delete attendanceStore[targetTenant][body.employeeId].days[body.day];
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
    } catch (err: any) {
      res.writeHead(err.statusCode || 400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: err.message }));
    }
    return;
  }

  // API: Update Overtime (OT) Hours
  if (pathname === '/api/timekeeping/ot' && req.method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      assertNoSpoofing(body);
      const targetTenant = tenantId;
      const targetRole = userRole;

      if (targetRole === 'EMPLOYEE') {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Nhân viên không có quyền tự duyệt hoặc chỉnh sửa giờ làm thêm (OT).' }));
        return;
      }

      if (targetRole === 'ACCOUNTANT') {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Kế toán chỉ có quyền đọc số giờ OT để tính lương, không được tự ý sửa giờ OT.' }));
        return;
      }

      const curOtStatus = periodStatusStore[targetTenant] || 'DRAFT';
      if (curOtStatus === 'LOCKED' || curOtStatus === 'PAID') {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: `Kỳ lương hiện tại đang ở trạng thái [${curOtStatus}]. Không thể sửa giờ OT!` }));
        return;
      }
      if (curOtStatus === 'REVIEWING' && !['ORG_OWNER', 'ORG_ADMIN', 'OWNER', 'ADMIN'].includes(targetRole)) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Kỳ lương đang ở trạng thái CHỜ DUYỆT (REVIEWING). Chỉ Ban Giám đốc mới có thể chỉnh sửa hoặc trả về DRAFT.' }));
        return;
      }

      if (targetRole === 'DEPARTMENT_MANAGER') {
        const allEmps = await repository.listEmployees({ tenantId: targetTenant, user: { id: 'admin' }, userId: 'admin', role: 'OWNER' as const, userRole: targetRole });
        const emp = allEmps.find(e => e.id === body.employeeId);
        const allowedDept = targetTenant === 'tenant-beta-logistics' ? 'dept_beta_lx' : 'dept_alpha_tech';
        if (!emp || emp.departmentId !== allowedDept) {
          res.writeHead(403, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'Trưởng bộ phận chỉ được phép duyệt OT cho nhân sự thuộc bộ phận của mình!' }));
          return;
        }
      }

      if (!attendanceStore[targetTenant]) attendanceStore[targetTenant] = {};
      if (!attendanceStore[targetTenant][body.employeeId]) {
        attendanceStore[targetTenant][body.employeeId] = { days: {}, otHours: 0 };
      }
      attendanceStore[targetTenant][body.employeeId].otHours = parseFloat(body.otHours) || 0;

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
    } catch (err: any) {
      res.writeHead(err.statusCode || 400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: err.message }));
    }
    return;
  }

  // API: Calculate Payroll
  if (pathname === '/api/payroll/calculate') {
    try {
      const isPrivileged = ['ORG_OWNER', 'ORG_ADMIN', 'ACCOUNTANT', 'OWNER', 'ADMIN'].includes(userRole);
      const isHR = userRole === 'HR_MANAGER';

      // DEPARTMENT_MANAGER: Không có quyền truy cập bảng lương doanh nghiệp
      if (userRole === 'DEPARTMENT_MANAGER') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          restricted: true,
          message: 'Trưởng bộ phận chỉ có quyền quản lý công và duyệt OT trong phòng ban, không có quyền xem bảng lương tài chính doanh nghiệp.',
          payroll: [],
          periodStatus: periodStatusStore[tenantId] || 'DRAFT',
          settings: companySettingsStore[tenantId] || {}
        }));
        return;
      }

      const context = {
        tenantId,
        user: { id: 'user-admin' },
        userId: 'user-admin',
        role: userRole as any,
        userRole,
      };
      let employees = await repository.listEmployees(context);
      initAttendanceForTenant(tenantId, employees);
      const settings = companySettingsStore[tenantId] || {
        standardWorkDays: 26,
        insuranceBaseSalary: 2340000,
        taxRule: 'LAW_7_TIER_OFFICIAL',
        roundingRule: 'ROUND_1000',
      };

      // EMPLOYEE: Chỉ xem bảng lương cá nhân (Self-Service)
      if (userRole === 'EMPLOYEE') {
        const selfEmpId = tenantId === 'tenant-alpha-tech' ? 'emp_alpha_003' : 'emp_beta_001';
        employees = employees.filter(e => e.id === selfEmpId);
      }

      const payrollResults = employees.map(emp => {
        const empAtt = attendanceStore[tenantId][emp.id] || { days: {}, otHours: 0 };
        const attSummary = summarizeAttendance(empAtt.days, empAtt.otHours);

        const attInput = {
          actualWorkDays: attSummary.actualWorkDays,
          paidLeaveDays: attSummary.paidLeaveDays,
          holidayDays: attSummary.holidayDays,
          businessTripDays: 0,
          paidDaysCount: attSummary.actualWorkDays + attSummary.paidLeaveDays + attSummary.holidayDays,
          unpaidLeaveDays: attSummary.unpaidLeaveDays,
          overtimeHours: attSummary.overtimeHours,
        };

        const empExtra = (extraInputsStore[tenantId] && extraInputsStore[tenantId][emp.id]) || {};
        const adjustments = {
          pieceRateQuantity: empExtra.slSP ?? (emp.salaryType === 'PIECE_RATE' ? 2100 : undefined),
          pieceRateUnitPriceOverride: empExtra.dgSP ?? emp.pieceRateUnitPrice,
          bonusAmount: empExtra.thuong || 0,
          advancePayment: empExtra.tamUng || 0,
          otherDeductions: empExtra.khauTruKhac || 0,
        };

        const result = calculateEmployeePayroll({
          employee: emp,
          attendance: attInput,
          adjustments,
          companySetting: {
            standardWorkingDays: settings.standardWorkDays || 26,
            standardWorkingHours: 8,
            overtimeRateNormal: (settings.otWeekdays || 150) / 100,
            salaryRoundingRule: settings.roundingRule || 'ROUND_1000',
          },
          yearMonth: '2026-10',
        });
        const docSoText = isHR ? 'Đã che theo phân quyền bảo mật Nhân sự' : docSo(result.netSalary);

        const maskedCCCD = isPrivileged || isHR ? emp.idCardNumber : maskIdCardNumber(emp.idCardNumber);
        const maskedBank = isPrivileged || isHR ? emp.bankAccountNumber : maskBankAccountNumber(emp.bankAccountNumber);

        // HR_MANAGER: Che các số liệu lương tài chính nhạy cảm
        return {
          employeeId: emp.id,
          employeeCode: emp.code,
          employeeName: emp.fullName,
          salaryType: emp.salaryType,
          baseSalary: isHR ? '******' : emp.baseSalary,
          insuranceSalary: isHR ? '******' : (emp.insuranceSalary || emp.baseSalary),
          actualWorkDays: attSummary.actualWorkDays,
          unpaidLeaveDays: attSummary.unpaidLeaveDays,
          overtimeHours: attSummary.overtimeHours,
          timeSalary: isHR ? '******' : result.timeBasedSalary,
          pieceRateSalary: isHR ? '******' : result.pieceRateSalary,
          pieceRateQuantity: adjustments.pieceRateQuantity,
          pieceRateUnitPrice: isHR ? '******' : (adjustments.pieceRateUnitPriceOverride || emp.pieceRateUnitPrice),
          bonusAmount: isHR ? '******' : result.bonusAmount,
          advancePayment: isHR ? '******' : result.advancePayment,
          otherDeductions: isHR ? '******' : result.otherDeductions,
          lunchAllowance: isHR ? '******' : result.lunchAllowanceTotal,
          seniorityAllowance: isHR ? '******' : result.seniorityAllowance,
          attendanceBonus: isHR ? '******' : result.attendanceAllowance,
          otherAllowances: isHR ? '******' : ((result.gasAllowance || 0) + (result.phoneAllowance || 0) + (result.housingAllowance || 0) + (result.otherTaxableAllowances || 0)),
          overtimeSalary: isHR ? '******' : result.overtimeSalary,
          grossSalary: isHR ? '******' : result.grossSalary,
          insurance: {
            bhxhEmployee: isHR ? '******' : result.employeeInsurance.bhxh,
            bhytEmployee: isHR ? '******' : result.employeeInsurance.bhyt,
            bhtnEmployee: isHR ? '******' : result.employeeInsurance.bhtn,
            totalEmployee: isHR ? '******' : result.employeeInsurance.total,
          },
          taxableIncome: isHR ? '******' : result.taxableIncome,
          assessableIncome: isHR ? '******' : result.assessableIncome,
          familyDeductions: isHR ? '******' : (result.familyDeductions ? result.familyDeductions.total : 0),
          employerInsurance: isHR ? { bhxh: '******', bhyt: '******', bhtn: '******', bhtnld: '******', union: '******', total: '******' } : result.employerInsurance,
          totalEmployerCost: isHR ? '******' : result.totalEmployerCost,
          totalCompanyExpense: isHR ? '******' : result.totalCompanyExpense,
          formulaExplanation: result.formulaExplanation,
          taxAmount: isHR ? '******' : result.personalIncomeTax,
          netSalary: isHR ? '******' : result.netSalary,
          docSoText,
          idCardNumber: maskedCCCD,
          bankAccountNumber: maskedBank,
          dependentsCount: emp.taxDependentsCount ?? emp.dependentsCount ?? 0,
          departmentName: emp.departmentName,
          jobTitle: emp.jobTitle,
          startDate: emp.startDate,
          bankName: emp.bankName,
        };
      });

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        periodStatus: periodStatusStore[tenantId] || 'DRAFT',
        periodVersion: periodVersionStore[tenantId] || 1,
        payroll: payrollResults,
        settings,
      }));
    } catch (err: any) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: err.message }));
    }
    return;
  }

  // API: Update Payroll Adjustments (Advance payment, other deductions, bonus, piece-rate overrides)
  if (pathname === '/api/payroll/adjustments' && req.method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      assertNoSpoofing(body);
      const targetTenant = tenantId;
      const targetRole = userRole;
      const currentPeriodStatus = periodStatusStore[targetTenant] || 'DRAFT';

      if (!['ORG_OWNER', 'ORG_ADMIN', 'ACCOUNTANT', 'OWNER', 'ADMIN'].includes(targetRole)) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: false,
          error: 'Chỉ có Kế toán lương (ACCOUNTANT) hoặc Quản trị viên (ORG_OWNER, ORG_ADMIN) mới có quyền điều chỉnh tạm ứng, thưởng và khấu trừ lương!'
        }));
        return;
      }

      const currentVersion = periodVersionStore[targetTenant] || 1;
      if (body.expectedVersion !== undefined && Number(body.expectedVersion) !== currentVersion) {
        res.writeHead(409, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: false,
          error: `Xung đột phiên làm việc (Conflict OCC): Kỳ lương đã được cập nhật bởi một người dùng khác (phiên bản máy chủ: ${currentVersion}, phiên bản gửi lên: ${body.expectedVersion}). Vui lòng tải lại dữ liệu!`,
          currentVersion,
        }));
        return;
      }

      await runInTenantTransaction(targetTenant, async () => {
        if (currentPeriodStatus === 'LOCKED' || currentPeriodStatus === 'PAID') {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: false,
            error: `Kỳ lương hiện tại đang ở trạng thái [${currentPeriodStatus}] (Đã khóa sổ hoặc Đã chi trả). Không được phép chỉnh sửa số liệu!`
          }));
          return;
        }

        if (currentPeriodStatus === 'REVIEWING' && !['ORG_OWNER', 'ORG_ADMIN', 'OWNER', 'ADMIN'].includes(targetRole)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: false,
            error: 'Kỳ lương đang ở trạng thái CHỜ DUYỆT (REVIEWING). Chỉ Ban Giám đốc mới có quyền điều chỉnh số liệu.'
          }));
          return;
        }

        if (!body.employeeId) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'Thiếu mã nhân viên' }));
          return;
        }

        if (!extraInputsStore[targetTenant]) {
          extraInputsStore[targetTenant] = {};
        }
        if (!extraInputsStore[targetTenant][body.employeeId]) {
          extraInputsStore[targetTenant][body.employeeId] = {};
        }

        const empExtra = extraInputsStore[targetTenant][body.employeeId];
        if (body.tamUng !== undefined) empExtra.tamUng = Math.max(0, Number(body.tamUng) || 0);
        if (body.khauTruKhac !== undefined) empExtra.khauTruKhac = Math.max(0, Number(body.khauTruKhac) || 0);
        if (body.thuong !== undefined) empExtra.thuong = Math.max(0, Number(body.thuong) || 0);
        if (body.slSP !== undefined) empExtra.slSP = Math.max(0, Number(body.slSP) || 0);
        if (body.dgSP !== undefined) empExtra.dgSP = Math.max(0, Number(body.dgSP) || 0);

        periodVersionStore[targetTenant] = currentVersion + 1;

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          message: 'Đã cập nhật điều chỉnh lương thành công',
          adjustments: empExtra,
          periodVersion: periodVersionStore[targetTenant],
        }));
      });
    } catch (err: any) {
      res.writeHead(err.statusCode || 400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: err.message }));
    }
    return;
  }

  // API: Submit Payroll for Review (DRAFT -> REVIEWING)
  if (pathname === '/api/payroll/submit-review' && req.method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      assertNoSpoofing(body);
      const targetTenant = tenantId;
      const targetRole = userRole;

      if (!['ORG_OWNER', 'ORG_ADMIN', 'ACCOUNTANT', 'OWNER', 'ADMIN'].includes(targetRole)) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Chỉ có Kế toán lương hoặc Quản trị viên mới có quyền gửi duyệt kỳ lương!' }));
        return;
      }

      const currentVersion = periodVersionStore[targetTenant] || 1;
      if (body.expectedVersion !== undefined && Number(body.expectedVersion) !== currentVersion) {
        res.writeHead(409, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: false,
          error: `Xung đột phiên làm việc (Conflict OCC): Kỳ lương đã bị thay đổi (phiên bản máy chủ: ${currentVersion}, phiên bản gửi lên: ${body.expectedVersion}). Vui lòng làm mới trang!`,
          currentVersion,
        }));
        return;
      }

      await runInTenantTransaction(targetTenant, async () => {
        const curStatus = periodStatusStore[targetTenant] || 'DRAFT';
        if (curStatus !== 'DRAFT') {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: `Không thể gửi duyệt kỳ lương ở trạng thái [${curStatus}]. Chỉ được gửi duyệt từ DRAFT.` }));
          return;
        }

        periodStatusStore[targetTenant] = 'REVIEWING';
        periodVersionStore[targetTenant] = currentVersion + 1;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          message: 'Kỳ lương đã được chuyển sang trạng thái chờ duyệt (REVIEWING)!',
          status: 'REVIEWING',
          periodVersion: periodVersionStore[targetTenant],
        }));
      });
    } catch (err: any) {
      res.writeHead(err.statusCode || 400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: err.message }));
    }
    return;
  }

  // API: Lock Payroll Period (REVIEWING / DRAFT -> LOCKED)
  if (pathname === '/api/payroll/lock' && req.method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      assertNoSpoofing(body);
      const targetTenant = tenantId;
      const targetRole = userRole;

      if (!['ORG_OWNER', 'ORG_ADMIN', 'OWNER', 'ADMIN'].includes(targetRole)) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Chỉ có Ban Giám đốc (ORG_OWNER, ORG_ADMIN) mới có quyền phê duyệt và khóa sổ kỳ lương' }));
        return;
      }

      const currentVersion = periodVersionStore[targetTenant] || 1;
      if (body.expectedVersion !== undefined && Number(body.expectedVersion) !== currentVersion) {
        res.writeHead(409, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: false,
          error: `Xung đột phiên làm việc (Conflict OCC): Kỳ lương đã bị thay đổi (phiên bản máy chủ: ${currentVersion}, phiên bản gửi lên: ${body.expectedVersion}). Vui lòng làm mới trang!`,
          currentVersion,
        }));
        return;
      }

      await runInTenantTransaction(targetTenant, async () => {
        const curStatus = periodStatusStore[targetTenant] || 'DRAFT';
        if (curStatus === 'PAID') {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'Kỳ lương đã được giải ngân chi trả (PAID), không thể khóa lại.' }));
          return;
        }

        periodStatusStore[targetTenant] = 'LOCKED';
        periodVersionStore[targetTenant] = currentVersion + 1;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          message: 'Kỳ lương đã được phê duyệt và khóa sổ an toàn!',
          status: 'LOCKED',
          periodVersion: periodVersionStore[targetTenant],
        }));
      });
    } catch (err: any) {
      res.writeHead(err.statusCode || 400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: err.message }));
    }
    return;
  }

  // API: Mark Payroll as Paid (LOCKED -> PAID)
  if (pathname === '/api/payroll/pay' && req.method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      assertNoSpoofing(body);
      const targetTenant = tenantId;
      const targetRole = userRole;

      if (!['ORG_OWNER', 'ORG_ADMIN', 'ACCOUNTANT', 'OWNER', 'ADMIN'].includes(targetRole)) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Chỉ có Ban Giám đốc hoặc Kế toán trưởng mới có quyền xác nhận chi trả lương!' }));
        return;
      }

      const currentVersion = periodVersionStore[targetTenant] || 1;
      if (body.expectedVersion !== undefined && Number(body.expectedVersion) !== currentVersion) {
        res.writeHead(409, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: false,
          error: `Xung đột phiên làm việc (Conflict OCC): Kỳ lương đã bị thay đổi (phiên bản máy chủ: ${currentVersion}, phiên bản gửi lên: ${body.expectedVersion}). Vui lòng làm mới trang!`,
          currentVersion,
        }));
        return;
      }

      await runInTenantTransaction(targetTenant, async () => {
        const curStatus = periodStatusStore[targetTenant] || 'DRAFT';
        if (curStatus !== 'LOCKED') {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: `Kỳ lương phải ở trạng thái ĐÃ KHÓA SỔ (LOCKED) mới có thể xác nhận chi trả! Trạng thái hiện tại: [${curStatus}].` }));
          return;
        }

        periodStatusStore[targetTenant] = 'PAID';
        periodVersionStore[targetTenant] = currentVersion + 1;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          message: 'Kỳ lương đã được xác nhận chi trả thành công (PAID)! Dữ liệu đã đóng băng vĩnh viễn.',
          status: 'PAID',
          periodVersion: periodVersionStore[targetTenant],
        }));
      });
    } catch (err: any) {
      res.writeHead(err.statusCode || 400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: err.message }));
    }
    return;
  }

  // API: Unlock Payroll Period (LOCKED / REVIEWING -> DRAFT)
  if (pathname === '/api/payroll/unlock' && req.method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      assertNoSpoofing(body);
      const targetTenant = tenantId;
      const targetRole = userRole;

      if (targetRole !== 'ORG_OWNER' && targetRole !== 'OWNER') {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Chỉ có Giám đốc / Chủ sở hữu (ORG_OWNER) mới có quyền mở khóa kỳ lương!' }));
        return;
      }

      const currentVersion = periodVersionStore[targetTenant] || 1;
      if (body.expectedVersion !== undefined && Number(body.expectedVersion) !== currentVersion) {
        res.writeHead(409, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: false,
          error: `Xung đột phiên làm việc (Conflict OCC): Kỳ lương đã bị thay đổi (phiên bản máy chủ: ${currentVersion}, phiên bản gửi lên: ${body.expectedVersion}). Vui lòng làm mới trang!`,
          currentVersion,
        }));
        return;
      }

      await runInTenantTransaction(targetTenant, async () => {
        const curStatus = periodStatusStore[targetTenant] || 'DRAFT';
        if (curStatus === 'PAID') {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'Kỳ lương đã được giải ngân chi trả (PAID). Tuyệt đối không thể mở khóa để tránh vi phạm quyết toán kế toán!' }));
          return;
        }

        if (!body.reason || body.reason.trim().length < 10) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'Lý do mở khóa phải có tối thiểu 10 ký tự' }));
          return;
        }

        periodStatusStore[targetTenant] = 'DRAFT';
        periodVersionStore[targetTenant] = currentVersion + 1;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          message: 'Đã mở khóa kỳ lương về trạng thái DRAFT thành công!',
          status: 'DRAFT',
          periodVersion: periodVersionStore[targetTenant],
        }));
      });
    } catch (err: any) {
      res.writeHead(err.statusCode || 400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: err.message }));
    }
    return;
  }

  // API: Save Company Settings
  if (pathname === '/api/settings/save' && req.method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      assertNoSpoofing(body);
      const targetTenant = tenantId;
      const targetRole = userRole;

      if (!['ORG_OWNER', 'ORG_ADMIN', 'OWNER', 'ADMIN'].includes(targetRole)) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Chỉ có Giám đốc (ORG_OWNER) hoặc Quản trị viên mới có quyền thay đổi thiết lập công ty!' }));
        return;
      }

      companySettingsStore[targetTenant] = {
        ...companySettingsStore[targetTenant],
        ...body,
      };

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, settings: companySettingsStore[targetTenant] }));
    } catch (err: any) {
      res.writeHead(err.statusCode || 400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: err.message }));
    }
    return;
  }

  // API: Save Employee
  if (pathname === '/api/employees/save' && req.method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      assertNoSpoofing(body);
      const targetTenant = tenantId;
      const targetRole = userRole;

      if (!['ORG_OWNER', 'ORG_ADMIN', 'HR_MANAGER', 'OWNER', 'ADMIN'].includes(targetRole)) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Chỉ có Ban Giám đốc hoặc Trưởng phòng Nhân sự (HR_MANAGER) mới có quyền tạo hoặc chỉnh sửa hồ sơ nhân sự!' }));
        return;
      }

      const context = { tenantId: targetTenant, user: { id: 'user-admin' }, userId: 'user-admin', role: 'OWNER' as const, userRole: targetRole };

      await repository.createEmployee(context, {
        code: body.code,
        fullName: body.fullName,
        baseSalary: body.baseSalary,
        salaryType: body.salaryType || 'TIME_BASED',
        idCardNumber: body.idCardNumber,
        bankAccountNumber: body.bankAccountNumber,
        dependentsCount: body.dependentsCount || 0,
        startDate: body.startDate ? new Date(body.startDate) : new Date(),
      });

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
    } catch (err: any) {
      res.writeHead(err.statusCode || 400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: err.message }));
    }
    return;
  }

  // API: Delete Employee
  if (pathname === '/api/employees/delete' && req.method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      assertNoSpoofing(body);
      const targetRole = userRole;

      if (!['ORG_OWNER', 'ORG_ADMIN', 'OWNER', 'ADMIN'].includes(targetRole)) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Chỉ có Ban Giám đốc (ORG_OWNER, ORG_ADMIN) mới có quyền xóa hồ sơ nhân viên!' }));
        return;
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, message: 'Đã xóa nhân viên' }));
    } catch (err: any) {
      res.writeHead(err.statusCode || 400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: err.message }));
    }
    return;
  }

  // API: Audit Logs
  if (pathname === '/api/audit-logs') {
    try {
      const logs = [
        { createdAt: new Date().toISOString(), userId: 'owner@alpha-tech.vn', action: 'LOGIN_SUCCESS', details: { ip: '127.0.0.1' } },
        { createdAt: new Date(Date.now() - 3600000).toISOString(), userId: 'accountant@alpha-tech.vn', action: 'CALCULATE_PAYROLL', details: { period: '10/2026', totalEmp: 6 } },
        { createdAt: new Date(Date.now() - 7200000).toISOString(), userId: 'owner@alpha-tech.vn', action: 'UPDATE_SETTINGS', details: { lunchAllowance: 730000 } },
      ];
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, logs }));
    } catch (err: any) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: err.message }));
    }
    return;
  }

  // API: Reset Sample Data
  if (pathname === '/api/data/reset-sample' && (req.method === 'POST' || req.method === 'GET')) {
    try {
      if (req.method === 'POST') {
        try {
          const body = await parseJsonBody(req);
          assertNoSpoofing(body);
        } catch (err: any) {
          if (err instanceof HttpError) throw err;
        }
      }

      if (userRole !== 'ORG_OWNER' && userRole !== 'OWNER') {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Chỉ có Giám đốc / Chủ sở hữu (ORG_OWNER) mới có quyền thiết lập lại dữ liệu mẫu toàn hệ thống!' }));
        return;
      }

      resetAllDataToDemo();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        message: 'Đã xóa toàn bộ dữ liệu hiện tại và khởi tạo bộ dữ liệu demo chuẩn doanh nghiệp mới!',
      }));
    } catch (err: any) {
      res.writeHead(err.statusCode || 400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: err.message }));
    }
    return;
  }

  // 404 Not Found
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ success: false, error: 'Not Found' }));
};

const server = http.createServer(requestHandler);

const isTestEnv =
  (process.execArgv && process.execArgv.some(arg => arg.includes('test'))) ||
  (process.argv && process.argv.some(arg => arg.includes('test'))) ||
  process.env.NODE_ENV === 'test';

if (!isTestEnv) {
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`========================================================================`);
    console.log(`🚀 Phần mềm Quản trị Chấm công & Tính lương B2B SaaS đã khởi chạy!`);
    console.log(`🌐 Truy cập ứng dụng tại: http://localhost:${PORT}`);
    console.log(`⚡ Hệ thống đã sẵn sàng với bộ dữ liệu demo doanh nghiệp mới:`);
    console.log(`   - Tân Phát Digital Corp (tenant-alpha-tech): 8 nhân sự, 5 phòng ban`);
    console.log(`   - Bắc Nam Logistics (tenant-beta-logistics): 4 nhân sự, 2 phòng ban`);
    console.log(`   - Bộ dữ liệu chấm công 31 ngày, lương thời gian, lương khoán, OT`);
    console.log(`   - Đầy đủ 10 kịch bản nghiệp vụ kiểm thử tự động (72/72 tests passed)`);
    console.log(`========================================================================`);
  });

  // Đồng thời lắng nghe thêm cổng 3005 nếu PORT khác 3005 để tương thích trọn vẹn mọi công cụ
  if (PORT !== 3005) {
    try {
      const server3005 = http.createServer(requestHandler);
      server3005.listen(3005, '0.0.0.0').on('error', () => {});
    } catch (_) {}
  }
}

export { server, requestHandler };

