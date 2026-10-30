import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateEmployeePayroll,
  roundCurrency,
  calculateSeniorityYears,
} from './engine/payrollCalculationEngine.ts';
import {
  calcEmployeePayroll,
  calculateTax,
} from '../utils/payrollEngine.ts';
import type { CompanySetting, Employee } from '../types.ts';
import {
  createInMemoryDatabaseStore,
  TenantScopedRepository,
} from './db/tenantScopedRepository.ts';
import { seedDemoData } from './db/seedPayrollDemoData.ts';
import { HttpError } from './errors.ts';
import type { TenantContext } from './security/authMiddleware.ts';
import { assertRuleReadyForFinalLock } from './rules/statutoryRules.ts';


describe('QA Regression & Independent Payroll Verification Suite', () => {
  let db: ReturnType<typeof createInMemoryDatabaseStore>;
  let seedResult: ReturnType<typeof seedDemoData>;
  let contextOwnerA: TenantContext;
  let contextAccountantA: TenantContext;
  let contextEmployeeA: TenantContext;

  beforeEach(() => {
    db = createInMemoryDatabaseStore();
    seedResult = seedDemoData(db);

    contextOwnerA = {
      user: { id: seedResult.userOwnerA.id, email: seedResult.userOwnerA.email },
      tenantId: seedResult.tenantA.id,
      role: 'OWNER',
      membershipId: 'mem_a_1',
    };

    contextAccountantA = {
      user: { id: seedResult.userAccountantA.id, email: seedResult.userAccountantA.email },
      tenantId: seedResult.tenantA.id,
      role: 'ACCOUNTANT',
      membershipId: 'mem_a_2',
    };

    contextEmployeeA = {
      user: { id: seedResult.userEmployeeA.id, email: seedResult.userEmployeeA.email },
      tenantId: seedResult.tenantA.id,
      role: 'EMPLOYEE',
      membershipId: 'mem_a_3',
    };
  });

  // ==========================================================
  // 1. KIỂM THỬ GIÁ TRỊ BIÊN & CỰC TRỊ (BOUNDARY & EXTREME VALUES)
  // ==========================================================
  describe('1. Boundary & Extreme Value Calculation Verification', () => {
    it('handles extreme executive salary (500,000,000 VND) without overflow and caps statutory insurance', () => {
      const executiveEmployee: Employee = {
        id: 'emp_exec_001',
        tenantId: 'tenant_alpha_tech_001',
        code: 'CEO001',
        fullName: 'Tổng Giám Đốc Cấp Cao',
        gender: 'Nam',
        startDate: '2020-01-01',
        status: 'WORKING',
        baseSalary: 500_000_000,
        insuranceSalary: 500_000_000,
        taxableAllowance: 50_000_000,
        nonTaxableAllowance: 730_000,
        attendanceAllowance: 0,
        seniorityAllowancePerYear: 0,
        gasAllowance: 0,
        pieceRateUnitPrice: 0,
        dependentsCount: 2,
      };

      const result = calculateEmployeePayroll({
        employee: executiveEmployee,
        attendance: {
          actualWorkDays: 26,
          paidLeaveDays: 0,
          holidayDays: 0,
          businessTripDays: 0,
          paidDaysCount: 26,
          unpaidLeaveDays: 0,
          overtimeHours: 0,
        },
        adjustments: {
          bonusAmount: 100_000_000,
          advancePayment: 0,
          otherDeductions: 0,
        },
        companySetting: {
          standardWorkingDays: 26,
          standardWorkingHours: 8,
          baseSalaryForInsuranceCap: 2_340_000,
          regionMinimumWageCap: 4_960_000,
          personalTaxDeduction: 11_000_000,
          dependentTaxDeduction: 4_400_000,
        },
        yearMonth: '2026-03',
      });

      // Lương thời gian: 500,000,000 đ
      assert.strictEqual(result.timeBasedSalary, 500_000_000);

      // Phụ cấp ăn trưa 730,000 đ + thưởng 100,000,000 đ
      // Gross = 500M + 730k + 100M = 600,730,000 đ
      assert.strictEqual(result.grossSalary, 600_730_000);

      // Trần BHXH/BHYT (20 x 2,340,000 = 46,800,000 đ)
      // BHXH NLĐ = 46,800,000 * 8% = 3,744,000 đ
      assert.strictEqual(result.employeeInsurance.bhxh, 3_744_000);
      // BHYT NLĐ = 46,800,000 * 1.5% = 702,000 đ
      assert.strictEqual(result.employeeInsurance.bhyt, 702_000);

      // Trần BHTN (20 x 4,960,000 = 99,200,000 đ)
      // BHTN NLĐ = 99,200,000 * 1% = 992,000 đ
      assert.strictEqual(result.employeeInsurance.bhtn, 992_000);

      // Tổng bảo hiểm NLĐ = 3,744,000 + 702,000 + 992,000 = 5,438,000 đ
      assert.strictEqual(result.employeeInsurance.total, 5_438_000);

      // Thu nhập chịu thuế = Gross - Miễn thuế (730k) = 600,000,000 đ
      assert.strictEqual(result.taxableIncome, 600_000_000);

      // Giảm trừ gia cảnh: Bản thân 11M + 2 người phụ thuộc (2 x 4.4M = 8.8M) = 19.8M
      assert.strictEqual(result.familyDeductions.total, 19_800_000);

      // Thu nhập tính thuế = 600,000,000 - 5,438,000 - 19,800,000 = 574,762,000 đ
      assert.strictEqual(result.assessableIncome, 574_762_000);

      // Thuế TNCN bậc 7 (>80M): 18.15M + (574,762,000 - 80,000,000) * 35% = 191,316,700 đ
      // Làm tròn theo quy tắc ROUND_1000 -> 191,317,000 đ
      assert.strictEqual(result.personalIncomeTax, 191_317_000);

      // Thực lĩnh Net = Gross - BH - Thuế
      assert.strictEqual(
        result.netSalary,
        600_730_000 - 5_438_000 - 191_317_000
      );
    });

    it('handles employee with 0 paid days: 0 time salary, 0 insurance, 0 tax, 0 Net', () => {
      const zeroDayEmployee: Employee = {
        id: 'emp_zero_001',
        tenantId: 'tenant_alpha_tech_001',
        code: 'NV_ZERO',
        fullName: 'Nhân Viên Nghỉ Cả Tháng',
        gender: 'Nam',
        startDate: '2023-01-01',
        status: 'WORKING',
        baseSalary: 15_000_000,
        insuranceSalary: 15_000_000,
        taxableAllowance: 0,
        nonTaxableAllowance: 0,
        attendanceAllowance: 500_000,
        seniorityAllowancePerYear: 0,
        gasAllowance: 0,
        pieceRateUnitPrice: 0,
        dependentsCount: 0,
      };

      const result = calculateEmployeePayroll({
        employee: zeroDayEmployee,
        attendance: {
          actualWorkDays: 0,
          paidLeaveDays: 0,
          holidayDays: 0,
          businessTripDays: 0,
          paidDaysCount: 0,
          unpaidLeaveDays: 26, // Nghỉ cả tháng không lương
          overtimeHours: 0,
        },
        yearMonth: '2026-03',
      });

      assert.strictEqual(result.timeBasedSalary, 0);
      assert.strictEqual(result.grossSalary, 0);
      assert.strictEqual(result.isInsuranceExempt14Days, true);
      assert.strictEqual(result.employeeInsurance.total, 0);
      assert.strictEqual(result.totalEmployerCost, 0);
      assert.strictEqual(result.personalIncomeTax, 0);
      assert.strictEqual(result.netSalary, 0);
    });

    it('verifies exact 13 vs 14 unpaid leave days boundary according to Law on Social Insurance', () => {
      const baseEmployee: Employee = {
        id: 'emp_boundary_001',
        tenantId: 'tenant_alpha_tech_001',
        code: 'NV_BOUND',
        fullName: 'Nhân Viên Kiểm Tra Biên',
        gender: 'Nam',
        startDate: '2024-01-01',
        status: 'WORKING',
        baseSalary: 10_000_000,
        insuranceSalary: 10_000_000,
        taxableAllowance: 0,
        nonTaxableAllowance: 0,
        attendanceAllowance: 0,
        seniorityAllowancePerYear: 0,
        gasAllowance: 0,
        pieceRateUnitPrice: 0,
        dependentsCount: 0,
      };

      // 13 ngày nghỉ không lương: CHƯA ĐỦ 14 NGÀY -> Vẫn phải đóng bảo hiểm
      const res13 = calculateEmployeePayroll({
        employee: baseEmployee,
        attendance: {
          actualWorkDays: 13,
          paidLeaveDays: 0,
          holidayDays: 0,
          businessTripDays: 0,
          paidDaysCount: 13,
          unpaidLeaveDays: 13,
          overtimeHours: 0,
        },
        yearMonth: '2026-03',
      });
      assert.strictEqual(res13.isInsuranceExempt14Days, false);
      assert.strictEqual(res13.employeeInsurance.total, 1_050_000); // 10.5% của 10M

      // 14 ngày nghỉ không lương: ĐỦ 14 NGÀY -> MIỄN TRỪ BẢO HIỂM HOÀN TOÀN
      const res14 = calculateEmployeePayroll({
        employee: baseEmployee,
        attendance: {
          actualWorkDays: 12,
          paidLeaveDays: 0,
          holidayDays: 0,
          businessTripDays: 0,
          paidDaysCount: 12,
          unpaidLeaveDays: 14,
          overtimeHours: 0,
        },
        yearMonth: '2026-03',
      });
      assert.strictEqual(res14.isInsuranceExempt14Days, true);
      assert.strictEqual(res14.employeeInsurance.total, 0);
      assert.strictEqual(res14.totalEmployerCost, 0);
    });
  });

  // ==========================================================
  // 2. TÍNH BẤT BIẾN KHI KHÓA KỲ LƯƠNG & THAY ĐỔI CẤU HÌNH LIÊN KỲ
  // ==========================================================
  describe('2. Cross-Period Configuration & Immutability Verification', () => {
    it('guarantees a LOCKED period remains 100% frozen when company settings change afterwards', async () => {
      const repo = new TenantScopedRepository(db);
      const periodId = `period_${seedResult.tenantA.id}_2026-03`;

      // 1. Tạo bản ghi lương tháng 03/2026 với mức lương cơ bản 22,000,000 đ
      const initialRecord = {
        id: 'rec_freeze_001',
        tenantId: seedResult.tenantA.id,
        payrollPeriodId: periodId,
        employeeId: 'emp_a_002',
        employeeCode: 'NV002',
        employeeName: 'Trần Thị Bình',
        baseSalary: 22_000_000,
        netSalary: 19_500_000,
        grossSalary: 24_000_000,
        totalDeductions: 4_500_000,
      };
      db.payrollRecords.set(initialRecord.id, initialRecord as any);

      // 2. Chốt và KHÓA sổ kỳ lương tháng 03/2026
      const period = db.payrollPeriods.get(periodId);
      period.status = 'LOCKED';
      period.lockedAt = new Date().toISOString();

      // 3. Sau đó, quản trị viên thay đổi lương cơ bản của nhân sự thành 30,000,000 đ
      await repo.updateEmployee(contextOwnerA, 'emp_a_002', {
        baseSalary: 30_000_000,
      });

      // 4. Kiểm tra lại bản ghi trong kỳ đã KHÓA: Phải giữ nguyên mức 22,000,000 đ snapshot
      const records = await repo.listPayrollRecords(contextAccountantA, periodId);
      const freezeCheck = records.find((r) => r.id === 'rec_freeze_001');
      assert.strictEqual(freezeCheck?.baseSalary, 22_000_000);
      assert.strictEqual(freezeCheck?.netSalary, 19_500_000);

      // 5. Thử sửa chấm công của kỳ đã khóa bằng tài khoản có thẩm quyền (OWNER) -> BẮT BUỘC BỊ CHẶN 400 VÌ KỲ ĐÃ KHÓA
      await assert.rejects(
        async () => {
          await repo.updateAttendanceCell(
            contextOwnerA,
            'emp_a_002',
            '2026-03',
            10,
            'X',
            2
          );
        },
        (err: unknown) => {
          assert(err instanceof HttpError);
          assert.strictEqual(err.statusCode, 400);
          assert.match(err.message, /khóa sổ/);
          return true;
        }
      );
    });

    it('blocks locking official payroll if tax rule is UNVERIFIED_DRAFT unless simulation', () => {
      // 1. assertRuleReadyForFinalLock ném lỗi nếu tax rule chưa VERIFIED_ACTIVE
      assert.throws(
        () => {
          assertRuleReadyForFinalLock(
            {
              version: 'PROPOSED_2026_5_TIER',
              name: 'Dự thảo Thuế TNCN 5 Bậc 2026',
              legalBasis: 'Dự thảo đề xuất sửa đổi Luật Thuế TNCN',
              status: 'UNVERIFIED_DRAFT',
              effectiveFrom: '2026-01',
              personalDeductionMonthly: 11000000,
              dependentDeductionMonthly: 4400000,
              brackets: [],
              overtimeTaxExemptionMode: 'FULL_OT_EXEMPT',
            },
            {
              version: 'INSURANCE_2024_OFFICIAL',
              name: 'Quy chuẩn đóng BHXH theo NĐ 73/2024 & NĐ 74/2024',
              legalBasis: 'Nghị định 73/2024/NĐ-CP',
              status: 'VERIFIED_ACTIVE',
              effectiveFrom: '2024-07',
              baseSalaryForCap: 2340000,
              regionMinimumWageRegion1: 4960000,
              employeeBhxhRate: 8,
              employeeBhytRate: 1.5,
              employeeBhtnRate: 1,
              employerBhxhRate: 17.5,
              employerBhytRate: 3,
              employerBhtnRate: 1,
              employerTradeUnionRate: 2,
              unpaidLeaveDaysThresholdForExemption: 14,
            }
          );
        },
        (err: unknown) => {
          assert(err instanceof Error);
          assert.match(err.message, /LEGAL_COMPLIANCE_ERROR/);
          return true;
        }
      );
    });
  });

  // ==========================================================
  // 3. KHẢ NĂNG VẬN HÀNH & XỬ LÝ LỖI (OPERATIONAL RESILIENCE)
  // ==========================================================
  describe('3. Operational Edge Cases & Error Resilience', () => {
    it('rejects duplicate employee code inside the same tenant', async () => {
      const repo = new TenantScopedRepository(db);

      // NV001 đã tồn tại trong Tenant A
      await assert.rejects(
        async () => {
          await repo.createEmployee(contextOwnerA, {
            code: 'NV001',
            fullName: 'Trùng Mã NV',
            gender: 'Nam',
            startDate: '2026-01-01',
            status: 'WORKING',
            baseSalary: 10_000_000,
            insuranceSalary: 10_000_000,
            taxableAllowance: 0,
            nonTaxableAllowance: 0,
            attendanceAllowance: 0,
            seniorityAllowancePerYear: 0,
            gasAllowance: 0,
            pieceRateUnitPrice: 0,
            dependentsCount: 0,
          });
        },
        (err: unknown) => {
          assert(err instanceof HttpError);
          assert.strictEqual(err.statusCode, 400);
          assert.match(err.message, /đã tồn tại/);
          return true;
        }
      );
    });

    it('allows identical employee code across different tenants without collision', async () => {
      const repo = new TenantScopedRepository(db);

      const contextOwnerB: TenantContext = {
        user: { id: seedResult.userOwnerB.id, email: seedResult.userOwnerB.email },
        tenantId: seedResult.tenantB.id,
        role: 'OWNER',
        membershipId: 'mem_b_1',
      };

      // Tạo nhân viên mã 'NV001' bên Tenant B (mặc dù Tenant A đã có 'NV001') -> THÀNH CÔNG
      const empB = await repo.createEmployee(contextOwnerB, {
        code: 'NV001',
        fullName: 'Nguyễn Văn B (Tenant B)',
        gender: 'Nam',
        startDate: '2026-01-01',
        status: 'WORKING',
        baseSalary: 12_000_000,
        insuranceSalary: 12_000_000,
        taxableAllowance: 0,
        nonTaxableAllowance: 0,
        attendanceAllowance: 0,
        seniorityAllowancePerYear: 0,
        gasAllowance: 0,
        pieceRateUnitPrice: 0,
        dependentsCount: 0,
      });

      assert.strictEqual(empB.code, 'NV001');
      assert.strictEqual(empB.tenantId, contextOwnerB.tenantId);
    });

    it('enforces exact rounding on fractional currency calculations', () => {
      // ROUND_1000: làm tròn đến 1,000 đ
      assert.strictEqual(roundCurrency(100_000 / 3, 'ROUND_1000'), 33_000);
      assert.strictEqual(roundCurrency((100_000 * 2) / 3, 'ROUND_1000'), 67_000);

      // NO_ROUND: làm tròn đến 1 đ
      assert.strictEqual(roundCurrency(100_000 / 3, 'NO_ROUND'), 33_333);
      assert.strictEqual(roundCurrency((100_000 * 2) / 3, 'NO_ROUND'), 66_667);

      // Số âm
      assert.strictEqual(roundCurrency(-10.6, 'NO_ROUND'), -11);
    });
  });
});

