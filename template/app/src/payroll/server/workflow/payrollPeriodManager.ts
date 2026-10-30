import { HttpError } from '../errors.ts';
import type { AuditLog, PayrollPeriod, PayrollPeriodStatus, PayrollRecord } from '../../types.ts';
import { assertRuleReadyForFinalLock } from '../rules/statutoryRules.ts';
import type { StatutoryInsuranceRule, StatutoryTaxRule } from '../rules/statutoryRules.ts';
import { requireTenantRole } from '../security/authMiddleware.ts';
import type { TenantContext } from '../security/authMiddleware.ts';

export interface StateTransitionResult {
  periodId: string;
  previousStatus: PayrollPeriodStatus;
  newStatus: PayrollPeriodStatus;
  transitionedAt: string;
  transitionedByUserId: string;
  auditLog: AuditLog;
}

/**
 * Ma trận các bước chuyển đổi trạng thái hợp lệ của Kỳ lương (State Transition Matrix)
 */
const VALID_TRANSITIONS: Record<PayrollPeriodStatus, PayrollPeriodStatus[]> = {
  DRAFT: ['REVIEWING'],
  REVIEWING: ['DRAFT', 'LOCKED'],
  LOCKED: ['PAID', 'DRAFT'], // DRAFT chỉ khi được mở khóa bởi OWNER
  PAID: [], // Trạng thái cuối cùng, không thể chuyển đổi
};

/**
 * Kiểm tra xem kỳ lương có cho phép sửa đổi dữ liệu phát sinh (sản lượng, thưởng, tạm ứng) hay không
 */
export function assertPeriodAllowsDataEntry(period: PayrollPeriod): void {
  if (period.status === 'LOCKED' || period.status === 'PAID') {
    throw new HttpError(
      400,
      `Kỳ lương tháng [${period.yearMonth}] hiện đang ở trạng thái [${period.status}] (Đã khóa sổ hoặc Đã chi trả). Mọi hành động chỉnh sửa số liệu bị từ chối để bảo đảm tính toàn vẹn dữ liệu.`
    );
  }
}

/**
 * Kiểm tra tính bất biến của bảng lương: Ngăn chặn sửa đổi âm thầm vào bảng lương đã khóa
 */
export function assertPayrollRecordMutable(record: PayrollRecord, periodStatus: PayrollPeriodStatus): void {
  if (periodStatus === 'LOCKED' || periodStatus === 'PAID') {
    throw new HttpError(
      400,
      `Không thể chỉnh sửa phiếu lương của nhân viên [${record.employeeCode}] vì kỳ lương đã được chốt và khóa sổ.`
    );
  }
}

/**
 * Quản lý chuyển đổi trạng thái kỳ lương an toàn (State Machine Transition Manager)
 */
export function transitionPeriodState(params: {
  period: PayrollPeriod;
  targetStatus: PayrollPeriodStatus;
  tenantContext: TenantContext;
  taxRule: StatutoryTaxRule;
  insuranceRule: StatutoryInsuranceRule;
  recordsCount: number;
  reasonComment?: string;
  allowUnverifiedRulesInSimulation?: boolean;
}): StateTransitionResult {
  const {
    period,
    targetStatus,
    tenantContext,
    taxRule,
    insuranceRule,
    recordsCount,
    reasonComment,
    allowUnverifiedRulesInSimulation = false,
  } = params;

  // 1. Kiểm tra tính hợp lệ của bước chuyển đổi
  const allowedNext = VALID_TRANSITIONS[period.status] || [];
  if (!allowedNext.includes(targetStatus)) {
    throw new HttpError(
      400,
      `Chuyển đổi trạng thái không hợp lệ: Không thể chuyển từ [${period.status}] sang [${targetStatus}]. Các trạng thái cho phép: [${allowedNext.join(', ')}].`
    );
  }

  // 2. Kiểm tra phân quyền tương ứng cho từng trạng thái
  if (targetStatus === 'REVIEWING') {
    // Kế toán hoặc Admin có quyền gửi duyệt
    requireTenantRole(tenantContext, ['OWNER', 'ADMIN', 'ACCOUNTANT'], 'gửi duyệt bảng lương');
    if (recordsCount === 0) {
      throw new HttpError(400, 'Không thể gửi duyệt kỳ lương chưa có dữ liệu nhân viên nào.');
    }
  } else if (targetStatus === 'LOCKED') {
    // Chỉ OWNER hoặc ADMIN mới có quyền phê duyệt và khóa sổ
    requireTenantRole(tenantContext, ['OWNER', 'ADMIN'], 'phê duyệt và khóa sổ bảng lương');

    // Kiểm tra tuân thủ pháp lý: Không cho phép khóa sổ chính thức bằng quy tắc chưa xác minh!
    if (!allowUnverifiedRulesInSimulation) {
      assertRuleReadyForFinalLock(taxRule, insuranceRule);
    }
  } else if (targetStatus === 'PAID') {
    // Kế toán trưởng hoặc Admin xác nhận đã giải ngân
    requireTenantRole(tenantContext, ['OWNER', 'ADMIN', 'ACCOUNTANT'], 'xác nhận chi trả tiền lương');
  } else if (targetStatus === 'DRAFT' && period.status === 'LOCKED') {
    // Mở khóa bảng lương đã chốt: YÊU CẦU QUYỀN OWNER TỐI CAO và PHẢI CÓ LÝ DO
    requireTenantRole(tenantContext, ['OWNER'], 'mở khóa bảng lương đã chốt');
    if (!reasonComment || reasonComment.trim().length < 10) {
      throw new HttpError(
        400,
        'Yêu cầu nhập lý do chi tiết (tối thiểu 10 ký tự) khi mở khóa bảng lương đã chốt để lưu nhật ký kiểm toán.'
      );
    }
  }

  // 3. Tạo bản ghi kiểm toán (Audit Trail)
  const auditLog: AuditLog = {
    id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    tenantId: period.tenantId,
    userId: tenantContext.user.id,
    userName: tenantContext.user.email || 'Admin',
    action: `TRANSITION_PAYROLL_${targetStatus}`,
    scope: 'PAYROLL_WORKFLOW',
    description: `Chuyển trạng thái kỳ lương [${period.yearMonth}] từ [${period.status}] sang [${targetStatus}]. ${reasonComment ? `Lý do: ${reasonComment}` : ''}`,
    createdAt: new Date().toISOString(),
  };

  return {
    periodId: period.id,
    previousStatus: period.status,
    newStatus: targetStatus,
    transitionedAt: new Date().toISOString(),
    transitionedByUserId: tenantContext.user.id,
    auditLog,
  };
}
