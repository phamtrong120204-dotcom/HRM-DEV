import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Employee, PayrollPeriod } from '../types.ts';
import {
  calculateEmployeePayroll,
  calculateSeniorityYears,
  roundCurrency,
} from './engine/payrollCalculationEngine.ts';
import {
  executeUpdateCompanySettings,
} from './operations/settingsOperations.ts';
import {
  summarizeEmployeeMonthAttendance,
} from './operations/timekeepingOperations.ts';
import {
  assertRuleReadyForFinalLock,
  resolveTaxRuleForPeriod,
  STATUTORY_INSURANCE_RULE_2024_ACTIVE,
  STATUTORY_TAX_RULE_LEGACY_7_TIER,
  STATUTORY_TAX_RULE_PROPOSED_2026_5_TIER,
} from './rules/statutoryRules.ts';
import {
  assertRecordTenantScope,
  hasRequiredRole,
  requireAuthUser,
  requireTenantRole,
} from './security/authMiddleware.ts';
import type { TenantContext } from './security/authMiddleware.ts';
import {
  assertPeriodAllowsDataEntry,
  transitionPeriodState,
} from './workflow/payrollPeriodManager.ts';

// Helper fixtures
const MOCK_USER: any = { id: 'usr-admin-1', email: 'admin@company.com' };
const MOCK_CONTEXT: TenantContext = {
  user: MOCK_USER,
  tenantId: 'tenant-demo-1',
  role: 'ADMIN',
  membershipId: 'mem-1',
};
const MOCK_OWNER_CONTEXT: TenantContext = {
  user: { id: 'usr-owner-1', email: 'owner@company.com' } as any,
  tenantId: 'tenant-demo-1',
  role: 'OWNER',
  membershipId: 'mem-owner',
};
const MOCK_EMPLOYEE_CONTEXT: TenantContext = {
  user: { id: 'usr-emp-1', email: 'emp@company.com' } as any,
  tenantId: 'tenant-demo-1',
  role: 'EMPLOYEE',
  membershipId: 'mem-emp',
};

const SAMPLE_EMPLOYEE: Employee = {
  id: 'emp-001',
  tenantId: 'tenant-demo-1',
  code: 'NV001',
  name: 'Nguyễn Văn A',
  fullName: 'Nguyễn Văn A',
  departmentId: 'dept-kd',
  departmentName: 'Kinh Doanh',
  position: 'Chuyên viên',
  identityCard: '001099***123',
  phone: '0901234567',
  email: 'nva@company.com',
  startDate: '2021-01-15',
  status: 'WORKING',
  salaryType: 'TIME_BASED',
  baseSalary: 20_000_000,
  insuranceSalary: 15_000_000,
  pieceRateUnitPrice: 0,
  taxDependentsCount: 1,
  allowances: {
    lunch: 1_000_000, // 1tr ăn trưa (vượt 730k)
    phone: 300_000,
    fuel: 300_000,
    housing: 0,
    seniority: 200_000, // 200k/năm
    attendanceBonus: 500_000,
  },
};

const SAMPLE_PERIOD: PayrollPeriod = {
  id: 'period-2026-04',
  tenantId: 'tenant-demo-1',
  yearMonth: '2026-04',
  status: 'DRAFT',
  standardWorkingDays: 26,
  standardWorkingHours: 8,
  totalGrossSalary: 0,
  totalNetSalary: 0,
  totalTaxAmount: 0,
  totalEmployeeInsurance: 0,
  totalEmployerCost: 0,
  employeeCount: 1,
};

// ==========================================================
// SUITE 1: CÔNG THỨC CHẤM CÔNG & CA KÍP
// ==========================================================
describe('1. Timekeeping & Attendance Calculations', () => {
  it('correctly aggregates all attendance codes (X, N, CT, P, L, O, KP) into work & paid days', () => {
    const dailyRecords: any[] = [
      { day: 1, code: 'X', overtimeHours: 2 },
      { day: 2, code: 'X', overtimeHours: 0 },
      { day: 3, code: 'N', overtimeHours: 0 }, // 0.5 work, 0.5 unpaid
      { day: 4, code: 'CT', overtimeHours: 0 }, // 1.0 work/paid
      { day: 5, code: 'P', overtimeHours: 0 }, // 1.0 paid leave
      { day: 6, code: 'L', overtimeHours: 0 }, // 1.0 holiday
      { day: 7, code: 'O', overtimeHours: 0 }, // 1.0 unpaid for company
      { day: 8, code: 'KP', overtimeHours: 0 }, // 1.0 unpaid
    ];

    const result = summarizeEmployeeMonthAttendance({
      employeeId: 'emp-001',
      yearMonth: '2026-04',
      dailyRecords,
      standardDaysInMonth: 26,
    });

    // Actual work = 1(X) + 1(X) + 0.5(N) + 1(CT) = 3.5 days
    assert.equal(result.actualWorkDays, 2.5);
    assert.equal(result.businessTripDays, 1.0);
    assert.equal(result.paidLeaveDays, 1.0);
    assert.equal(result.holidayDays, 1.0);
    // Total paid days = 2.5(X) + 1.0(CT) + 1.0(P) + 1.0(L) = 5.5 days
    assert.equal(result.paidDaysCount, 5.5);
    // Unpaid days = 0.5(N) + 1.0(O) + 1.0(KP) = 2.5 days
    assert.equal(result.unpaidLeaveDays, 2.5);
    assert.equal(result.totalOtHours, 2);
  });
});

// ==========================================================
// SUITE 2: THÀNH PHẦN LƯƠNG, LÀM TRÒN & PHÂN TÁCH MIỄN THUẾ
// ==========================================================
describe('2. Salary Components, Rounding & Tax-Exempt Splits', () => {
  it('enforces exact currency rounding rules without floating-point inaccuracy', () => {
    // 1234567.89 rounded to nearest 1000 -> 1235000
    assert.equal(roundCurrency(1234567.89, 'ROUND_1000'), 1235000);
    assert.equal(roundCurrency(1234400, 'ROUND_1000'), 1234000);
    assert.equal(roundCurrency(1234567.89, 'ROUND_100'), 1234600);
    assert.equal(roundCurrency(1234567.89, 'NO_ROUND'), 1234568);
  });

  it('correctly splits lunch allowance into tax-exempt (<=730k) and taxable portion', () => {
    const res = calculateEmployeePayroll({
      employee: SAMPLE_EMPLOYEE, // Lunch allowance = 1,000,000 VND
      attendance: {
        actualWorkDays: 26,
        paidLeaveDays: 0,
        holidayDays: 0,
        businessTripDays: 0,
        paidDaysCount: 26,
        unpaidLeaveDays: 0,
        overtimeHours: 0,
      },
      yearMonth: '2026-04',
    });

    assert.equal(res.lunchAllowanceTotal, 1_000_000);
    assert.equal(res.lunchAllowanceTaxExempt, 730_000); // Capped by TT 26/2015
    assert.equal(res.lunchAllowanceTaxable, 270_000);
  });

  it('calculates seniority allowance according to exact years of service', () => {
    // Start date 2021-01-15 -> As of 2026-04 is 5 full years
    const years = calculateSeniorityYears('2021-01-15', '2026-04');
    assert.equal(years, 5);

    const res = calculateEmployeePayroll({
      employee: SAMPLE_EMPLOYEE,
      attendance: {
        actualWorkDays: 26,
        paidLeaveDays: 0,
        holidayDays: 0,
        businessTripDays: 0,
        paidDaysCount: 26,
        unpaidLeaveDays: 0,
        overtimeHours: 0,
      },
      yearMonth: '2026-04',
    });

    assert.equal(res.seniorityYears, 5);
    assert.equal(res.seniorityAllowance, 5 * 200_000); // 1,000,000 VND
  });
});

// ==========================================================
// SUITE 3: CÁC TRƯỜNG HỢP BIÊN & GIỚI HẠN PHÁP LÝ (EDGE CASES)
// ==========================================================
describe('3. Legal Boundaries & Edge Cases', () => {
  it('evaluates exact 14-day unpaid leave threshold: 13 days pays, 14 days exempts', () => {
    // Case A: 13 unpaid leave days -> Still pays statutory insurance
    const res13Days = calculateEmployeePayroll({
      employee: SAMPLE_EMPLOYEE,
      attendance: {
        actualWorkDays: 13,
        paidLeaveDays: 0,
        holidayDays: 0,
        businessTripDays: 0,
        paidDaysCount: 13,
        unpaidLeaveDays: 13,
        overtimeHours: 0,
      },
      yearMonth: '2026-04',
    });
    assert.equal(res13Days.isInsuranceExempt14Days, false);
    assert.ok(res13Days.employeeInsurance.total > 0);
    assert.ok(res13Days.totalEmployerCost > 0);

    // Case B: Exactly 14 unpaid leave days -> Completely exempt from insurance!
    const res14Days = calculateEmployeePayroll({
      employee: SAMPLE_EMPLOYEE,
      attendance: {
        actualWorkDays: 12,
        paidLeaveDays: 0,
        holidayDays: 0,
        businessTripDays: 0,
        paidDaysCount: 12,
        unpaidLeaveDays: 14,
        overtimeHours: 0,
      },
      yearMonth: '2026-04',
    });
    assert.equal(res14Days.isInsuranceExempt14Days, true);
    assert.equal(res14Days.employeeInsurance.total, 0);
    assert.equal(res14Days.totalEmployerCost, 0);
  });

  it('caps statutory insurance base at 20x base salary for high earners (e.g. 100M)', () => {
    const highEarner: Employee = {
      ...SAMPLE_EMPLOYEE,
      baseSalary: 100_000_000,
      insuranceSalary: 80_000_000, // 80M exceeds 20x base salary
    };

    const res = calculateEmployeePayroll({
      employee: highEarner,
      attendance: {
        actualWorkDays: 26,
        paidLeaveDays: 0,
        holidayDays: 0,
        businessTripDays: 0,
        paidDaysCount: 26,
        unpaidLeaveDays: 0,
        overtimeHours: 0,
      },
      yearMonth: '2026-04',
    });

    const expectedBhxhCap = 20 * STATUTORY_INSURANCE_RULE_2024_ACTIVE.baseSalaryForCap; // 20 * 2.34M = 46.8M
    assert.equal(res.cappedBhxhBase, expectedBhxhCap);
    // BHXH (8%) of 46.8M = 3,744,000 VND
    assert.equal(res.employeeInsurance.bhxh, 3_744_000);
    // BHYT (1.5%) of 46.8M = 702,000 VND
    assert.equal(res.employeeInsurance.bhyt, 702_000);
  });

  it('gracefully handles employee with zero work days (0 paid days -> 0 time-based salary)', () => {
    const res = calculateEmployeePayroll({
      employee: SAMPLE_EMPLOYEE,
      attendance: {
        actualWorkDays: 0,
        paidLeaveDays: 0,
        holidayDays: 0,
        businessTripDays: 0,
        paidDaysCount: 0,
        unpaidLeaveDays: 26,
        overtimeHours: 0,
      },
      yearMonth: '2026-04',
    });

    assert.equal(res.timeBasedSalary, 0);
    assert.equal(res.isInsuranceExempt14Days, true);
  });
});

// ==========================================================
// SUITE 4: BẢO MẬT PHÂN QUYỀN & CÔ LẬP ĐA DOANH NGHIỆP (SECURITY)
// ==========================================================
describe('4. Multi-Tenant Security & Access Control', () => {
  it('blocks cross-tenant access when record tenantId does not match user tenantId', () => {
    const foreignRecord = { id: 'emp-999', tenantId: 'tenant-other-company' };
    assert.throws(
      () => assertRecordTenantScope(foreignRecord, 'tenant-demo-1', 'Nhân viên'),
      (err: any) => err.statusCode === 403
    );
  });

  it('allows access when record tenantId matches user tenantId', () => {
    const validRecord = { id: 'emp-001', tenantId: 'tenant-demo-1' };
    const res = assertRecordTenantScope(validRecord, 'tenant-demo-1', 'Nhân viên');
    assert.equal(res.id, 'emp-001');
  });

  it('enforces role authorization: blocks EMPLOYEE from calculating or locking payroll', () => {
    assert.throws(
      () => requireTenantRole(MOCK_EMPLOYEE_CONTEXT, ['OWNER', 'ADMIN', 'ACCOUNTANT'], 'tính lương'),
      (err: any) => err.statusCode === 403
    );
  });

  it('guarantees OWNER bypasses normal role restriction checks', () => {
    assert.doesNotThrow(() => {
      requireTenantRole(MOCK_OWNER_CONTEXT, ['ACCOUNTANT'], 'tác vụ kế toán');
    });
  });
});

// ==========================================================
// SUITE 5: BẤT BIẾN KỲ LƯƠNG & QUẢN LÝ CẤU HÌNH (VERSIONING)
// ==========================================================
describe('5. Immutability & Configuration Versioning', () => {
  it('blocks any modification to a LOCKED or PAID payroll period', () => {
    const lockedPeriod: PayrollPeriod = { ...SAMPLE_PERIOD, status: 'LOCKED' };
    assert.throws(
      () => assertPeriodAllowsDataEntry(lockedPeriod),
      (err: any) => err.statusCode === 400
    );

    const paidPeriod: PayrollPeriod = { ...SAMPLE_PERIOD, status: 'PAID' };
    assert.throws(
      () => assertPeriodAllowsDataEntry(paidPeriod),
      (err: any) => err.statusCode === 400
    );
  });

  it('creates configuration version and audit log when company settings are updated', () => {
    const currentSettings: any = {
      tenantId: 'tenant-demo-1',
      standardWorkingDays: 26,
      standardWorkingHours: 8,
      taxBracketVersion: 'LEGACY_7_TIER',
    };

    const res = executeUpdateCompanySettings({
      tenantContext: MOCK_ADMIN_CONTEXT(),
      currentSettings,
      newSettingsData: { standardWorkingDays: 24 },
      auditComment: 'Chuyển quy chế làm việc sang nghỉ Thứ Bảy và Chủ Nhật',
    });

    assert.equal(res.updatedSettings.standardWorkingDays, 24);
    assert.ok(res.configVersion.id.startsWith('ver_'));
    assert.equal(res.auditLog.action, 'UPDATE_COMPANY_SETTINGS');
    assert.ok(res.configVersion.configJson.includes('"standardWorkingDays":24'));
  });
});

// ==========================================================
// SUITE 6: MÁY TRẠNG THÁI & TUÂN THỦ PHÁP LÝ (WORKFLOW)
// ==========================================================
describe('6. State Machine & Compliance Guards', () => {
  it('follows strict valid lifecycle: DRAFT -> REVIEWING -> LOCKED -> PAID', () => {
    // 1. DRAFT -> REVIEWING
    const t1 = transitionPeriodState({
      period: SAMPLE_PERIOD,
      targetStatus: 'REVIEWING',
      tenantContext: MOCK_CONTEXT,
      taxRule: STATUTORY_TAX_RULE_LEGACY_7_TIER,
      insuranceRule: STATUTORY_INSURANCE_RULE_2024_ACTIVE,
      recordsCount: 5,
    });
    assert.equal(t1.newStatus, 'REVIEWING');

    // 2. REVIEWING -> LOCKED
    const periodReviewing: PayrollPeriod = { ...SAMPLE_PERIOD, status: 'REVIEWING' };
    const t2 = transitionPeriodState({
      period: periodReviewing,
      targetStatus: 'LOCKED',
      tenantContext: MOCK_CONTEXT,
      taxRule: STATUTORY_TAX_RULE_LEGACY_7_TIER,
      insuranceRule: STATUTORY_INSURANCE_RULE_2024_ACTIVE,
      recordsCount: 5,
    });
    assert.equal(t2.newStatus, 'LOCKED');

    // 3. LOCKED -> PAID
    const periodLocked: PayrollPeriod = { ...SAMPLE_PERIOD, status: 'LOCKED' };
    const t3 = transitionPeriodState({
      period: periodLocked,
      targetStatus: 'PAID',
      tenantContext: MOCK_CONTEXT,
      taxRule: STATUTORY_TAX_RULE_LEGACY_7_TIER,
      insuranceRule: STATUTORY_INSURANCE_RULE_2024_ACTIVE,
      recordsCount: 5,
    });
    assert.equal(t3.newStatus, 'PAID');
  });

  it('rejects invalid state transition jumps (e.g. DRAFT directly to PAID)', () => {
    assert.throws(
      () =>
        transitionPeriodState({
          period: SAMPLE_PERIOD, // DRAFT
          targetStatus: 'PAID', // Invalid jump
          tenantContext: MOCK_CONTEXT,
          taxRule: STATUTORY_TAX_RULE_LEGACY_7_TIER,
          insuranceRule: STATUTORY_INSURANCE_RULE_2024_ACTIVE,
          recordsCount: 5,
        }),
      (err: any) => err.statusCode === 400
    );
  });

  it('strictly blocks locking a payroll period if tax rule is UNVERIFIED_DRAFT without simulation override', () => {
    const periodReviewing: PayrollPeriod = { ...SAMPLE_PERIOD, status: 'REVIEWING' };
    assert.throws(
      () =>
        transitionPeriodState({
          period: periodReviewing,
          targetStatus: 'LOCKED',
          tenantContext: MOCK_CONTEXT,
          taxRule: STATUTORY_TAX_RULE_PROPOSED_2026_5_TIER, // UNVERIFIED_DRAFT!
          insuranceRule: STATUTORY_INSURANCE_RULE_2024_ACTIVE,
          recordsCount: 5,
          allowUnverifiedRulesInSimulation: false, // Production mode
        }),
      (err: any) => err.message.includes('[LEGAL_COMPLIANCE_ERROR]')
    );
  });

  it('requires OWNER role and minimum 10 characters explanation to unlock a LOCKED period', () => {
    const periodLocked: PayrollPeriod = { ...SAMPLE_PERIOD, status: 'LOCKED' };

    // Rejected if not OWNER
    assert.throws(
      () =>
        transitionPeriodState({
          period: periodLocked,
          targetStatus: 'DRAFT',
          tenantContext: MOCK_CONTEXT, // ADMIN, not OWNER
          taxRule: STATUTORY_TAX_RULE_LEGACY_7_TIER,
          insuranceRule: STATUTORY_INSURANCE_RULE_2024_ACTIVE,
          recordsCount: 5,
          reasonComment: 'Sửa số liệu sản lượng',
        }),
      (err: any) => err.statusCode === 403
    );

    // Rejected if comment is too short
    assert.throws(
      () =>
        transitionPeriodState({
          period: periodLocked,
          targetStatus: 'DRAFT',
          tenantContext: MOCK_OWNER_CONTEXT,
          taxRule: STATUTORY_TAX_RULE_LEGACY_7_TIER,
          insuranceRule: STATUTORY_INSURANCE_RULE_2024_ACTIVE,
          recordsCount: 5,
          reasonComment: 'Sửa lại', // < 10 chars
        }),
      (err: any) => err.statusCode === 400
    );

    // Accepted with valid reason from OWNER
    const unlockRes = transitionPeriodState({
      period: periodLocked,
      targetStatus: 'DRAFT',
      tenantContext: MOCK_OWNER_CONTEXT,
      taxRule: STATUTORY_TAX_RULE_LEGACY_7_TIER,
      insuranceRule: STATUTORY_INSURANCE_RULE_2024_ACTIVE,
      recordsCount: 5,
      reasonComment: 'Điều chỉnh bổ sung khen thưởng quý 1 theo quyết định HĐQT',
    });
    assert.equal(unlockRes.newStatus, 'DRAFT');
    assert.equal(unlockRes.auditLog.action, 'TRANSITION_PAYROLL_DRAFT');
  });
});

function MOCK_ADMIN_CONTEXT(): TenantContext {
  return MOCK_CONTEXT;
}
