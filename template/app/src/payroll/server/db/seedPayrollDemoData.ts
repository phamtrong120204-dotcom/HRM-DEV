import type { DatabaseStore } from './tenantScopedRepository.ts';
import type {
  Tenant,
  Department,
  Shift,
  Employee,
  CompanySetting,
  PayrollPeriod,
} from '../../types.ts';

/**
 * Hàm khởi tạo dữ liệu giả lập (Synthetic Demo Data) cho 2 doanh nghiệp độc lập
 * Tuyệt đối không chứa thông tin thật hoặc dữ liệu PII nhạy cảm của người dùng thực.
 */
export function seedDemoData(db: DatabaseStore): {
  tenantA: Tenant;
  tenantB: Tenant;
  userOwnerA: { id: string; email: string };
  userAccountantA: { id: string; email: string };
  userEmployeeA: { id: string; email: string };
  userOwnerB: { id: string; email: string };
  userEmployeeB: { id: string; email: string };
} {
  // ==========================================================
  // 1. TÀI KHOẢN NGƯỜI DÙNG GIẢ LẬP (MOCK USERS)
  // ==========================================================
  const userOwnerA = { id: 'usr_owner_a', email: 'owner@alpha-tech.test' };
  const userAccountantA = { id: 'usr_acct_a', email: 'accountant@alpha-tech.test' };
  const userEmployeeA = { id: 'usr_emp_a', email: 'cuong.le@alpha-tech.test' };

  const userOwnerB = { id: 'usr_owner_b', email: 'director@beta-garment.test' };
  const userEmployeeB = { id: 'usr_emp_b', email: 'nam.hoang@beta-garment.test' };

  // ==========================================================
  // 2. DOANH NGHIỆP A: CÔNG TY CỔ PHẦN CÔNG NGHỆ ALPHA
  // ==========================================================
  const tenantA: Tenant = {
    id: 'tenant_alpha_tech_001',
    name: 'Công ty Cổ phần Công nghệ Alpha',
    slug: 'alpha-tech',
    taxId: '0109999888',
    address: 'Tầng 12, Tòa nhà Công nghệ, Cầu Giấy, Hà Nội',
    phoneNumber: '024-3999-8888',
    email: 'contact@alpha-tech.test',
    website: 'https://alpha-tech.test',
    isActive: true,
    subscriptionTier: 'pro',
  };
  db.tenants.set(tenantA.id, tenantA);

  // Memberships Doanh nghiệp A
  db.memberships.set('mem_a_1', { id: 'mem_a_1', userId: userOwnerA.id, tenantId: tenantA.id, role: 'OWNER' });
  db.memberships.set('mem_a_2', { id: 'mem_a_2', userId: userAccountantA.id, tenantId: tenantA.id, role: 'ACCOUNTANT' });
  db.memberships.set('mem_a_3', { id: 'mem_a_3', userId: userEmployeeA.id, tenantId: tenantA.id, role: 'EMPLOYEE' });

  // Phòng ban Doanh nghiệp A
  const deptA1: Department = { id: 'dept_a_tech', tenantId: tenantA.id, name: 'Phòng Kỹ thuật & Công nghệ', code: 'TECH' };
  const deptA2: Department = { id: 'dept_a_sales', tenantId: tenantA.id, name: 'Phòng Kinh doanh & Tiếp thị', code: 'SALES' };
  db.departments.set(deptA1.id, deptA1);
  db.departments.set(deptA2.id, deptA2);

  // Ca làm việc Doanh nghiệp A
  const shiftA1: Shift = {
    id: 'shift_a_hc',
    tenantId: tenantA.id,
    name: 'Ca hành chính chuẩn',
    code: 'HC',
    startTime: '08:30',
    endTime: '17:30',
    breakMinutes: 60,
    workUnits: 1.0,
    isOvertime: false,
    overtimeRate: 1.5,
    color: '#2563EB',
    isActive: true,
  };
  db.shifts.set(shiftA1.id, shiftA1);

  // Nhân sự Doanh nghiệp A
  const employeesA: Employee[] = [
    {
      id: 'emp_a_001',
      tenantId: tenantA.id,
      code: 'NV001',
      fullName: 'Nguyễn Văn Alpha',
      gender: 'Nam',
      departmentId: deptA1.id,
      departmentName: deptA1.name,
      jobTitle: 'Tổng Giám đốc',
      startDate: '2020-01-15',
      status: 'WORKING',
      baseSalary: 35000000,
      insuranceSalary: 35000000,
      taxableAllowance: 5000000,
      nonTaxableAllowance: 730000,
      attendanceAllowance: 1000000,
      seniorityAllowancePerYear: 500000,
      gasAllowance: 1000000,
      pieceRateUnitPrice: 0,
      dependentsCount: 2,
      bankName: 'Vietcombank',
      bankAccountNumber: '0011004455667',
    },
    {
      id: 'emp_a_002',
      tenantId: tenantA.id,
      code: 'NV002',
      fullName: 'Trần Thị Bình',
      gender: 'Nữ',
      departmentId: deptA1.id,
      departmentName: deptA1.name,
      jobTitle: 'Kế toán trưởng',
      startDate: '2021-03-01',
      status: 'WORKING',
      baseSalary: 22000000,
      insuranceSalary: 22000000,
      taxableAllowance: 2000000,
      nonTaxableAllowance: 730000,
      attendanceAllowance: 800000,
      seniorityAllowancePerYear: 300000,
      gasAllowance: 500000,
      pieceRateUnitPrice: 0,
      dependentsCount: 1,
      bankName: 'Techcombank',
      bankAccountNumber: '19033445566778',
    },
    {
      id: 'emp_a_003',
      tenantId: tenantA.id,
      userId: userEmployeeA.id, // Liên kết self-service với userEmployeeA
      code: 'NV003',
      fullName: 'Lê Hoàng Cường',
      gender: 'Nam',
      departmentId: deptA1.id,
      departmentName: deptA1.name,
      jobTitle: 'Kỹ sư phần mềm cao cấp',
      startDate: '2022-06-15',
      status: 'WORKING',
      baseSalary: 18000000,
      insuranceSalary: 18000000,
      taxableAllowance: 1500000,
      nonTaxableAllowance: 730000,
      attendanceAllowance: 500000,
      seniorityAllowancePerYear: 200000,
      gasAllowance: 500000,
      pieceRateUnitPrice: 0,
      dependentsCount: 0,
      bankName: 'MBBank',
      bankAccountNumber: '0888123456789',
    },
    {
      id: 'emp_a_004',
      tenantId: tenantA.id,
      code: 'NV004',
      fullName: 'Phạm Thị Dung',
      gender: 'Nữ',
      departmentId: deptA2.id,
      departmentName: deptA2.name,
      jobTitle: 'Chuyên viên Kinh doanh',
      startDate: '2023-09-01',
      status: 'WORKING',
      baseSalary: 12000000,
      insuranceSalary: 12000000,
      taxableAllowance: 3000000,
      nonTaxableAllowance: 730000,
      attendanceAllowance: 500000,
      seniorityAllowancePerYear: 0,
      gasAllowance: 800000,
      pieceRateUnitPrice: 0,
      dependentsCount: 0,
      bankName: 'ACB',
      bankAccountNumber: '2233445566',
    },
  ];

  for (const emp of employeesA) {
    db.employees.set(emp.id, emp);
  }

  // Cấu hình công ty A
  const settingA: CompanySetting = {
    id: `setting_${tenantA.id}`,
    tenantId: tenantA.id,
    standardWorkingDays: 26,
    standardWorkingHours: 8,
    overtimeRateNormal: 1.5,
    overtimeRateWeekend: 2.0,
    overtimeRateHoliday: 3.0,
    maxAllowedUnpaidDays: 0,
    weekendDaysSetting: 'CN',
    baseSalaryForInsuranceCap: 2340000,
    regionMinimumWageCap: 4960000,
    bhxhEmployeeRate: 8.0,
    bhytEmployeeRate: 1.5,
    bhtnEmployeeRate: 1.0,
    bhxhEmployerRate: 17.5,
    bhytEmployerRate: 3.0,
    bhtnEmployerRate: 1.0,
    tradeUnionEmployerRate: 2.0,
    personalTaxDeduction: 11000000,
    dependentTaxDeduction: 4400000,
    taxBracketVersion: 'LEGACY_7_TIER',
    signatoryCreatorTitle: 'Người lập biểu',
    signatoryAccountantTitle: 'Kế toán trưởng',
    signatoryDirectorTitle: 'Tổng Giám đốc',
  };
  db.companySettings.set(tenantA.id, settingA);

  // Kỳ lương tháng 2026-03 của Doanh nghiệp A
  const periodA: PayrollPeriod = {
    id: `period_${tenantA.id}_2026-03`,
    tenantId: tenantA.id,
    yearMonth: '2026-03',
    status: 'DRAFT',
    standardWorkingDays: 26,
    standardWorkingHours: 8,
    totalGrossSalary: 0,
    totalNetSalary: 0,
    totalTaxAmount: 0,
    totalEmployeeInsurance: 0,
    totalEmployerCost: 0,
    employeeCount: 4,
    approvedByUserId: null,
    approvedAt: null,
    lockedAt: null,
  };
  db.payrollPeriods.set(periodA.id, periodA);

  // ==========================================================
  // 3. DOANH NGHIỆP B: CÔNG TY TNHH MAY MẶC DỆT KIM BETA
  // ==========================================================
  const tenantB: Tenant = {
    id: 'tenant_beta_garment_002',
    name: 'Công ty TNHH May mặc Dệt kim Beta',
    slug: 'beta-garment',
    taxId: '0308888777',
    address: 'Khu Công nghiệp Tân Bình, TP. Hồ Chí Minh',
    phoneNumber: '028-3888-7777',
    email: 'info@beta-garment.test',
    website: 'https://beta-garment.test',
    isActive: true,
    subscriptionTier: 'starter',
  };
  db.tenants.set(tenantB.id, tenantB);

  // Memberships Doanh nghiệp B
  db.memberships.set('mem_b_1', { id: 'mem_b_1', userId: userOwnerB.id, tenantId: tenantB.id, role: 'OWNER' });
  db.memberships.set('mem_b_2', { id: 'mem_b_2', userId: userEmployeeB.id, tenantId: tenantB.id, role: 'EMPLOYEE' });

  // Phòng ban Doanh nghiệp B
  const deptB1: Department = { id: 'dept_b_may1', tenantId: tenantB.id, name: 'Phân xưởng May 1', code: 'MAY1' };
  const deptB2: Department = { id: 'dept_b_cat', tenantId: tenantB.id, name: 'Tổ Cắt & Trải vải', code: 'CAT' };
  db.departments.set(deptB1.id, deptB1);
  db.departments.set(deptB2.id, deptB2);

  // Ca làm việc Doanh nghiệp B
  const shiftB1: Shift = {
    id: 'shift_b_ca1',
    tenantId: tenantB.id,
    name: 'Ca sản xuất sáng',
    code: 'CA1',
    startTime: '06:00',
    endTime: '14:00',
    breakMinutes: 45,
    workUnits: 1.0,
    isOvertime: false,
    overtimeRate: 1.5,
    color: '#059669',
    isActive: true,
  };
  db.shifts.set(shiftB1.id, shiftB1);

  // Nhân sự Doanh nghiệp B (Có nhân sự làm sản phẩm và nhân sự nghỉ không lương 15 ngày)
  const employeesB: Employee[] = [
    {
      id: 'emp_b_001',
      tenantId: tenantB.id,
      code: 'NVB01',
      fullName: 'Đỗ Thị Mai',
      gender: 'Nữ',
      departmentId: deptB1.id,
      departmentName: deptB1.name,
      jobTitle: 'Quản đốc phân xưởng',
      startDate: '2019-05-10',
      status: 'WORKING',
      baseSalary: 16000000,
      insuranceSalary: 16000000,
      taxableAllowance: 2000000,
      nonTaxableAllowance: 730000,
      attendanceAllowance: 600000,
      seniorityAllowancePerYear: 300000,
      gasAllowance: 400000,
      pieceRateUnitPrice: 0,
      dependentsCount: 1,
      bankName: 'BIDV',
      bankAccountNumber: '12210000998877',
    },
    {
      id: 'emp_b_002',
      tenantId: tenantB.id,
      userId: userEmployeeB.id, // Liên kết self-service với userEmployeeB
      code: 'NVB02',
      fullName: 'Hoàng Văn Nam',
      gender: 'Nam',
      departmentId: deptB1.id,
      departmentName: deptB1.name,
      jobTitle: 'Công nhân may chuyên chuyền',
      startDate: '2023-02-15',
      status: 'WORKING',
      baseSalary: 5200000,
      insuranceSalary: 5200000,
      taxableAllowance: 0,
      nonTaxableAllowance: 730000,
      attendanceAllowance: 500000,
      seniorityAllowancePerYear: 0,
      gasAllowance: 300000,
      pieceRateUnitPrice: 4500, // Đơn giá sản phẩm: 4.500 đ / cái
      dependentsCount: 0,
      bankName: 'Agribank',
      bankAccountNumber: '6460205123456',
    },
    {
      id: 'emp_b_003',
      tenantId: tenantB.id,
      code: 'NVB03',
      fullName: 'Bùi Văn Phát',
      gender: 'Nam',
      departmentId: deptB2.id,
      departmentName: deptB2.name,
      jobTitle: 'Thợ phụ cắt vải',
      startDate: '2024-01-10',
      status: 'WORKING',
      baseSalary: 6000000,
      insuranceSalary: 6000000,
      taxableAllowance: 0,
      nonTaxableAllowance: 730000,
      attendanceAllowance: 500000,
      seniorityAllowancePerYear: 0,
      gasAllowance: 300000,
      pieceRateUnitPrice: 0,
      dependentsCount: 0,
      bankName: 'Sacombank',
      bankAccountNumber: '060123456789',
    },
  ];

  for (const emp of employeesB) {
    db.employees.set(emp.id, emp);
  }

  // Cấu hình công ty B
  const settingB: CompanySetting = {
    id: `setting_${tenantB.id}`,
    tenantId: tenantB.id,
    standardWorkingDays: 26,
    standardWorkingHours: 8,
    overtimeRateNormal: 1.5,
    overtimeRateWeekend: 2.0,
    overtimeRateHoliday: 3.0,
    maxAllowedUnpaidDays: 0,
    weekendDaysSetting: 'CN',
    baseSalaryForInsuranceCap: 2340000,
    regionMinimumWageCap: 4960000,
    bhxhEmployeeRate: 8.0,
    bhytEmployeeRate: 1.5,
    bhtnEmployeeRate: 1.0,
    bhxhEmployerRate: 17.5,
    bhytEmployerRate: 3.0,
    bhtnEmployerRate: 1.0,
    tradeUnionEmployerRate: 2.0,
    personalTaxDeduction: 11000000,
    dependentTaxDeduction: 4400000,
    taxBracketVersion: 'LEGACY_7_TIER',
    signatoryCreatorTitle: 'Người lập biểu',
    signatoryAccountantTitle: 'Kế toán trưởng',
    signatoryDirectorTitle: 'Giám đốc Điều hành',
  };
  db.companySettings.set(tenantB.id, settingB);

  // Kỳ lương tháng 2026-03 của Doanh nghiệp B
  const periodB: PayrollPeriod = {
    id: `period_${tenantB.id}_2026-03`,
    tenantId: tenantB.id,
    yearMonth: '2026-03',
    status: 'DRAFT',
    standardWorkingDays: 26,
    standardWorkingHours: 8,
    totalGrossSalary: 0,
    totalNetSalary: 0,
    totalTaxAmount: 0,
    totalEmployeeInsurance: 0,
    totalEmployerCost: 0,
    employeeCount: 3,
    approvedByUserId: null,
    approvedAt: null,
    lockedAt: null,
  };
  db.payrollPeriods.set(periodB.id, periodB);

  return {
    tenantA,
    tenantB,
    userOwnerA,
    userAccountantA,
    userEmployeeA,
    userOwnerB,
    userEmployeeB,
  };
}
