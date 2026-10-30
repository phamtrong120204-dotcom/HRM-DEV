import type {
  AttendanceCode,
  AttendanceCodeMeta,
  CompanySetting,
  Employee,
  PayrollRecord
} from '../types.ts';

export const ATTENDANCE_CODES: Record<AttendanceCode, AttendanceCodeMeta> = {
  X: {
    code: 'X',
    name: 'Đi làm cả ngày',
    workDay: 1,
    paidDay: 1,
    unpaidDay: 0,
    bgColor: '#dcfce7',
    textColor: '#15803d',
  },
  N: {
    code: 'N',
    name: 'Làm nửa ngày',
    workDay: 0.5,
    paidDay: 0.5,
    unpaidDay: 0.5,
    bgColor: '#ccfbf1',
    textColor: '#0f766e',
  },
  CT: {
    code: 'CT',
    name: 'Đi công tác',
    workDay: 1,
    paidDay: 1,
    unpaidDay: 0,
    bgColor: '#e0f2fe',
    textColor: '#0369a1',
  },
  P: {
    code: 'P',
    name: 'Nghỉ phép năm',
    workDay: 0,
    paidDay: 1,
    unpaidDay: 0,
    bgColor: '#dbeafe',
    textColor: '#1d4ed8',
  },
  L: {
    code: 'L',
    name: 'Nghỉ lễ, Tết',
    workDay: 0,
    paidDay: 1,
    unpaidDay: 0,
    bgColor: '#ede9fe',
    textColor: '#6d28d9',
  },
  O: {
    code: 'O',
    name: 'Nghỉ ốm (BHXH trả)',
    workDay: 0,
    paidDay: 0,
    unpaidDay: 1,
    bgColor: '#fef3c7',
    textColor: '#b45309',
  },
  KP: {
    code: 'KP',
    name: 'Nghỉ không lương',
    workDay: 0,
    paidDay: 0,
    unpaidDay: 1,
    bgColor: '#fee2e2',
    textColor: '#b91c1c',
  },
};

export interface MonthlyAttendanceInput {
  actualWorkDays: number;
  paidLeaveDays: number;
  unpaidLeaveDays: number;
  paidDaysCount: number;
  overtimeHours: number;
}

export interface MonthlyAdjustmentInput {
  pieceRateQuantity?: number;
  pieceRateUnitPriceOverride?: number;
  bonusAmount?: number;
  advancePayment?: number;
  otherDeductions?: number;
}

export function calculateSeniorityYears(startDate: string, yearMonth: string): number {
  if (!startDate || !yearMonth) return 0;
  const [y, m] = yearMonth.split('-').map(Number);
  const endOfMonth = new Date(y, m, 0);
  const start = new Date(startDate);
  let years = endOfMonth.getFullYear() - start.getFullYear();
  if (
    endOfMonth.getMonth() < start.getMonth() ||
    (endOfMonth.getMonth() === start.getMonth() && endOfMonth.getDate() < start.getDate())
  ) {
    years--;
  }
  return Math.max(0, years);
}

// Biểu thuế lũy tiến từng phần 5 bậc (Dự thảo 2026)
const TAX_BRACKETS_2026 = [
  { limit: 10_000_000, rate: 0.05 },
  { limit: 30_000_000, rate: 0.10 },
  { limit: 60_000_000, rate: 0.20 },
  { limit: 100_000_000, rate: 0.30 },
  { limit: Infinity, rate: 0.35 },
];

// Biểu thuế lũy tiến từng phần 7 bậc truyền thống
const TAX_BRACKETS_LEGACY = [
  { limit: 5_000_000, rate: 0.05 },
  { limit: 10_000_000, rate: 0.10 },
  { limit: 18_000_000, rate: 0.15 },
  { limit: 32_000_000, rate: 0.20 },
  { limit: 52_000_000, rate: 0.25 },
  { limit: 80_000_000, rate: 0.30 },
  { limit: Infinity, rate: 0.35 },
];

export function calculateTax(assessableIncome: number, version: '2026_5_TIER' | 'LEGACY_7_TIER' = '2026_5_TIER'): number {
  if (assessableIncome <= 0) return 0;
  const brackets = version === '2026_5_TIER' ? TAX_BRACKETS_2026 : TAX_BRACKETS_LEGACY;

  let tax = 0;
  let previousLimit = 0;

  for (const b of brackets) {
    if (assessableIncome <= previousLimit) break;
    const taxableInBracket = Math.min(assessableIncome, b.limit) - previousLimit;
    tax += taxableInBracket * b.rate;
    previousLimit = b.limit;
  }

  return Math.round(tax);
}

export function calcEmployeePayroll(
  employee: Employee,
  att: MonthlyAttendanceInput,
  adj: MonthlyAdjustmentInput,
  settings: CompanySetting,
  yearMonth: string,
  periodId: string = 'period-1'
): PayrollRecord {
  const standardDays = settings.standardWorkingDays || 26;
  const standardHours = settings.standardWorkingHours || 8;

  // 1. Lương ngày & lương công
  const dailyRate = employee.baseSalary / standardDays;
  const hourlyRate = dailyRate / standardHours;
  const timeBasedSalary = Math.round(dailyRate * att.paidDaysCount);

  // 2. Phụ cấp thâm niên
  const seniorityYears = calculateSeniorityYears(employee.startDate, yearMonth);
  const seniorityAllowance = seniorityYears * (employee.seniorityAllowancePerYear || 0);

  // 3. Phụ cấp chuyên cần (nếu ngày nghỉ không lương <= ngưỡng cho phép)
  const isAttendanceQualified = att.unpaidLeaveDays <= (settings.maxAllowedUnpaidDays ?? 0);
  const attendanceAllowance = isAttendanceQualified ? (employee.attendanceAllowance || 0) : 0;

  // 4. Lương sản phẩm
  const pieceRateQuantity = adj.pieceRateQuantity || 0;
  const pieceRateUnitPrice = (adj.pieceRateUnitPriceOverride && adj.pieceRateUnitPriceOverride > 0)
    ? adj.pieceRateUnitPriceOverride
    : (employee.pieceRateUnitPrice || 0);
  const pieceRateSalary = Math.round(pieceRateQuantity * pieceRateUnitPrice);

  // 5. Làm thêm giờ (OT)
  const overtimeHours = att.overtimeHours || 0;
  const overtimeSalary = Math.round(hourlyRate * overtimeHours * (settings.overtimeRateNormal || 1.5));
  // Kể từ 2026: miễn toàn bộ tiền OT; trước 2026: chỉ miễn phần chênh lệch
  const isAfter2026 = yearMonth >= '2026-01';
  const overtimeTaxExemptSalary = isAfter2026
    ? overtimeSalary
    : Math.round(hourlyRate * overtimeHours * Math.max(0, (settings.overtimeRateNormal || 1.5) - 1));

  // 6. Thưởng & Tổng thu nhập (Gross)
  const bonusAmount = adj.bonusAmount || 0;
  const gasAllowance = employee.gasAllowance || 0;
  const otherTaxableAllowance = employee.taxableAllowance || 0;
  const nonTaxableAllowance = employee.nonTaxableAllowance || 0;

  const grossSalary =
    timeBasedSalary +
    attendanceAllowance +
    seniorityAllowance +
    gasAllowance +
    otherTaxableAllowance +
    nonTaxableAllowance +
    pieceRateSalary +
    overtimeSalary +
    bonusAmount;

  // 7. Bảo hiểm bắt buộc
  // Quy tắc 14 ngày: nếu nghỉ không lương >= 14 ngày hoặc không có lương BH -> không đóng BH
  const isInsuranceExempt14Days = att.unpaidLeaveDays >= 14 || !employee.insuranceSalary;
  
  // Trần bảo hiểm
  const capBHXH = 20 * (settings.baseSalaryForInsuranceCap || 2_530_000);
  const capBHTN = 20 * (settings.regionMinimumWageCap || 5_310_000);

  const baseForBHXH = Math.min(employee.insuranceSalary || 0, capBHXH);
  const baseForBHTN = Math.min(employee.insuranceSalary || 0, capBHTN);

  let bhxhEmployee = 0;
  let bhytEmployee = 0;
  let bhtnEmployee = 0;
  let bhxhEmployer = 0;
  let bhytEmployer = 0;
  let bhtnEmployer = 0;
  let tradeUnionEmployer = 0;

  if (!isInsuranceExempt14Days && employee.insuranceSalary > 0) {
    bhxhEmployee = Math.round(baseForBHXH * ((settings.bhxhEmployeeRate || 8.0) / 100));
    bhytEmployee = Math.round(baseForBHXH * ((settings.bhytEmployeeRate || 1.5) / 100));
    bhtnEmployee = Math.round(baseForBHTN * ((settings.bhtnEmployeeRate || 1.0) / 100));

    bhxhEmployer = Math.round(baseForBHXH * ((settings.bhxhEmployerRate || 17.5) / 100));
    bhytEmployer = Math.round(baseForBHXH * ((settings.bhytEmployerRate || 3.0) / 100));
    bhtnEmployer = Math.round(baseForBHTN * ((settings.bhtnEmployerRate || 1.0) / 100));
    tradeUnionEmployer = Math.round(baseForBHXH * ((settings.tradeUnionEmployerRate || 2.0) / 100));
  }

  const totalEmployeeInsurance = bhxhEmployee + bhytEmployee + bhtnEmployee;
  const totalEmployerCost = bhxhEmployer + bhytEmployer + bhtnEmployer + tradeUnionEmployer;
  const totalCompanyExpense = grossSalary + totalEmployerCost;

  // 8. Thuế thu nhập cá nhân (TNCN)
  const taxableIncome = Math.max(0, grossSalary - nonTaxableAllowance - overtimeTaxExemptSalary);
  const dependentsCount = employee.dependentsCount || 0;
  const familyDeductionAmount =
    (settings.personalTaxDeduction || 15_500_000) +
    dependentsCount * (settings.dependentTaxDeduction || 6_200_000);

  const assessableIncome = Math.max(0, taxableIncome - totalEmployeeInsurance - familyDeductionAmount);
  const personalIncomeTax = calculateTax(assessableIncome, settings.taxBracketVersion || '2026_5_TIER');

  // 9. Tạm ứng, Khấu trừ & Thực lĩnh
  const advancePayment = adj.advancePayment || 0;
  const otherDeductions = adj.otherDeductions || 0;
  const totalDeductions = totalEmployeeInsurance + personalIncomeTax + advancePayment + otherDeductions;
  const netSalary = grossSalary - totalDeductions;

  return {
    id: `rec-${employee.id}`,
    tenantId: employee.tenantId,
    payrollPeriodId: periodId,
    employeeId: employee.id,
    employeeCode: employee.code,
    employeeName: employee.fullName,
    departmentName: employee.departmentName || '',
    jobTitle: employee.jobTitle || '',

    baseSalary: employee.baseSalary,
    standardDays,
    actualWorkDays: att.actualWorkDays,
    paidLeaveDays: att.paidLeaveDays,
    unpaidLeaveDays: att.unpaidLeaveDays,
    paidDaysCount: att.paidDaysCount,
    timeBasedSalary,

    attendanceAllowance,
    isAttendanceQualified,
    seniorityAllowance,
    seniorityYears,
    gasAllowance,
    otherTaxableAllowance,
    nonTaxableAllowance,

    pieceRateQuantity,
    pieceRateUnitPrice,
    pieceRateSalary,
    overtimeHours,
    overtimeSalary,
    overtimeTaxExemptSalary,

    bonusAmount,
    grossSalary,

    insuranceSalaryBase: employee.insuranceSalary,
    isInsuranceExempt14Days,
    bhxhEmployee,
    bhytEmployee,
    bhtnEmployee,
    totalEmployeeInsurance,

    bhxhEmployer,
    bhytEmployer,
    bhtnEmployer,
    tradeUnionEmployer,
    totalEmployerCost,
    totalCompanyExpense,

    taxableIncome,
    dependentsCount,
    familyDeductionAmount,
    assessableIncome,
    personalIncomeTax,

    advancePayment,
    otherDeductions,
    totalDeductions,
    netSalary,

    bankName: employee.bankName,
    bankAccountNumber: employee.bankAccountNumber,
  };
}
