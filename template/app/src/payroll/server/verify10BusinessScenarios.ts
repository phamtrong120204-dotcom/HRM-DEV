import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateEmployeePayroll, roundCurrency } from './engine/payrollCalculationEngine.ts';
import {
  STATUTORY_INSURANCE_RULE_2024_ACTIVE,
  STATUTORY_TAX_RULE_LEGACY_7_TIER,
  STATUTORY_TAX_RULE_PROPOSED_2026_5_TIER,
} from './rules/statutoryRules.ts';
import type { Employee, CompanySetting } from '../types.ts';
import { TenantScopedRepository, createInMemoryDatabaseStore } from './db/tenantScopedRepository.ts';
import type { TenantContext } from './security/authMiddleware.ts';

// Common base mock company settings
const baseCompanySetting: any = {
  id: 'setting_test',
  tenantId: 'tenant-test-corp',
  version: 1,
  standardWorkingDays: 26,
  standardWorkingHours: 8,
  overtimeRateNormal: 1.5,
  overtimeRateWeekend: 2.0,
  overtimeRateHoliday: 3.0,
  lunchAllowanceTaxExemptLimit: 730_000,
  maxAllowedUnpaidDays: 1, // Nghỉ tối đa 1 ngày KL vẫn được chuyên cần
  salaryRoundingRule: 'ROUND_1000',
  activeTaxRuleVersion: 'LEGACY_7_TIER',
  isLocked: false,
};

test('10 REAL-WORLD BUSINESS SCENARIOS VERIFICATION SUITE', async (t) => {
  // -------------------------------------------------------------
  // TÌNH HUỐNG 1: Tiêu chuẩn 100% công (Full Attendance Standard)
  // -------------------------------------------------------------
  await t.test('Scenario 1: Nhân viên đi làm đủ 26/26 công chuẩn, phụ cấp ăn trưa 730k, BHXH và thuế TNCN chuẩn', () => {
    const emp: any = {
      id: 'emp_01',
      tenantId: 'tenant-test-corp',
      code: 'NV001',
      fullName: 'Nguyễn Văn Tiêu Chuẩn',
      departmentId: 'dept_it',
      salaryType: 'TIME_BASED',
      baseSalary: 20_000_000,
      insuranceSalary: 20_000_000,
      allowances: {
        lunch: 730_000,
        attendanceBonus: 500_000,
      },
      dependentsCount: 0,
      startDate: '2024-01-01',
      status: 'WORKING',
    };

    const attendance = {
      actualWorkDays: 26,
      paidLeaveDays: 0,
      holidayDays: 0,
      businessTripDays: 0,
      paidDaysCount: 26,
      unpaidLeaveDays: 0,
      overtimeHours: 0,
    };

    const res = calculateEmployeePayroll({
      employee: emp,
      attendance,
      adjustments: {},
      companySetting: baseCompanySetting,
      yearMonth: '2026-10',
      taxRule: STATUTORY_TAX_RULE_LEGACY_7_TIER,
      insuranceRule: STATUTORY_INSURANCE_RULE_2024_ACTIVE,
    });

    // 1. Lương thời gian đủ 100% = 20M
    assert.equal(res.timeBasedSalary, 20_000_000);
    // 2. Phụ cấp chuyên cần được hưởng vì 0 ngày nghỉ KL <= 1 ngày
    assert.equal(res.isAttendanceQualified, true);
    assert.equal(res.attendanceAllowance, 500_000);
    // 3. Phụ cấp ăn trưa 730k = 100% miễn thuế
    assert.equal(res.lunchAllowanceTotal, 730_000);
    assert.equal(res.lunchAllowanceTaxExempt, 730_000);
    assert.equal(res.lunchAllowanceTaxable, 0);
    // 4. Tổng Gross: 20M + 730k + 500k = 21,230,000đ
    assert.equal(res.grossSalary, 21_230_000);
    // 5. Bảo hiểm người lao động: 20M * 10.5% = 2,100,000đ
    assert.equal(res.employeeInsurance.bhxh, 1_600_000);
    assert.equal(res.employeeInsurance.bhyt, 300_000);
    assert.equal(res.employeeInsurance.bhtn, 200_000);
    assert.equal(res.employeeInsurance.total, 2_100_000);
    // 6. Thuế TNCN:
    // Thu nhập chịu thuế: 21,230,000 - 730,000 = 20,500,000đ
    // Giảm trừ: 11,000,000 (bản thân) + 2,100,000 (bảo hiểm) = 13,100,000đ
    // Thu nhập tính thuế: 20,500,000 - 13,100,000 = 7,400,000đ
    // Bậc 1 (5M * 5%) = 250,000đ; Bậc 2 (2.4M * 10%) = 240,000đ => Thuế = 490,000đ
    assert.equal(res.assessableIncome, 7_400_000);
    assert.equal(res.personalIncomeTax, 490_000);
    // 7. Thực lĩnh Net = Gross (21,230,000) - Bảo hiểm (2,100,000) - Thuế (490,000) = 18,640,000đ
    assert.equal(res.netSalary, 18_640_000);
  });

  // -------------------------------------------------------------
  // TÌNH HUỐNG 2: Chạm ngưỡng 14 ngày nghỉ không lương (Luật BHXH)
  // -------------------------------------------------------------
  await t.test('Scenario 2: Nhân viên nghỉ không lương 14 ngày -> Miễn đóng BHXH tháng đó theo Luật BHXH', () => {
    const emp: any = {
      id: 'emp_02',
      tenantId: 'tenant-test-corp',
      code: 'NV002',
      fullName: 'Trần Thị Mười Bốn',
      departmentId: 'dept_it',
      salaryType: 'TIME_BASED',
      baseSalary: 15_000_000,
      insuranceSalary: 15_000_000,
      allowances: {
        lunch: 730_000,
        attendanceBonus: 500_000,
      },
      dependentsCount: 0,
      startDate: '2024-01-01',
      status: 'WORKING',
    };

    const attendance = {
      actualWorkDays: 12,
      paidLeaveDays: 0,
      holidayDays: 0,
      businessTripDays: 0,
      paidDaysCount: 12,
      unpaidLeaveDays: 14, // CHẠM ĐÚNG 14 NGÀY
      overtimeHours: 0,
    };

    const res = calculateEmployeePayroll({
      employee: emp,
      attendance,
      adjustments: {},
      companySetting: baseCompanySetting,
      yearMonth: '2026-10',
      taxRule: STATUTORY_TAX_RULE_LEGACY_7_TIER,
      insuranceRule: STATUTORY_INSURANCE_RULE_2024_ACTIVE,
    });

    // Theo Luật BHXH: Từ 14 ngày không lương trở lên -> MIỄN ĐÓNG BHXH CẢ 2 BÊN
    assert.equal(res.isInsuranceExempt14Days, true);
    assert.equal(res.employeeInsurance.total, 0);
    assert.equal(res.employerInsurance.total, 0);
    // Mất phụ cấp chuyên cần do nghỉ > 1 ngày
    assert.equal(res.isAttendanceQualified, false);
    assert.equal(res.attendanceAllowance, 0);
  });

  // -------------------------------------------------------------
  // TÌNH HUỐNG 3: Dưới ngưỡng 14 ngày nghỉ không lương (13 ngày)
  // -------------------------------------------------------------
  await t.test('Scenario 3: Nhân viên nghỉ không lương 13 ngày (< 14 ngày) -> Vẫn phải trích nộp BHXH bình thường', () => {
    const emp: any = {
      id: 'emp_03',
      tenantId: 'tenant-test-corp',
      code: 'NV003',
      fullName: 'Lê Văn Mười Ba',
      departmentId: 'dept_it',
      salaryType: 'TIME_BASED',
      baseSalary: 15_000_000,
      insuranceSalary: 15_000_000,
      allowances: {
        lunch: 730_000,
        attendanceBonus: 500_000,
      },
      dependentsCount: 0,
      startDate: '2024-01-01',
      status: 'WORKING',
    };

    const attendance = {
      actualWorkDays: 13,
      paidLeaveDays: 0,
      holidayDays: 0,
      businessTripDays: 0,
      paidDaysCount: 13,
      unpaidLeaveDays: 13, // 13 NGÀY (< 14 ngày)
      overtimeHours: 0,
    };

    const res = calculateEmployeePayroll({
      employee: emp,
      attendance,
      adjustments: {},
      companySetting: baseCompanySetting,
      yearMonth: '2026-10',
      taxRule: STATUTORY_TAX_RULE_LEGACY_7_TIER,
      insuranceRule: STATUTORY_INSURANCE_RULE_2024_ACTIVE,
    });

    // 13 ngày chưa chạm mốc 14 ngày -> VẪN ĐÓNG BHXH ĐẦY ĐỦ
    assert.equal(res.isInsuranceExempt14Days, false);
    assert.equal(res.employeeInsurance.total, 15_000_000 * 0.105); // 1,575,000đ
  });

  // -------------------------------------------------------------
  // TÌNH HUỐNG 4: Lương cao chạm trần đóng BHXH (Trần 20 lần Lương cơ sở)
  // -------------------------------------------------------------
  await t.test('Scenario 4: Lương lãnh đạo 100 triệu -> Chạm trần BHXH tối đa 46.8 triệu (20x lương cơ sở)', () => {
    const emp: any = {
      id: 'emp_04',
      tenantId: 'tenant-test-corp',
      code: 'NV004',
      fullName: 'Phạm Tổng Giám Đốc',
      departmentId: 'dept_bod',
      salaryType: 'TIME_BASED',
      baseSalary: 100_000_000,
      insuranceSalary: 100_000_000,
      allowances: {
        lunch: 730_000,
      },
      dependentsCount: 2,
      startDate: '2020-01-01',
      status: 'WORKING',
    };

    const attendance = {
      actualWorkDays: 26,
      paidLeaveDays: 0,
      holidayDays: 0,
      businessTripDays: 0,
      paidDaysCount: 26,
      unpaidLeaveDays: 0,
      overtimeHours: 0,
    };

    const res = calculateEmployeePayroll({
      employee: emp,
      attendance,
      adjustments: {},
      companySetting: baseCompanySetting,
      yearMonth: '2026-10',
      taxRule: STATUTORY_TAX_RULE_LEGACY_7_TIER,
      insuranceRule: STATUTORY_INSURANCE_RULE_2024_ACTIVE,
    });

    // Lương cơ sở 2,340,000đ -> Trần BHXH/BHYT = 46,800,000đ
    assert.equal(res.cappedBhxhBase, 46_800_000);
    // BHXH 8% trên 46.8M = 3,744,000đ (KHÔNG PHẢI 8 triệu)
    assert.equal(res.employeeInsurance.bhxh, 3_744_000);
    // BHYT 1.5% trên 46.8M = 702,000đ (KHÔNG PHẢI 1.5 triệu)
    assert.equal(res.employeeInsurance.bhyt, 702_000);
  });

  // -------------------------------------------------------------
  // TÌNH HUỐNG 5: Tách phụ cấp ăn trưa miễn thuế & chịu thuế (Vượt 730k)
  // -------------------------------------------------------------
  await t.test('Scenario 5: Phụ cấp ăn trưa 1.500.000đ -> Miễn thuế đúng 730k, 770k còn lại tính vào thu nhập chịu thuế', () => {
    const emp: any = {
      id: 'emp_05',
      tenantId: 'tenant-test-corp',
      code: 'NV005',
      fullName: 'Hoàng Ăn Trưa Cao',
      departmentId: 'dept_it',
      salaryType: 'TIME_BASED',
      baseSalary: 10_000_000,
      insuranceSalary: 10_000_000,
      allowances: {
        lunch: 1_500_000, // 1.5M ăn trưa
      },
      dependentsCount: 0,
      startDate: '2024-01-01',
      status: 'WORKING',
    };

    const attendance = {
      actualWorkDays: 26,
      paidLeaveDays: 0,
      holidayDays: 0,
      businessTripDays: 0,
      paidDaysCount: 26,
      unpaidLeaveDays: 0,
      overtimeHours: 0,
    };

    const res = calculateEmployeePayroll({
      employee: emp,
      attendance,
      adjustments: {},
      companySetting: baseCompanySetting,
      yearMonth: '2026-10',
      taxRule: STATUTORY_TAX_RULE_LEGACY_7_TIER,
      insuranceRule: STATUTORY_INSURANCE_RULE_2024_ACTIVE,
    });

    assert.equal(res.lunchAllowanceTotal, 1_500_000);
    assert.equal(res.lunchAllowanceTaxExempt, 730_000);
    assert.equal(res.lunchAllowanceTaxable, 770_000);
    // Thu nhập chịu thuế = Gross (11.5M) - Miễn thuế (730k) = 10,770,000đ
    assert.equal(res.taxableIncome, 10_770_000);
  });

  // -------------------------------------------------------------
  // TÌNH HUỐNG 6: Làm thêm giờ (OT) & Miễn thuế phần chênh lệch làm thêm
  // -------------------------------------------------------------
  await t.test('Scenario 6: Làm thêm giờ 10 giờ ngày thường (150%) -> Phần 50% chênh lệch được miễn thuế TNCN', () => {
    const emp: any = {
      id: 'emp_06',
      tenantId: 'tenant-test-corp',
      code: 'NV006',
      fullName: 'Vũ Làm Thêm Giờ',
      departmentId: 'dept_it',
      salaryType: 'TIME_BASED',
      baseSalary: 20_800_000, // Đơn giá ngày = 20.8M / 26 = 800k -> giờ = 100,000đ/giờ
      insuranceSalary: 20_800_000,
      allowances: {},
      dependentsCount: 0,
      startDate: '2024-01-01',
      status: 'WORKING',
    };

    const attendance = {
      actualWorkDays: 26,
      paidLeaveDays: 0,
      holidayDays: 0,
      businessTripDays: 0,
      paidDaysCount: 26,
      unpaidLeaveDays: 0,
      overtimeHours: 10, // 10 giờ OT
    };

    const res = calculateEmployeePayroll({
      employee: emp,
      attendance,
      adjustments: {},
      companySetting: baseCompanySetting,
      yearMonth: '2026-10',
      taxRule: STATUTORY_TAX_RULE_LEGACY_7_TIER,
      insuranceRule: STATUTORY_INSURANCE_RULE_2024_ACTIVE,
    });

    // 100k/giờ * 10h * 150% = 1,500,000đ tiền lương OT
    assert.equal(res.overtimeSalary, 1_500_000);
    // Phần 100% (1,000,000đ) chịu thuế
    assert.equal(res.overtimeTaxableSalary, 1_000_000);
    // Phần 50% chênh lệch (500,000đ) được miễn thuế theo Thông tư 111
    assert.equal(res.overtimeTaxExemptSalary, 500_000);
  });

  // -------------------------------------------------------------
  // TÌNH HUỐNG 7: Lương khoán sản phẩm (Piece-Rate Salary Model)
  // -------------------------------------------------------------
  await t.test('Scenario 7: Lương khoán sản phẩm (2.000 sản phẩm * 8.000đ) = 16.000.000đ', () => {
    const emp: any = {
      id: 'emp_07',
      tenantId: 'tenant-test-corp',
      code: 'NV007',
      fullName: 'Đỗ Lương Khoán',
      departmentId: 'dept_prod',
      salaryType: 'PIECE_RATE',
      baseSalary: 6_000_000, // Lương cơ bản ghi trên HĐLĐ để đóng BH
      insuranceSalary: 6_000_000,
      pieceRateUnitPrice: 8_000,
      allowances: {
        lunch: 730_000,
      },
      dependentsCount: 0,
      startDate: '2024-01-01',
      status: 'WORKING',
    };

    const attendance = {
      actualWorkDays: 26,
      paidLeaveDays: 0,
      holidayDays: 0,
      businessTripDays: 0,
      paidDaysCount: 26,
      unpaidLeaveDays: 0,
      overtimeHours: 0,
    };

    const res = calculateEmployeePayroll({
      employee: emp,
      attendance,
      adjustments: {
        pieceRateQuantity: 2000,
      },
      companySetting: baseCompanySetting,
      yearMonth: '2026-10',
      taxRule: STATUTORY_TAX_RULE_LEGACY_7_TIER,
      insuranceRule: STATUTORY_INSURANCE_RULE_2024_ACTIVE,
    });

    assert.equal(res.pieceRateQuantity, 2000);
    assert.equal(res.pieceRateUnitPrice, 8000);
    assert.equal(res.pieceRateSalary, 16_000_000);
    // Bảo hiểm tính trên lương HĐLĐ 6M: 6M * 10.5% = 630,000đ
    assert.equal(res.employeeInsurance.total, 630_000);
  });

  // -------------------------------------------------------------
  // TÌNH HUỐNG 8: Giảm trừ gia cảnh nhiều người phụ thuộc -> Thuế = 0đ
  // -------------------------------------------------------------
  await t.test('Scenario 8: Lương 18 triệu có 2 người phụ thuộc -> Thu nhập tính thuế âm, Thuế TNCN = 0đ', () => {
    const emp: any = {
      id: 'emp_08',
      tenantId: 'tenant-test-corp',
      code: 'NV008',
      fullName: 'Bùi Gia Cảnh Đông Con',
      departmentId: 'dept_it',
      salaryType: 'TIME_BASED',
      baseSalary: 18_000_000,
      insuranceSalary: 18_000_000,
      allowances: {
        lunch: 730_000,
      },
      dependentsCount: 2, // 2 con nhỏ (4.4M * 2 = 8.8M)
      startDate: '2024-01-01',
      status: 'WORKING',
    };

    const attendance = {
      actualWorkDays: 26,
      paidLeaveDays: 0,
      holidayDays: 0,
      businessTripDays: 0,
      paidDaysCount: 26,
      unpaidLeaveDays: 0,
      overtimeHours: 0,
    };

    const res = calculateEmployeePayroll({
      employee: emp,
      attendance,
      adjustments: {},
      companySetting: baseCompanySetting,
      yearMonth: '2026-10',
      taxRule: STATUTORY_TAX_RULE_LEGACY_7_TIER,
      insuranceRule: STATUTORY_INSURANCE_RULE_2024_ACTIVE,
    });

    // Giảm trừ gia cảnh: Bản thân 11M + 2 con 8.8M = 19.8M
    assert.equal(res.familyDeductions.total, 19_800_000);
    // Thu nhập chịu thuế: 18M
    // Thu nhập tính thuế = 18M - BHXH (1.89M) - 19.8M = âm -> về 0
    assert.equal(res.assessableIncome, 0);
    assert.equal(res.personalIncomeTax, 0);
  });

  // -------------------------------------------------------------
  // TÌNH HUỐNG 9: 0 ngày công trong tháng (Tạm hoãn HĐLĐ / Nghỉ việc)
  // -------------------------------------------------------------
  await t.test('Scenario 9: 0 ngày công trong tháng -> Lương thời gian = 0đ, BHXH = 0đ, Thuế = 0đ, Net = 0đ', () => {
    const emp: any = {
      id: 'emp_09',
      tenantId: 'tenant-test-corp',
      code: 'NV009',
      fullName: 'Dương Không Ngày Công',
      departmentId: 'dept_it',
      salaryType: 'TIME_BASED',
      baseSalary: 20_000_000,
      insuranceSalary: 20_000_000,
      allowances: {
        lunch: 730_000,
        attendanceBonus: 500_000,
      },
      dependentsCount: 0,
      startDate: '2024-01-01',
      status: 'WORKING',
    };

    const attendance = {
      actualWorkDays: 0,
      paidLeaveDays: 0,
      holidayDays: 0,
      businessTripDays: 0,
      paidDaysCount: 0,
      unpaidLeaveDays: 26,
      overtimeHours: 0,
    };

    const res = calculateEmployeePayroll({
      employee: emp,
      attendance,
      adjustments: {},
      companySetting: baseCompanySetting,
      yearMonth: '2026-10',
      taxRule: STATUTORY_TAX_RULE_LEGACY_7_TIER,
      insuranceRule: STATUTORY_INSURANCE_RULE_2024_ACTIVE,
    });

    assert.equal(res.timeBasedSalary, 0);
    assert.equal(res.attendanceAllowance, 0);
    assert.equal(res.employeeInsurance.total, 0);
    assert.equal(res.personalIncomeTax, 0);
    assert.equal(res.netSalary, 0);
  });

  // -------------------------------------------------------------
  // TÌNH HUỐNG 10: Multi-Tenant Data Isolation & Khóa sổ bất biến
  // -------------------------------------------------------------
  await t.test('Scenario 10: Cô lập đa doanh nghiệp (Tenant A không đọc được Tenant B) và Khóa sổ kỳ lương', async () => {
    const db = createInMemoryDatabaseStore();
    const repo = new TenantScopedRepository(db);

    // Tạo Tenant A và Tenant B
    const tA = { id: 'tenant_A', name: 'Công ty Alpha', slug: 'alpha', taxId: '0101', address: 'HN', isActive: true, subscriptionTier: 'starter' };
    const tB = { id: 'tenant_B', name: 'Công ty Beta', slug: 'beta', taxId: '0202', address: 'HCM', isActive: true, subscriptionTier: 'starter' };
    db.tenants.set(tA.id, tA);
    db.tenants.set(tB.id, tB);

    // Tạo nhân viên thuộc Tenant A
    const empA: any = {
      id: 'emp_A_1',
      tenantId: 'tenant_A',
      code: 'NVA1',
      fullName: 'Nhân viên Công ty A',
      departmentId: 'd1',
      salaryType: 'TIME_BASED',
      baseSalary: 10_000_000,
      insuranceSalary: 10_000_000,
      status: 'WORKING',
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    };
    db.employees.set(empA.id, empA);

    const ctxTenantB: TenantContext = {
      tenantId: 'tenant_B',
      user: { id: 'user_B', email: 'owner@beta.com', isAdmin: false },
      role: 'OWNER',
    };

    // Tenant B truy cập nhân viên của Tenant A -> BỊ CHẶN (IDOR Protection)
    await assert.rejects(
      async () => {
        await repo.getEmployeeById(ctxTenantB, 'emp_A_1');
      },
      /Bạn không có quyền truy cập|doanh nghiệp khác/i
    );

    // Danh sách nhân viên của Tenant B -> Trả về mảng rỗng (Không rò rỉ dữ liệu Tenant A)
    const listB = await repo.listEmployees(ctxTenantB);
    assert.equal(listB.length, 0);

    const ctxTenantAOwner: TenantContext = {
      tenantId: 'tenant_A',
      user: { id: 'user_A_owner', email: 'owner@alpha.com', isAdmin: false },
      role: 'OWNER',
    };

    // Tạo kỳ lương và khóa sổ (LOCKED)
    const periodId = `period_${ctxTenantAOwner.tenantId}_2026-10`;
    db.payrollPeriods.set(periodId, {
      id: periodId,
      tenantId: ctxTenantAOwner.tenantId,
      yearMonth: '2026-10',
      status: 'LOCKED',
      totalGross: 10_000_000,
      totalNet: 8_950_000,
      createdAt: '2026-10-01',
      updatedAt: '2026-10-31',
    });

    const ctxTenantAAdmin: TenantContext = {
      tenantId: 'tenant_A',
      user: { id: 'user_A_admin', email: 'admin@alpha.com', isAdmin: false },
      role: 'ADMIN',
    };

    // Thao tác chỉnh sửa chấm công khi kỳ lương đã LOCKED -> BỊ CHẶN NGAY LẬP TỨC
    await assert.rejects(
      async () => {
        await repo.updateAttendanceCell(
          ctxTenantAAdmin,
          'emp_A_1',
          '2026-10',
          5,
          'X'
        );
      },
      /đã được chốt và khóa sổ/i
    );
  });
});
