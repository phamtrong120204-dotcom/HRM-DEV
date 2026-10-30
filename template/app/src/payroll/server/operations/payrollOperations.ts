import { HttpError } from '../errors.ts';
import { z } from '../schemaValidator.ts';
import { MOCK_EMPLOYEES, MOCK_SETTINGS, MOCK_TENANT } from '../../mockData.ts';
import type { Employee, PayrollPeriod, PayrollPeriodStatus, PayrollRecord } from '../../types.ts';
import { calculateEmployeePayroll, CalculationResult } from '../engine/payrollCalculationEngine.ts';
import {
  resolveTaxRuleForPeriod,
  STATUTORY_INSURANCE_RULE_2024_ACTIVE,
  STATUTORY_TAX_RULE_LEGACY_7_TIER,
} from '../rules/statutoryRules.ts';
import {
  assertRecordTenantScope,
  requireAuthUser,
  requireTenantRole,
} from '../security/authMiddleware.ts';
import type { TenantContext } from '../security/authMiddleware.ts';
import {
  assertPeriodAllowsDataEntry,
  transitionPeriodState,
} from '../workflow/payrollPeriodManager.ts';

// ==========================================================
// ZOD SCHEMAS CHO CÁC THAO TÁC BẢNG LƯƠNG
// ==========================================================

export const getPayrollSpreadsheetSchema = z.object({
  tenantId: z.string().min(1, 'Mã doanh nghiệp không được để trống'),
  yearMonth: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Định dạng tháng phải là YYYY-MM (ví dụ: 2026-04)'),
});

export const updatePayrollAdjustmentSchema = z.object({
  tenantId: z.string().min(1),
  yearMonth: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
  employeeId: z.string().min(1),
  adjustments: z.object({
    pieceRateQuantity: z.number().min(0).optional(),
    pieceRateUnitPriceOverride: z.number().min(0).optional(),
    bonusAmount: z.number().min(0).optional(),
    advancePayment: z.number().min(0).optional(),
    otherDeductions: z.number().min(0).optional(),
    overtimeHours: z.number().min(0).max(100).optional(),
  }),
});

export const transitionPayrollStatusSchema = z.object({
  tenantId: z.string().min(1),
  yearMonth: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
  targetStatus: z.enum(['DRAFT', 'REVIEWING', 'LOCKED', 'PAID']),
  reasonComment: z.string().optional(),
  allowSimulation: z.boolean().default(false),
});

export const getEmployeeSalarySlipSchema = z.object({
  tenantId: z.string().min(1),
  employeeId: z.string().min(1),
  yearMonth: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
});

// ==========================================================
// CORE BUSINESS LOGIC FUNCTIONS (TESTABLE INDEPENDENTLY)
// ==========================================================

/**
 * Tính toán toàn bộ bảng lương của một tháng cho doanh nghiệp
 */
export function executeCalculatePayrollPeriod(params: {
  tenantContext: TenantContext;
  yearMonth: string;
  employees: Employee[];
  attendancesMap: Record<string, any>;
  adjustmentsMap: Record<string, any>;
  companySetting: any;
  period: PayrollPeriod;
  allowSimulation?: boolean;
}): { period: PayrollPeriod; records: PayrollRecord[] } {
  const {
    tenantContext,
    yearMonth,
    employees,
    attendancesMap,
    adjustmentsMap,
    companySetting,
    period,
    allowSimulation = false,
  } = params;

  // 1. Kiểm tra quyền của người dùng trong Tenant
  requireTenantRole(tenantContext, ['OWNER', 'ADMIN', 'ACCOUNTANT'], 'tính toán bảng lương');

  // 2. Không cho phép tính toán lại nếu kỳ lương đã khóa sổ
  assertPeriodAllowsDataEntry(period);

  // 3. Giải quyết quy tắc thuế & bảo hiểm hợp lệ
  const taxRule = resolveTaxRuleForPeriod(yearMonth, companySetting.taxBracketVersion, allowSimulation);
  const insuranceRule = STATUTORY_INSURANCE_RULE_2024_ACTIVE;

  // 4. Lặp qua danh sách nhân viên và tính toán độc lập
  const computedRecords: PayrollRecord[] = employees.map((emp) => {
    // Xác minh nhân viên thuộc đúng tenant
    assertRecordTenantScope(emp, tenantContext.tenantId, `Nhân viên [${emp.code}]`);

    const att = attendancesMap[emp.id] || {
      actualWorkDays: 24,
      paidLeaveDays: 2,
      holidayDays: 0,
      businessTripDays: 0,
      paidDaysCount: 26,
      unpaidLeaveDays: 0,
      overtimeHours: 0,
    };

    const adj = adjustmentsMap[emp.id] || {};

    const calcResult: CalculationResult = calculateEmployeePayroll({
      employee: emp,
      attendance: att,
      adjustments: adj,
      companySetting,
      taxRule,
      insuranceRule,
      yearMonth,
    });

    const record: PayrollRecord = {
      id: `rec_${emp.id}_${yearMonth}`,
      tenantId: tenantContext.tenantId,
      payrollPeriodId: period.id,
      employeeId: emp.id,
      employeeCode: emp.code,
      employeeName: emp.fullName || emp.name,
      departmentName: emp.departmentName || '',
      jobTitle: emp.jobTitle || emp.position || '',

      baseSalary: emp.baseSalary,
      standardDays: calcResult.standardWorkingDays,
      actualWorkDays: att.actualWorkDays,
      paidLeaveDays: att.paidLeaveDays,
      unpaidLeaveDays: att.unpaidLeaveDays,
      paidDaysCount: att.paidDaysCount,
      timeBasedSalary: calcResult.timeBasedSalary,

      attendanceAllowance: calcResult.attendanceAllowance,
      isAttendanceQualified: calcResult.isAttendanceQualified,
      seniorityAllowance: calcResult.seniorityAllowance,
      seniorityYears: calcResult.seniorityYears,
      gasAllowance: calcResult.gasAllowance,
      otherTaxableAllowance: calcResult.otherTaxableAllowances,
      nonTaxableAllowance: calcResult.lunchAllowanceTaxExempt,

      pieceRateQuantity: calcResult.pieceRateQuantity,
      pieceRateUnitPrice: calcResult.pieceRateUnitPrice,
      pieceRateSalary: calcResult.pieceRateSalary,
      overtimeHours: calcResult.overtimeHours,
      overtimeSalary: calcResult.overtimeSalary,
      overtimeTaxExemptSalary: calcResult.overtimeTaxExemptSalary,

      bonusAmount: calcResult.bonusAmount,
      grossSalary: calcResult.grossSalary,

      insuranceSalaryBase: calcResult.insuranceSalaryBase,
      isInsuranceExempt14Days: calcResult.isInsuranceExempt14Days,
      bhxhEmployee: calcResult.employeeInsurance.bhxh,
      bhytEmployee: calcResult.employeeInsurance.bhyt,
      bhtnEmployee: calcResult.employeeInsurance.bhtn,
      totalEmployeeInsurance: calcResult.employeeInsurance.total,

      bhxhEmployer: calcResult.employerInsurance.bhxh,
      bhytEmployer: calcResult.employerInsurance.bhyt,
      bhtnEmployer: calcResult.employerInsurance.bhtn,
      tradeUnionEmployer: calcResult.employerInsurance.tradeUnion,
      totalEmployerCost: calcResult.totalEmployerCost,
      totalCompanyExpense: calcResult.totalCompanyExpense,

      taxableIncome: calcResult.taxableIncome,
      dependentsCount: calcResult.dependentsCount,
      familyDeductionAmount: calcResult.familyDeductions.total,
      assessableIncome: calcResult.assessableIncome,
      personalIncomeTax: calcResult.personalIncomeTax,

      advancePayment: calcResult.advancePayment,
      otherDeductions: calcResult.otherDeductions,
      totalDeductions: calcResult.totalDeductions,
      netSalary: calcResult.netSalary,

      bankName: emp.bankAccount?.bankName || emp.bankName,
      bankAccountNumber: emp.bankAccount?.accountNumber || emp.bankAccountNumber,
    };

    return record;
  });

  // 5. Cập nhật các chỉ số tổng hợp trên kỳ lương
  const updatedPeriod: PayrollPeriod = {
    ...period,
    totalGrossSalary: computedRecords.reduce((acc, r) => acc + r.grossSalary, 0),
    totalNetSalary: computedRecords.reduce((acc, r) => acc + r.netSalary, 0),
    totalTaxAmount: computedRecords.reduce((acc, r) => acc + r.personalIncomeTax, 0),
    totalEmployeeInsurance: computedRecords.reduce((acc, r) => acc + r.totalEmployeeInsurance, 0),
    totalEmployerCost: computedRecords.reduce((acc, r) => acc + r.totalEmployerCost, 0),
    employeeCount: computedRecords.length,
  };

  return { period: updatedPeriod, records: computedRecords };
}
