import type { AuditLog, CompanySetting, ConfigurationVersion } from '../../types.ts';
import { HttpError } from '../errors.ts';
import { z } from '../schemaValidator.ts';
import { requireTenantRole } from '../security/authMiddleware.ts';
import type { TenantContext } from '../security/authMiddleware.ts';

export const updateCompanySettingsSchema = z.object({
  tenantId: z.string().min(1),
  settings: z.object({
    standardWorkingDays: z.number().min(20).max(28).optional(),
    standardWorkingHours: z.number().min(6).max(10).optional(),
    overtimeRateNormal: z.number().min(1.0).max(3.0).optional(),
    overtimeRateWeekend: z.number().min(1.5).max(4.0).optional(),
    overtimeRateHoliday: z.number().min(2.0).max(5.0).optional(),
    maxAllowedUnpaidDays: z.number().min(0).max(10).optional(),
    weekendDaysSetting: z.enum(['CN', 'T7CN']).optional(),
    lunchAllowanceTaxExemptLimit: z.number().min(0).max(5_000_000).optional(),
    salaryRoundingRule: z.enum(['ROUND_1000', 'ROUND_100', 'NO_ROUND']).optional(),
    taxBracketVersion: z.enum(['2026_5_TIER', 'LEGACY_7_TIER']).optional(),
  }),
  auditComment: z.string().min(5, 'Vui lòng nhập lý do điều chỉnh cấu hình (tối thiểu 5 ký tự)'),
});

export const getAuditLogsSchema = z.object({
  tenantId: z.string().min(1),
  scope: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(50),
});

/**
 * Cập nhật cấu hình doanh nghiệp có kiểm soát, tạo phiên bản cấu hình và lưu vết kiểm toán
 */
export function executeUpdateCompanySettings(params: {
  tenantContext: TenantContext;
  currentSettings: CompanySetting;
  newSettingsData: Partial<CompanySetting>;
  auditComment: string;
}): { updatedSettings: CompanySetting; configVersion: ConfigurationVersion; auditLog: AuditLog } {
  const { tenantContext, currentSettings, newSettingsData, auditComment } = params;

  // 1. Kiểm tra phân quyền:
  // Nếu thay đổi các quy tắc Nhóm B (Biểu thuế, trần bảo hiểm) -> Yêu cầu quyền OWNER hoặc ADMIN tối cao
  const isChangingGroupBRules = newSettingsData.taxBracketVersion !== undefined;
  if (isChangingGroupBRules) {
    requireTenantRole(tenantContext, ['OWNER', 'ADMIN'], 'thay đổi quy tắc Thuế và Bảo hiểm (Nhóm B)');
  } else {
    requireTenantRole(tenantContext, ['OWNER', 'ADMIN', 'HR_MANAGER'], 'thay đổi quy chế làm việc & phụ cấp (Nhóm A)');
  }

  // 2. Validate ràng buộc logic
  if (newSettingsData.standardWorkingDays !== undefined) {
    if (newSettingsData.standardWorkingDays < 20 || newSettingsData.standardWorkingDays > 28) {
      throw new HttpError(400, 'Số ngày công chuẩn trong tháng phải nằm trong khoảng từ 20 đến 28 ngày.');
    }
  }

  if (newSettingsData.lunchAllowanceTaxExemptLimit !== undefined) {
    if (newSettingsData.lunchAllowanceTaxExemptLimit < 0) {
      throw new HttpError(400, 'Định mức ăn trưa không được là số âm.');
    }
  }

  // 3. Tạo bản ghi mới cập nhật
  const updatedSettings: CompanySetting = {
    ...currentSettings,
    ...newSettingsData,
  };

  // 4. Lưu phiên bản cấu hình có hiệu lực (Configuration Versioning)
  const configVersion: ConfigurationVersion = {
    id: `ver_${Date.now()}`,
    tenantId: tenantContext.tenantId,
    category: isChangingGroupBRules ? 'TAX_INSURANCE_POLICY' : 'WORKING_POLICY',
    effectiveFrom: new Date().toISOString(),
    configJson: JSON.stringify(updatedSettings),
    createdById: tenantContext.user.id,
    comment: auditComment,
  };

  // 5. Lưu vết kiểm toán (Audit Trail)
  const auditLog: AuditLog = {
    id: `audit_${Date.now()}_set`,
    tenantId: tenantContext.tenantId,
    userId: tenantContext.user.id,
    userName: tenantContext.user.email || 'Admin',
    action: 'UPDATE_COMPANY_SETTINGS',
    scope: isChangingGroupBRules ? 'GROUP_B_STATUTORY' : 'GROUP_A_SETTINGS',
    description: `Cập nhật cài đặt doanh nghiệp: ${auditComment}`,
    createdAt: new Date().toISOString(),
  };

  return { updatedSettings, configVersion, auditLog };
}
