import type { CompanySetting, Employee } from '../../types.ts';
import type {
  StatutoryInsuranceRule,
  StatutoryTaxRule,
} from '../rules/statutoryRules.ts';
import {
  STATUTORY_INSURANCE_RULE_2024_ACTIVE,
  STATUTORY_TAX_RULE_LEGACY_7_TIER,
} from '../rules/statutoryRules.ts';

export interface CalculationAttendanceInput {
  actualWorkDays: number;
  paidLeaveDays: number;
  holidayDays: number;
  businessTripDays: number;
  paidDaysCount: number;
  unpaidLeaveDays: number;
  overtimeHours: number;
}

export interface CalculationAdjustmentInput {
  pieceRateQuantity?: number;
  pieceRateUnitPriceOverride?: number;
  bonusAmount?: number;
  advancePayment?: number;
  otherDeductions?: number;
}

export interface CalculationResult {
  // 1. Lương thời gian
  standardWorkingDays: number;
  dailyRate: number;
  hourlyRate: number;
  timeBasedSalary: number;

  // 2. Lương sản phẩm
  pieceRateQuantity: number;
  pieceRateUnitPrice: number;
  pieceRateSalary: number;

  // 3. Phụ cấp chi tiết
  lunchAllowanceTotal: number;
  lunchAllowanceTaxExempt: number;
  lunchAllowanceTaxable: number;
  seniorityYears: number;
  seniorityAllowance: number;
  attendanceAllowance: number;
  isAttendanceQualified: boolean;
  phoneAllowance: number;
  gasAllowance: number;
  housingAllowance: number;
  otherTaxableAllowances: number;
  totalAllowances: number;

  // 4. Làm thêm giờ (OT)
  overtimeHours: number;
  overtimeSalary: number;
  overtimeTaxableSalary: number;
  overtimeTaxExemptSalary: number;

  // 5. Thưởng & Tổng Gross
  bonusAmount: number;
  grossSalary: number;

  // 6. Bảo hiểm bắt buộc
  insuranceSalaryBase: number;
  isInsuranceExempt14Days: boolean;
  cappedBhxhBase: number;
  cappedBhtnBase: number;
  employeeInsurance: {
    bhxh: number;
    bhyt: number;
    bhtn: number;
    total: number;
  };
  employerInsurance: {
    bhxh: number;
    bhyt: number;
    bhtn: number;
    tradeUnion: number;
    total: number;
  };
  totalEmployerCost: number;
  totalCompanyExpense: number;

  // 7. Thuế TNCN
  taxableIncome: number;
  dependentsCount: number;
  familyDeductions: {
    personal: number;
    dependents: number;
    total: number;
  };
  assessableIncome: number;
  personalIncomeTax: number;
  taxBracketsBreakdown: { bracketIndex: number; taxableInBracket: number; rate: number; taxAmount: number }[];

  // 8. Tạm ứng, Khấu trừ & Net
  advancePayment: number;
  otherDeductions: number;
  totalDeductions: number;
  netSalary: number;

  // 9. Bản chụp truy vết (Audit & Traceability Snapshot)
  snapshot: {
    calculatedAt: string;
    engineVersion: string;
    taxRuleVersion: string;
    insuranceRuleVersion: string;
    formulaExplanation: string;
  };
}

/**
 * Quy tắc làm tròn số tiền tệ theo cấu hình doanh nghiệp (Rounding Rules)
 */
export function roundCurrency(amount: number, rule: 'ROUND_1000' | 'ROUND_100' | 'NO_ROUND' = 'ROUND_1000'): number {
  if (isNaN(amount) || !isFinite(amount)) return 0;
  if (rule === 'ROUND_1000') {
    return Math.round(amount / 1000) * 1000;
  }
  if (rule === 'ROUND_100') {
    return Math.round(amount / 100) * 100;
  }
  return Math.round(amount); // Đồng VND không có phần lẻ
}

/**
 * Tính số năm thâm niên làm việc chính xác đến ngày
 */
export function calculateSeniorityYears(startDateStr?: string | null, targetYearMonth?: string): number {
  if (!startDateStr || !targetYearMonth) return 0;
  const [y, m] = targetYearMonth.split('-').map(Number);
  const endOfMonth = new Date(y, m, 0);
  const start = new Date(startDateStr);
  if (isNaN(start.getTime())) return 0;

  let years = endOfMonth.getFullYear() - start.getFullYear();
  if (
    endOfMonth.getMonth() < start.getMonth() ||
    (endOfMonth.getMonth() === start.getMonth() && endOfMonth.getDate() < start.getDate())
  ) {
    years--;
  }
  return Math.max(0, years);
}

/**
 * ENGINE TÍNH TOÁN LƯƠNG XÁC ĐỊNH (PURE DETERMINISTIC CALCULATION ENGINE)
 * Không có side-effects, có thể kiểm thử lặp lại độc lập 100%.
 */
export function calculateEmployeePayroll(params: {
  employee: Employee;
  attendance: CalculationAttendanceInput;
  adjustments?: CalculationAdjustmentInput;
  companySetting?: Partial<CompanySetting>;
  taxRule?: StatutoryTaxRule;
  insuranceRule?: StatutoryInsuranceRule;
  yearMonth: string;
}): CalculationResult {
  const {
    employee,
    attendance,
    adjustments = {},
    companySetting = {},
    taxRule = STATUTORY_TAX_RULE_LEGACY_7_TIER,
    insuranceRule = STATUTORY_INSURANCE_RULE_2024_ACTIVE,
    yearMonth,
  } = params;

  const roundingRule = (companySetting.salaryRoundingRule as any) || 'ROUND_1000';
  const standardDays = companySetting.standardWorkingDays || 26;
  const standardHours = companySetting.standardWorkingHours || 8;

  // 1. Lương thời gian
  const baseSalary = Math.max(0, employee.baseSalary || 0);
  const dailyRate = standardDays > 0 ? baseSalary / standardDays : 0;
  const hourlyRate = standardHours > 0 ? dailyRate / standardHours : 0;
  const isPieceRate = employee.salaryType === 'PIECE_RATE';
  const timeBasedSalary = isPieceRate ? 0 : roundCurrency(dailyRate * attendance.paidDaysCount, roundingRule);

  // 2. Lương sản phẩm
  const pieceRateQuantity = Math.max(0, adjustments.pieceRateQuantity || 0);
  const pieceRateUnitPrice =
    adjustments.pieceRateUnitPriceOverride !== undefined && adjustments.pieceRateUnitPriceOverride > 0
      ? adjustments.pieceRateUnitPriceOverride
      : Math.max(0, employee.pieceRateUnitPrice || 0);
  const pieceRateSalary = isPieceRate ? roundCurrency(pieceRateQuantity * pieceRateUnitPrice, roundingRule) : 0;

  // 3. Phụ cấp chính sách
  // Phụ cấp ăn trưa: Trần miễn thuế tối đa 730.000đ/tháng (Thông tư 26/2015/TT-BTC)
  // Chỉ hưởng phụ cấp ăn trưa khi có ngày làm việc thực tế
  const configuredLunch = employee.allowances?.lunch !== undefined
    ? employee.allowances.lunch
    : (employee as any).nonTaxableAllowance !== undefined
      ? (employee as any).nonTaxableAllowance
      : 730_000;
  const rawLunchAllowance = attendance.actualWorkDays > 0 ? Math.max(0, configuredLunch) : 0;
  const lunchExemptCap = companySetting.lunchAllowanceTaxExemptLimit ?? 730_000;
  const lunchAllowanceTaxExempt = Math.min(rawLunchAllowance, lunchExemptCap);
  const lunchAllowanceTaxable = Math.max(0, rawLunchAllowance - lunchAllowanceTaxExempt);

  // Phụ cấp thâm niên
  const seniorityYears = calculateSeniorityYears(employee.startDate, yearMonth);
  const seniorityRatePerYear = employee.allowances?.seniority ?? (employee as any).seniorityAllowancePerYear ?? 0;
  const seniorityAllowance = seniorityYears * seniorityRatePerYear;

  // Phụ cấp chuyên cần: Kiểm tra số ngày nghỉ không lương
  const maxAllowedUnpaid = companySetting.maxAllowedUnpaidDays ?? 0;
  const isAttendanceQualified = attendance.unpaidLeaveDays <= maxAllowedUnpaid;
  const attendanceAllowance = isAttendanceQualified ? Math.max(0, employee.allowances?.attendanceBonus ?? (employee as any).attendanceAllowance ?? 0) : 0;

  const phoneAllowance = Math.max(0, employee.allowances?.phone ?? (employee as any).phoneAllowance ?? 0);
  const gasAllowance = Math.max(0, employee.allowances?.fuel ?? (employee as any).gasAllowance ?? 0);
  const housingAllowance = Math.max(0, employee.allowances?.housing ?? (employee as any).housingAllowance ?? 0);
  const otherTaxableAllowances = 0;

  const totalAllowances =
    rawLunchAllowance +
    seniorityAllowance +
    attendanceAllowance +
    phoneAllowance +
    gasAllowance +
    housingAllowance +
    otherTaxableAllowances;

  // 4. Tiền làm thêm giờ (OT)
  const overtimeHours = Math.max(0, attendance.overtimeHours || 0);
  const otMultiplier = companySetting.overtimeRateNormal || 1.5;
  const overtimeSalary = roundCurrency(hourlyRate * overtimeHours * otMultiplier, roundingRule);

  let overtimeTaxExemptSalary = 0;
  let overtimeTaxableSalary = overtimeSalary;

  if (taxRule.overtimeTaxExemptionMode === 'FULL_OT_EXEMPT') {
    // Dự thảo đề xuất 2026: Miễn toàn bộ tiền OT
    overtimeTaxExemptSalary = overtimeSalary;
    overtimeTaxableSalary = 0;
  } else {
    // Quy định hiện hành Thông tư 111/2013: Chỉ miễn phần chênh lệch cao hơn đơn giá ban ngày
    const standardPart = roundCurrency(hourlyRate * overtimeHours * 1.0, roundingRule);
    overtimeTaxExemptSalary = Math.max(0, overtimeSalary - standardPart);
    overtimeTaxableSalary = standardPart;
  }

  // 5. Thưởng & Tổng thu nhập (Gross)
  const bonusAmount = Math.max(0, adjustments.bonusAmount || 0);
  const grossSalary = timeBasedSalary + pieceRateSalary + totalAllowances + overtimeSalary + bonusAmount;

  // 6. Trích nộp bảo hiểm bắt buộc
  // Quy tắc 14 ngày Luật BHXH: Nếu nghỉ không lương >= 14 ngày trong tháng hoặc lương BH = 0 -> Không đóng BH
  const insuranceSalaryBase = Math.max(0, employee.insuranceSalary || 0);
  const isInsuranceExempt14Days =
    attendance.unpaidLeaveDays >= insuranceRule.unpaidLeaveDaysThresholdForExemption || insuranceSalaryBase === 0;

  let cappedBhxhBase = 0;
  let cappedBhtnBase = 0;
  let empBhxh = 0;
  let empBhyt = 0;
  let empBhtn = 0;
  let erBhxh = 0;
  let erBhyt = 0;
  let erBhtn = 0;
  let erTradeUnion = 0;

  if (!isInsuranceExempt14Days) {
    const maxBhxhCap = 20 * insuranceRule.baseSalaryForCap;
    const maxBhtnCap = 20 * insuranceRule.regionMinimumWageRegion1;

    cappedBhxhBase = Math.min(insuranceSalaryBase, maxBhxhCap);
    cappedBhtnBase = Math.min(insuranceSalaryBase, maxBhtnCap);

    empBhxh = roundCurrency(cappedBhxhBase * (insuranceRule.employeeBhxhRate / 100), roundingRule);
    empBhyt = roundCurrency(cappedBhxhBase * (insuranceRule.employeeBhytRate / 100), roundingRule);
    empBhtn = roundCurrency(cappedBhtnBase * (insuranceRule.employeeBhtnRate / 100), roundingRule);

    erBhxh = roundCurrency(cappedBhxhBase * (insuranceRule.employerBhxhRate / 100), roundingRule);
    erBhyt = roundCurrency(cappedBhxhBase * (insuranceRule.employerBhytRate / 100), roundingRule);
    erBhtn = roundCurrency(cappedBhtnBase * (insuranceRule.employerBhtnRate / 100), roundingRule);
    erTradeUnion = roundCurrency(cappedBhxhBase * (insuranceRule.employerTradeUnionRate / 100), roundingRule);
  }

  const totalEmployeeInsurance = empBhxh + empBhyt + empBhtn;
  const totalEmployerCost = erBhxh + erBhyt + erBhtn + erTradeUnion;
  const totalCompanyExpense = grossSalary + totalEmployerCost;

  // 7. Thuế Thu Nhập Cá Nhân (PIT)
  // Thu nhập chịu thuế = Gross - Khoản miễn thuế (Ăn trưa trong hạn mức 730k, OT phần miễn thuế)
  const nonTaxableDeductions = lunchAllowanceTaxExempt + overtimeTaxExemptSalary;
  const taxableIncome = Math.max(0, grossSalary - nonTaxableDeductions);

  const dependentsCount = Math.max(0, (employee as any).dependentsCount ?? employee.taxDependentsCount ?? 0);
  const personalDeduction = taxRule.personalDeductionMonthly;
  const dependentDeduction = dependentsCount * taxRule.dependentDeductionMonthly;
  const totalFamilyDeduction = personalDeduction + dependentDeduction;

  const assessableIncome = Math.max(0, taxableIncome - totalEmployeeInsurance - totalFamilyDeduction);

  let personalIncomeTax = 0;
  let previousLimit = 0;
  const taxBracketsBreakdown: { bracketIndex: number; taxableInBracket: number; rate: number; taxAmount: number }[] = [];

  for (let i = 0; i < taxRule.brackets.length; i++) {
    const b = taxRule.brackets[i];
    if (assessableIncome <= previousLimit) break;

    const taxableInBracket = Math.min(assessableIncome, b.limit) - previousLimit;
    const bracketTax = roundCurrency(taxableInBracket * b.rate, roundingRule);
    personalIncomeTax += bracketTax;

    taxBracketsBreakdown.push({
      bracketIndex: i + 1,
      taxableInBracket,
      rate: b.rate,
      taxAmount: bracketTax,
    });

    previousLimit = b.limit;
  }

  // 8. Tạm ứng, Khấu trừ khác & Thực lĩnh
  const advancePayment = Math.max(0, adjustments.advancePayment || 0);
  const otherDeductions = Math.max(0, adjustments.otherDeductions || 0);
  const totalDeductions = totalEmployeeInsurance + personalIncomeTax + advancePayment + otherDeductions;
  const netSalary = Math.max(0, grossSalary - totalDeductions);

  // 9. Bản chụp truy vết (Snapshot)
  const formulaExplanation = [
    `1. Lương thời gian: ${baseSalary.toLocaleString()}đ / ${standardDays} ngày x ${attendance.paidDaysCount} công = ${timeBasedSalary.toLocaleString()}đ.`,
    `2. Phụ cấp chính sách: Ăn trưa (${rawLunchAllowance.toLocaleString()}đ, miễn thuế ${lunchAllowanceTaxExempt.toLocaleString()}đ), Thâm niên (${seniorityAllowance.toLocaleString()}đ), Chuyên cần (${attendanceAllowance.toLocaleString()}đ).`,
    `3. Làm thêm giờ (OT): ${overtimeHours}h = ${overtimeSalary.toLocaleString()}đ (Miễn thuế: ${overtimeTaxExemptSalary.toLocaleString()}đ, Tính thuế: ${overtimeTaxableSalary.toLocaleString()}đ).`,
    `4. Tổng thu nhập (Gross): ${grossSalary.toLocaleString()}đ.`,
    `5. Bảo hiểm NLĐ: BHXH (${empBhxh.toLocaleString()}đ) + BHYT (${empBhyt.toLocaleString()}đ) + BHTN (${empBhtn.toLocaleString()}đ) = ${totalEmployeeInsurance.toLocaleString()}đ. (${isInsuranceExempt14Days ? 'Miễn đóng do nghỉ KL >= 14 ngày' : 'Áp trần tối đa theo luật'}).`,
    `6. Thuế TNCN: Thu nhập tính thuế = ${assessableIncome.toLocaleString()}đ (Giảm trừ bản thân ${personalDeduction.toLocaleString()}đ + ${dependentsCount} NPT ${dependentDeduction.toLocaleString()}đ) -> Thuế phải nộp = ${personalIncomeTax.toLocaleString()}đ.`,
    `7. Thực lĩnh (Net): ${netSalary.toLocaleString()}đ. Chi phí DN trả: ${totalCompanyExpense.toLocaleString()}đ.`,
  ].join('\n');

  return {
    standardWorkingDays: standardDays,
    dailyRate,
    hourlyRate,
    timeBasedSalary,

    pieceRateQuantity,
    pieceRateUnitPrice,
    pieceRateSalary,

    lunchAllowanceTotal: rawLunchAllowance,
    lunchAllowanceTaxExempt,
    lunchAllowanceTaxable,
    seniorityYears,
    seniorityAllowance,
    attendanceAllowance,
    isAttendanceQualified,
    phoneAllowance,
    gasAllowance,
    housingAllowance,
    otherTaxableAllowances,
    totalAllowances,

    overtimeHours,
    overtimeSalary,
    overtimeTaxableSalary,
    overtimeTaxExemptSalary,

    bonusAmount,
    grossSalary,

    insuranceSalaryBase,
    isInsuranceExempt14Days,
    cappedBhxhBase,
    cappedBhtnBase,
    employeeInsurance: {
      bhxh: empBhxh,
      bhyt: empBhyt,
      bhtn: empBhtn,
      total: totalEmployeeInsurance,
    },
    employerInsurance: {
      bhxh: erBhxh,
      bhyt: erBhyt,
      bhtn: erBhtn,
      tradeUnion: erTradeUnion,
      total: totalEmployerCost,
    },
    totalEmployerCost,
    totalCompanyExpense,

    taxableIncome,
    dependentsCount,
    familyDeductions: {
      personal: personalDeduction,
      dependents: dependentDeduction,
      total: totalFamilyDeduction,
    },
    assessableIncome,
    personalIncomeTax,
    taxBracketsBreakdown,

    advancePayment,
    otherDeductions,
    totalDeductions,
    netSalary,

    snapshot: {
      calculatedAt: new Date().toISOString(),
      engineVersion: '2.0.0-deterministic',
      taxRuleVersion: taxRule.version,
      insuranceRuleVersion: insuranceRule.version,
      formulaExplanation,
    },
  };
}
