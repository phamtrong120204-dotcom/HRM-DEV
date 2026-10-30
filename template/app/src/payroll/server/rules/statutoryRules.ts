/**
 * QUY TẮC PHÁP LÝ THUẾ & BẢO HIỂM CÓ PHIÊN BẢN VÀ KỲ HIỆU LỰC (NHÓM B)
 * Phân tách rõ ràng giữa quy tắc ĐÃ XÁC MINH PHÁP LÝ và quy tắc CHƯA XÁC MINH / DỰ THẢO
 */

export type StatutoryRuleStatus = 'VERIFIED_ACTIVE' | 'UNVERIFIED_DRAFT' | 'SUPERSEDED_HISTORICAL';

export interface TaxBracket {
  limit: number; // Mức thu nhập tính thuế tối đa của bậc (Infinity cho bậc cuối)
  rate: number;  // Thuế suất (ví dụ: 0.05 tương đương 5%)
}

export interface StatutoryTaxRule {
  version: string;
  name: string;
  legalBasis: string;
  status: StatutoryRuleStatus;
  effectiveFrom: string; // YYYY-MM
  effectiveTo?: string;  // YYYY-MM (undefined = vô thời hạn)
  personalDeductionMonthly: number;  // Giảm trừ bản thân (VND / tháng)
  dependentDeductionMonthly: number; // Giảm trừ người phụ thuộc (VND / người / tháng)
  brackets: TaxBracket[];
  overtimeTaxExemptionMode: 'PREMIUM_ONLY' | 'FULL_OT_EXEMPT';
}

export interface StatutoryInsuranceRule {
  version: string;
  name: string;
  legalBasis: string;
  status: StatutoryRuleStatus;
  effectiveFrom: string; // YYYY-MM
  effectiveTo?: string;

  // Lương cơ sở & lương tối thiểu vùng làm căn cứ tính trần bảo hiểm
  baseSalaryForCap: number; // Mức lương cơ sở (áp dụng trần BHXH, BHYT tối đa 20 lần)
  regionMinimumWageRegion1: number; // Lương tối thiểu Vùng I (áp dụng trần BHTN tối đa 20 lần)

  // Tỷ lệ trích nộp người lao động (%)
  employeeBhxhRate: number; // 8.0%
  employeeBhytRate: number; // 1.5%
  employeeBhtnRate: number; // 1.0%

  // Tỷ lệ trích nộp người sử dụng lao động (%)
  employerBhxhRate: number; // 17.5%
  employerBhytRate: number; // 3.0%
  employerBhtnRate: number; // 1.0%
  employerTradeUnionRate: number; // 2.0% Kinh phí công đoàn

  // Quy tắc nghỉ không lương
  unpaidLeaveDaysThresholdForExemption: number; // 14 ngày làm việc theo Luật BHXH
}

// ==========================================================
// 1. CÁC PHIÊN BẢN QUY TẮC THUẾ TNCN
// ==========================================================

/**
 * Phiên bản Luật Thuế TNCN hiện hành (7 Bậc)
 * Căn cứ: Luật Thuế TNCN số 04/2007/QH12 & Nghị quyết 954/2020/UBTVQH14
 * TRẠNG THÁI: ĐÃ XÁC MINH PHÁP LÝ (VERIFIED_ACTIVE)
 */
export const STATUTORY_TAX_RULE_LEGACY_7_TIER: StatutoryTaxRule = {
  version: 'LEGACY_7_TIER',
  name: 'Biểu thuế TNCN 7 bậc hiện hành (Nghị quyết 954/2020)',
  legalBasis: 'Nghị quyết 954/2020/UBTVQH14 & Thông tư 111/2013/TT-BTC',
  status: 'VERIFIED_ACTIVE',
  effectiveFrom: '2020-07',
  personalDeductionMonthly: 11_000_000, // 11 triệu đồng / tháng
  dependentDeductionMonthly: 4_400_000, // 4.4 triệu đồng / người / tháng
  brackets: [
    { limit: 5_000_000, rate: 0.05 },
    { limit: 10_000_000, rate: 0.10 },
    { limit: 18_000_000, rate: 0.15 },
    { limit: 32_000_000, rate: 0.20 },
    { limit: 52_000_000, rate: 0.25 },
    { limit: 80_000_000, rate: 0.30 },
    { limit: Infinity, rate: 0.35 },
  ],
  overtimeTaxExemptionMode: 'PREMIUM_ONLY', // Chỉ miễn phần tiền làm thêm vượt quá đơn giá ngày thường
};

/**
 * Phiên bản Dự thảo Luật Thuế TNCN sửa đổi (5 Bậc đề xuất cho 2026)
 * Căn cứ: Dự thảo sửa đổi Luật Thuế TNCN (Chưa được Quốc hội biểu quyết thông qua)
 * TRẠNG THÁI: CHƯA XÁC MINH PHÁP LÝ (UNVERIFIED_DRAFT) - CHỈ DÙNG CHO MÔ PHỎNG / DỰ BÁO
 */
export const STATUTORY_TAX_RULE_PROPOSED_2026_5_TIER: StatutoryTaxRule = {
  version: 'PROPOSED_2026_5_TIER',
  name: 'Dự thảo Biểu thuế TNCN 5 bậc mới (Đề xuất 2026)',
  legalBasis: 'Dự thảo Luật Thuế TNCN sửa đổi (Chưa ban hành chính thức)',
  status: 'UNVERIFIED_DRAFT',
  effectiveFrom: '2026-01',
  personalDeductionMonthly: 15_500_000, // Đề xuất nâng lên 15.5 triệu hoặc giữ 11 triệu
  dependentDeductionMonthly: 6_200_000, // Đề xuất nâng lên 6.2 triệu
  brackets: [
    { limit: 10_000_000, rate: 0.05 },
    { limit: 30_000_000, rate: 0.10 },
    { limit: 60_000_000, rate: 0.20 },
    { limit: 100_000_000, rate: 0.30 },
    { limit: Infinity, rate: 0.35 },
  ],
  overtimeTaxExemptionMode: 'FULL_OT_EXEMPT', // Dự thảo đề xuất miễn toàn bộ tiền làm thêm giờ
};

// ==========================================================
// 2. CÁC PHIÊN BẢN QUY TẮC BẢO HIỂM XÃ HỘI
// ==========================================================

/**
 * Phiên bản Luật BHXH & BHYT hiện hành
 * Căn cứ: Nghị định 73/2024/NĐ-CP (Lương cơ sở 2.340.000đ từ 01/07/2024)
 * và Nghị định 74/2024/NĐ-CP (Lương tối thiểu vùng I: 4.960.000đ)
 * TRẠNG THÁI: ĐÃ XÁC MINH PHÁP LÝ (VERIFIED_ACTIVE)
 */
export const STATUTORY_INSURANCE_RULE_2024_ACTIVE: StatutoryInsuranceRule = {
  version: 'INSURANCE_2024_OFFICIAL',
  name: 'Quy chuẩn đóng BHXH theo NĐ 73/2024 & NĐ 74/2024',
  legalBasis: 'Nghị định 73/2024/NĐ-CP, Nghị định 74/2024/NĐ-CP, Khoản 3 Điều 85 Luật BHXH',
  status: 'VERIFIED_ACTIVE',
  effectiveFrom: '2024-07',
  baseSalaryForCap: 2_340_000, // Trần BHXH/BHYT = 20 * 2.34M = 46.800.000 đ
  regionMinimumWageRegion1: 4_960_000, // Trần BHTN = 20 * 4.96M = 99.200.000 đ
  employeeBhxhRate: 8.0,
  employeeBhytRate: 1.5,
  employeeBhtnRate: 1.0,
  employerBhxhRate: 17.5,
  employerBhytRate: 3.0,
  employerBhtnRate: 1.0,
  employerTradeUnionRate: 2.0,
  unpaidLeaveDaysThresholdForExemption: 14,
};

/**
 * Danh mục toàn bộ các bộ quy tắc trong hệ thống
 */
export const STATUTORY_TAX_RULES_REGISTRY: Record<string, StatutoryTaxRule> = {
  LEGACY_7_TIER: STATUTORY_TAX_RULE_LEGACY_7_TIER,
  PROPOSED_2026_5_TIER: STATUTORY_TAX_RULE_PROPOSED_2026_5_TIER,
};

export const STATUTORY_INSURANCE_RULES_REGISTRY: Record<string, StatutoryInsuranceRule> = {
  INSURANCE_2024_OFFICIAL: STATUTORY_INSURANCE_RULE_2024_ACTIVE,
};

/**
 * Trình giải quyết quy tắc pháp lý theo tháng tính lương (YearMonth Resolver)
 */
export function resolveTaxRuleForPeriod(
  yearMonth: string,
  preferredVersion?: string,
  allowUnverifiedDraft: boolean = false
): StatutoryTaxRule {
  if (preferredVersion && STATUTORY_TAX_RULES_REGISTRY[preferredVersion]) {
    const rule = STATUTORY_TAX_RULES_REGISTRY[preferredVersion];
    if (rule.status === 'UNVERIFIED_DRAFT' && !allowUnverifiedDraft) {
      throw new Error(
        `[SECURITY_AUDIT_GUARD]: Không thể áp dụng bộ quy tắc thuế chưa xác minh (${rule.name}) vào bảng lương chính thức. Vui lòng sử dụng bộ quy tắc đã được ban hành hợp pháp (LEGACY_7_TIER) hoặc bật chế độ mô phỏng thử nghiệm.`
      );
    }
    return rule;
  }

  // Mặc định tự động chọn quy tắc đã xác minh đang có hiệu lực
  return STATUTORY_TAX_RULE_LEGACY_7_TIER;
}

/**
 * Kiểm tra tính hợp lệ pháp lý của một bộ quy tắc trước khi chốt bảng lương (Lock Period)
 */
export function assertRuleReadyForFinalLock(taxRule: StatutoryTaxRule, insuranceRule: StatutoryInsuranceRule): void {
  if (taxRule.status !== 'VERIFIED_ACTIVE') {
    throw new Error(
      `[LEGAL_COMPLIANCE_ERROR]: Không thể chốt khóa sổ (Lock) kỳ lương vì bộ quy tắc thuế [${taxRule.version}] mang trạng thái ${taxRule.status} (Chưa được xác minh pháp lý chính thức). Doanh nghiệp chỉ được khóa sổ khi sử dụng quy tắc thuế đã ban hành.`
    );
  }

  if (insuranceRule.status !== 'VERIFIED_ACTIVE') {
    throw new Error(
      `[LEGAL_COMPLIANCE_ERROR]: Bộ quy tắc bảo hiểm [${insuranceRule.version}] chưa được xác minh pháp lý.`
    );
  }
}
