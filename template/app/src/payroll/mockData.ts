import type {
  AttendanceRecord,
  CompanySetting,
  Department,
  Employee,
  PayrollPeriod,
  Tenant
} from './types.ts';

export const IS_DEMO_MODE = true;

export const MOCK_TENANT: Tenant = {
  id: 'tenant-viet-tech',
  name: 'Công ty TNHH Công Nghệ Việt (Dữ liệu thử nghiệm)',
  slug: 'cong-ty-cong-nghe-viet',
  taxId: '0109988776',
  address: 'Tầng 8, Tòa nhà Innovation, Cầu Giấy, Hà Nội',
  phoneNumber: '024 3888 9999',
  email: 'ketoan@congngheviet.vn',
  website: 'https://congngheviet.vn',
  isActive: true,
  subscriptionTier: 'pro',
};

export const MOCK_DEPARTMENTS: Department[] = [
  { id: 'dep-bgd', tenantId: MOCK_TENANT.id, name: 'Ban Giám Đốc', code: 'BGD', description: 'Điều hành chiến lược', employeeCount: 2 },
  { id: 'dep-kt', tenantId: MOCK_TENANT.id, name: 'Kế Toán - Tài Chính', code: 'KT', description: 'Kế toán tổng hợp và tiền lương', employeeCount: 2 },
  { id: 'dep-kd', tenantId: MOCK_TENANT.id, name: 'Kinh Doanh & CSKH', code: 'KD', description: 'Phát triển thị trường', employeeCount: 3 },
  { id: 'dep-ns', tenantId: MOCK_TENANT.id, name: 'Nhân Sự & Hành Chính', code: 'NS', description: 'Tuyển dụng và chế độ nhân sự', employeeCount: 1 },
  { id: 'dep-sx', tenantId: MOCK_TENANT.id, name: 'Sản Xuất & Kỹ Thuật', code: 'SX', description: 'Gia công sản phẩm', employeeCount: 3 },
  { id: 'dep-kv', tenantId: MOCK_TENANT.id, name: 'Kho Vận & Giao Hàng', code: 'KV', description: 'Vận chuyển kho bãi', employeeCount: 2 },
];

export const MOCK_SETTINGS: CompanySetting = {
  id: 'set-1',
  tenantId: MOCK_TENANT.id,
  standardWorkingDays: 26,
  standardWorkingHours: 8,
  overtimeRateNormal: 1.5,
  overtimeRateWeekend: 2.0,
  overtimeRateHoliday: 3.0,
  maxAllowedUnpaidDays: 0,
  weekendDaysSetting: 'CN',

  baseSalaryForInsuranceCap: 2530000,
  regionMinimumWageCap: 5310000,
  bhxhEmployeeRate: 8.0,
  bhytEmployeeRate: 1.5,
  bhtnEmployeeRate: 1.0,
  bhxhEmployerRate: 17.5,
  bhytEmployerRate: 3.0,
  bhtnEmployerRate: 1.0,
  tradeUnionEmployerRate: 2.0,

  personalTaxDeduction: 15500000,
  dependentTaxDeduction: 6200000,
  taxBracketVersion: '2026_5_TIER',

  signatoryCreatorTitle: 'Người lập biểu',
  signatoryAccountantTitle: 'Kế toán trưởng',
  signatoryDirectorTitle: 'Giám đốc',
};

// Dữ liệu nhân viên mẫu (thông tin ẩn/giả định, không dùng số thật)
export const MOCK_EMPLOYEES: Employee[] = [
  {
    id: 'emp-01',
    tenantId: MOCK_TENANT.id,
    code: 'NV001',
    fullName: 'Nguyễn Văn An',
    gender: 'Nam',
    dateOfBirth: '1985-04-12',
    phoneNumber: '0912***456',
    email: 'an.nguyen@congngheviet.vn',
    idCardNumber: '001085***123',
    personalTaxCode: '8012345678',
    departmentId: 'dep-bgd',
    departmentName: 'Ban Giám Đốc',
    jobTitle: 'Giám Đốc Điều Hành',
    startDate: '2018-03-01',
    status: 'WORKING',
    baseSalary: 45000000,
    insuranceSalary: 30000000,
    taxableAllowance: 5000000,
    nonTaxableAllowance: 730000,
    attendanceAllowance: 0,
    seniorityAllowancePerYear: 0,
    gasAllowance: 1000000,
    pieceRateUnitPrice: 0,
    dependentsCount: 2,
    bankName: 'Vietcombank',
    bankAccountNumber: '001100***789',
  },
  {
    id: 'emp-02',
    tenantId: MOCK_TENANT.id,
    code: 'NV002',
    fullName: 'Trần Thị Bình',
    gender: 'Nữ',
    dateOfBirth: '1990-09-20',
    phoneNumber: '0983***789',
    email: 'binh.tran@congngheviet.vn',
    idCardNumber: '001190***456',
    personalTaxCode: '8098765432',
    departmentId: 'dep-kt',
    departmentName: 'Kế Toán - Tài Chính',
    jobTitle: 'Kế Toán Trưởng',
    startDate: '2019-06-15',
    status: 'WORKING',
    baseSalary: 22000000,
    insuranceSalary: 22000000,
    taxableAllowance: 2000000,
    nonTaxableAllowance: 730000,
    attendanceAllowance: 500000,
    seniorityAllowancePerYear: 100000,
    gasAllowance: 500000,
    pieceRateUnitPrice: 0,
    dependentsCount: 1,
    bankName: 'Techcombank',
    bankAccountNumber: '190333***555',
  },
  {
    id: 'emp-03',
    tenantId: MOCK_TENANT.id,
    code: 'NV003',
    fullName: 'Lê Hoàng Cường',
    gender: 'Nam',
    dateOfBirth: '1993-11-05',
    phoneNumber: '0904***112',
    email: 'cuong.le@congngheviet.vn',
    idCardNumber: '079193***789',
    personalTaxCode: '8123456789',
    departmentId: 'dep-kd',
    departmentName: 'Kinh Doanh & CSKH',
    jobTitle: 'Trưởng Phòng Kinh Doanh',
    startDate: '2020-01-10',
    status: 'WORKING',
    baseSalary: 25000000,
    insuranceSalary: 15000000,
    taxableAllowance: 3000000,
    nonTaxableAllowance: 730000,
    attendanceAllowance: 500000,
    seniorityAllowancePerYear: 100000,
    gasAllowance: 800000,
    pieceRateUnitPrice: 0,
    dependentsCount: 0,
    bankName: 'MB Bank',
    bankAccountNumber: '088899***222',
  },
  {
    id: 'emp-04',
    tenantId: MOCK_TENANT.id,
    code: 'NV004',
    fullName: 'Phạm Thu Dung',
    gender: 'Nữ',
    dateOfBirth: '1996-02-18',
    phoneNumber: '0977***334',
    email: 'dung.pham@congngheviet.vn',
    idCardNumber: '034196***012',
    personalTaxCode: '8234567890',
    departmentId: 'dep-ns',
    departmentName: 'Nhân Sự & Hành Chính',
    jobTitle: 'Chuyên Viên Nhân Sự',
    startDate: '2021-08-01',
    status: 'WORKING',
    baseSalary: 12000000,
    insuranceSalary: 12000000,
    taxableAllowance: 500000,
    nonTaxableAllowance: 730000,
    attendanceAllowance: 500000,
    seniorityAllowancePerYear: 50000,
    gasAllowance: 300000,
    pieceRateUnitPrice: 0,
    dependentsCount: 0,
    bankName: 'VietinBank',
    bankAccountNumber: '102005***888',
  },
  {
    id: 'emp-05',
    tenantId: MOCK_TENANT.id,
    code: 'NV005',
    fullName: 'Hoàng Đức Em',
    gender: 'Nam',
    dateOfBirth: '1995-07-22',
    phoneNumber: '0966***889',
    email: 'em.hoang@congngheviet.vn',
    idCardNumber: '022195***678',
    personalTaxCode: '8345678901',
    departmentId: 'dep-sx',
    departmentName: 'Sản Xuất & Kỹ Thuật',
    jobTitle: 'Tổ Trưởng Sản Xuất',
    startDate: '2022-04-01',
    status: 'WORKING',
    baseSalary: 11000000,
    insuranceSalary: 11000000,
    taxableAllowance: 1000000,
    nonTaxableAllowance: 730000,
    attendanceAllowance: 500000,
    seniorityAllowancePerYear: 50000,
    gasAllowance: 300000,
    pieceRateUnitPrice: 6000,
    dependentsCount: 1,
    bankName: 'BIDV',
    bankAccountNumber: '215100***123',
  },
  {
    id: 'emp-06',
    tenantId: MOCK_TENANT.id,
    code: 'NV006',
    fullName: 'Vũ Thị Gấm',
    gender: 'Nữ',
    dateOfBirth: '1998-12-30',
    phoneNumber: '0933***556',
    email: 'gam.vu@congngheviet.vn',
    idCardNumber: '031198***345',
    personalTaxCode: '8456789012',
    departmentId: 'dep-sx',
    departmentName: 'Sản Xuất & Kỹ Thuật',
    jobTitle: 'Công Nhân Kỹ Thuật',
    startDate: '2023-02-15',
    status: 'WORKING',
    baseSalary: 7500000,
    insuranceSalary: 7500000,
    taxableAllowance: 300000,
    nonTaxableAllowance: 730000,
    attendanceAllowance: 500000,
    seniorityAllowancePerYear: 50000,
    gasAllowance: 300000,
    pieceRateUnitPrice: 6000,
    dependentsCount: 0,
    bankName: 'Vietcombank',
    bankAccountNumber: '045100***999',
  },
  {
    id: 'emp-07',
    tenantId: MOCK_TENANT.id,
    code: 'NV007',
    fullName: 'Đặng Quốc Huy',
    gender: 'Nam',
    dateOfBirth: '1997-05-14',
    phoneNumber: '0988***443',
    email: 'huy.dang@congngheviet.vn',
    idCardNumber: '001197***890',
    personalTaxCode: '8567890123',
    departmentId: 'dep-kv',
    departmentName: 'Kho Vận & Giao Hàng',
    jobTitle: 'Thủ Kho',
    startDate: '2022-10-01',
    status: 'WORKING',
    baseSalary: 9500000,
    insuranceSalary: 9500000,
    taxableAllowance: 1000000,
    nonTaxableAllowance: 730000,
    attendanceAllowance: 500000,
    seniorityAllowancePerYear: 50000,
    gasAllowance: 500000,
    pieceRateUnitPrice: 0,
    dependentsCount: 0,
    bankName: 'ACB',
    bankAccountNumber: '8989***666',
  },
  {
    id: 'emp-08',
    tenantId: MOCK_TENANT.id,
    code: 'NV008',
    fullName: 'Bùi Mai Lan',
    gender: 'Nữ',
    dateOfBirth: '1999-03-25',
    phoneNumber: '0915***667',
    email: 'lan.bui@congngheviet.vn',
    idCardNumber: '025199***112',
    personalTaxCode: '8678901234',
    departmentId: 'dep-kd',
    departmentName: 'Kinh Doanh & CSKH',
    jobTitle: 'Chuyên Viên Kinh Doanh',
    startDate: '2024-05-01',
    status: 'PROBATION',
    baseSalary: 9000000,
    insuranceSalary: 0, // Đang thử việc chưa đóng BH
    taxableAllowance: 500000,
    nonTaxableAllowance: 730000,
    attendanceAllowance: 300000,
    seniorityAllowancePerYear: 0,
    gasAllowance: 500000,
    pieceRateUnitPrice: 0,
    dependentsCount: 0,
    bankName: 'Techcombank',
    bankAccountNumber: '190222***333',
  },
];

// Khởi tạo chấm công mẫu cho tháng 04/2026
export function generateMockAttendance(yearMonth: string = '2026-04'): AttendanceRecord[] {
  const records: AttendanceRecord[] = [];
  const daysInMonth = 30; // Tháng 4 có 30 ngày

  MOCK_EMPLOYEES.forEach((emp) => {
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${yearMonth}-${String(day).padStart(2, '0')}`;
      const dow = new Date(dateStr).getDay();
      const isSunday = dow === 0;

      let code: any = 'X';
      let ot = 0;

      if (isSunday) {
        code = undefined; // Ngày nghỉ tuần
      } else if (day === 30) {
        code = 'L'; // Lễ 30/4
      } else if (emp.code === 'NV006' && day >= 10 && day <= 24) {
        code = 'KP'; // Nghỉ không lương 15 ngày để test quy tắc miễn bảo hiểm 14 ngày
      } else if (emp.code === 'NV003' && (day === 5 || day === 6)) {
        code = 'CT'; // Công tác
      } else if (emp.code === 'NV004' && day === 15) {
        code = 'P'; // Nghỉ phép năm
      } else {
        code = 'X';
      }

      // Giả lập giờ làm thêm (OT)
      if (emp.departmentName === 'Sản Xuất & Kỹ Thuật' && (day === 8 || day === 16 || day === 22)) {
        ot = 4;
      }

      records.push({
        id: `att-${emp.id}-${day}`,
        tenantId: MOCK_TENANT.id,
        employeeId: emp.id,
        yearMonth,
        day,
        code,
        overtimeHours: ot,
      });
    }
  });

  return records;
}

export const MOCK_PAYROLL_PERIODS: PayrollPeriod[] = [
  {
    id: 'period-2026-04',
    tenantId: MOCK_TENANT.id,
    yearMonth: '2026-04',
    status: 'DRAFT',
    standardWorkingDays: 26,
    standardWorkingHours: 8,
    totalGrossSalary: 168500000,
    totalNetSalary: 147250000,
    totalTaxAmount: 4890000,
    totalEmployeeInsurance: 12450000,
    totalEmployerCost: 28400000,
    employeeCount: 8,
  },
  {
    id: 'period-2026-03',
    tenantId: MOCK_TENANT.id,
    yearMonth: '2026-03',
    status: 'LOCKED',
    standardWorkingDays: 26,
    standardWorkingHours: 8,
    totalGrossSalary: 164200000,
    totalNetSalary: 143800000,
    totalTaxAmount: 4620000,
    totalEmployeeInsurance: 12100000,
    totalEmployerCost: 27900000,
    employeeCount: 8,
    approvedBy: 'Nguyễn Văn An (Giám Đốc)',
    approvedAt: '2026-04-05T09:30:00Z',
    lockedAt: '2026-04-05T09:30:00Z',
  },
];
