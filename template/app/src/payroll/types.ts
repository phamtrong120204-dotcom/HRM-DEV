// Định nghĩa kiểu dữ liệu TypeScript cho toàn bộ phân hệ Chấm công & Tính lương đa doanh nghiệp

export type TenantRole =
  | 'ORG_OWNER'
  | 'ORG_ADMIN'
  | 'HR_MANAGER'
  | 'ACCOUNTANT'
  | 'DEPARTMENT_MANAGER'
  | 'EMPLOYEE'
  | 'OWNER'
  | 'ADMIN';

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  taxId?: string;
  address?: string;
  phoneNumber?: string;
  email?: string;
  website?: string;
  logoUrl?: string;
  isActive: boolean;
  subscriptionTier: 'starter' | 'pro' | 'enterprise';
}

export interface Membership {
  id: string;
  userId: string;
  tenantId: string;
  role: TenantRole;
  tenant: Tenant;
}

export type EmployeeStatus = 'WORKING' | 'PROBATION' | 'RESIGNED';

export interface Employee {
  id: string;
  tenantId: string;
  code: string; // Mã NV (NV001)
  fullName: string;
  gender: 'Nam' | 'Nữ';
  dateOfBirth?: string; // YYYY-MM-DD
  phoneNumber?: string;
  email?: string;
  idCardNumber?: string; // Số CCCD (được che trên UI)
  personalTaxCode?: string; // MST cá nhân
  departmentId?: string;
  departmentName?: string;
  jobTitle?: string;
  startDate: string; // YYYY-MM-DD
  status: EmployeeStatus;

  // Lương & phụ cấp (VND)
  baseSalary: number;
  insuranceSalary: number;
  taxableAllowance: number;
  nonTaxableAllowance: number;
  attendanceAllowance: number;
  seniorityAllowancePerYear: number;
  gasAllowance: number;
  pieceRateUnitPrice: number;

  // Khấu trừ & Thanh toán
  dependentsCount: number;
  bankName?: string;
  bankAccountNumber?: string;
}

export interface Department {
  id: string;
  tenantId: string;
  name: string;
  code: string;
  description?: string;
  employeeCount?: number;
}

export type AttendanceCode = 'X' | 'N' | 'CT' | 'P' | 'L' | 'O' | 'KP';

export interface AttendanceCodeMeta {
  code: AttendanceCode;
  name: string;
  workDay: number;      // Số ngày làm việc thực tế
  paidDay: number;      // Số ngày được hưởng lương
  unpaidDay: number;    // Số ngày nghỉ không lương
  bgColor: string;
  textColor: string;
}

export interface AttendanceRecord {
  id: string;
  tenantId: string;
  employeeId: string;
  yearMonth: string; // YYYY-MM
  day: number; // 1-31
  code?: AttendanceCode;
  overtimeHours: number;
  note?: string;
}

export interface AttendanceMonthSummary {
  employeeId: string;
  yearMonth: string;
  workDays: number;     // Tổng ngày làm thực tế
  paidLeaveDays: number;// Nghỉ phép + Lễ
  unpaidDays: number;   // Nghỉ không lương + ốm
  totalPaidDays: number;// Tổng công hưởng lương
  totalOtHours: number; // Tổng giờ làm thêm
}

export type PayrollPeriodStatus = 'DRAFT' | 'REVIEWING' | 'LOCKED' | 'PAID';

export interface PayrollPeriod {
  id: string;
  tenantId: string;
  yearMonth: string; // YYYY-MM
  status: PayrollPeriodStatus;
  standardWorkingDays: number;
  standardWorkingHours: number;
  totalGrossSalary: number;
  totalNetSalary: number;
  totalTaxAmount: number;
  totalEmployeeInsurance: number;
  totalEmployerCost: number;
  employeeCount: number;
  approvedBy?: string;
  approvedAt?: string;
  lockedAt?: string;
}

export interface PayrollRecord {
  id: string;
  tenantId: string;
  payrollPeriodId: string;
  employeeId: string;

  // Snapshot thông tin
  employeeCode: string;
  employeeName: string;
  departmentName: string;
  jobTitle: string;

  // Thu nhập theo công
  baseSalary: number;
  standardDays: number;
  actualWorkDays: number;
  paidLeaveDays: number;
  unpaidLeaveDays: number;
  paidDaysCount: number;
  timeBasedSalary: number;

  // Phụ cấp
  attendanceAllowance: number;
  isAttendanceQualified: boolean;
  seniorityAllowance: number;
  seniorityYears: number;
  gasAllowance: number;
  otherTaxableAllowance: number;
  nonTaxableAllowance: number;

  // Sản lượng & OT
  pieceRateQuantity: number;
  pieceRateUnitPrice: number;
  pieceRateSalary: number;
  overtimeHours: number;
  overtimeSalary: number;
  overtimeTaxExemptSalary: number;

  // Thưởng & Gross
  bonusAmount: number;
  grossSalary: number;

  // Bảo hiểm NLĐ đóng
  insuranceSalaryBase: number;
  isInsuranceExempt14Days: boolean;
  bhxhEmployee: number;
  bhytEmployee: number;
  bhtnEmployee: number;
  totalInsuranceEmployee: number;

  // Chi phí DN đóng thêm
  bhxhEmployer: number;
  bhytEmployer: number;
  bhtnEmployer: number;
  tradeUnionEmployer: number;
  totalEmployerCost: number;
  totalCompanyExpense: number;

  // Thuế TNCN
  taxableIncome: number;
  dependentsCount: number;
  familyDeductionAmount: number;
  assessableIncome: number;
  personalIncomeTax: number;

  // Tạm ứng & Khấu trừ
  advancePayment: number;
  otherDeductions: number;
  totalDeductions: number;
  netSalary: number; // Thực lĩnh

  // Thanh toán
  bankName?: string;
  bankAccountNumber?: string;
}

export interface CompanySetting {
  id: string;
  tenantId: string;
  standardWorkingDays: number;
  standardWorkingHours: number;
  overtimeRateNormal: number;
  overtimeRateWeekend: number;
  overtimeRateHoliday: number;
  maxAllowedUnpaidDays: number;
  weekendDaysSetting: 'CN' | 'T7CN';

  // Bảo hiểm
  baseSalaryForInsuranceCap: number;
  regionMinimumWageCap: number;
  bhxhEmployeeRate: number;
  bhytEmployeeRate: number;
  bhtnEmployeeRate: number;
  bhxhEmployerRate: number;
  bhytEmployerRate: number;
  bhtnEmployerRate: number;
  tradeUnionEmployerRate: number;

  // Thuế
  personalTaxDeduction: number;
  dependentTaxDeduction: number;
  taxBracketVersion: '2026_5_TIER' | 'LEGACY_7_TIER';

  // Người ký
  signatoryCreatorTitle: string;
  signatoryAccountantTitle: string;
  signatoryDirectorTitle: string;
}

export interface AuditLogItem {
  id: string;
  createdAt: string;
  userName: string;
  userEmail: string;
  action: string;
  entityType: string;
  entityId?: string;
  description: string;
}

export interface Shift {
  id: string;
  tenantId: string;
  name: string;
  code: string;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  workUnits: number;
  isOvertime: boolean;
  overtimeRate: number;
  color: string;
  isActive: boolean;
}

export interface WorkSchedule {
  id: string;
  tenantId: string;
  name: string;
  shiftId: string;
  departmentId?: string;
  employeeId?: string;
  appliedDays: string;
  effectiveFrom: string;
  effectiveTo?: string;
}

export type JobType =
  | 'IMPORT_ATTENDANCE'
  | 'EXPORT_PAYROLL_EXCEL'
  | 'EXPORT_BHXH_C70A'
  | 'EXPORT_TAX_05_1';

export type JobStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface ImportExportJob {
  id: string;
  tenantId: string;
  userId?: string;
  type: JobType;
  status: JobStatus;
  fileName: string;
  fileUrl?: string;
  fileSize?: number;
  mimeType?: string;
  totalRows: number;
  processedRows: number;
  errorLogJson?: string;
  createdAt: string;
  completedAt?: string;
}

