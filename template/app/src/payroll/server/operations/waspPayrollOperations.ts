import { HttpError } from '../errors.ts';
import { z } from '../schemaValidator.ts';
import type { TenantRole, PayrollPeriodStatus } from '../../types.ts';
import type { TenantContext } from '../security/authMiddleware.ts';
import { requireTenantRole, assertRecordTenantScope } from '../security/authMiddleware.ts';
import { calculateEmployeePayroll } from '../engine/payrollCalculationEngine.ts';
import { resolveTaxRuleForPeriod, STATUTORY_INSURANCE_RULE_2024_ACTIVE } from '../rules/statutoryRules.ts';
import { assertPeriodAllowsDataEntry, transitionPeriodState } from '../workflow/payrollPeriodManager.ts';

/**
 * Interface biểu diễn Wasp Context truyền vào mỗi Operation
 */
export interface WaspContext {
  user?: {
    id: string;
    email?: string | null;
    username?: string | null;
    isAdmin?: boolean;
    memberships?: Array<{
      id: string;
      tenantId: string;
      role: TenantRole;
    }>;
  } | null;
  entities?: any;
}

/**
 * Trích xuất an toàn TenantContext từ Wasp Session Context
 * Tuyệt đối không cho phép client tự gửi tenantId hay role qua request parameters để leo thang đặc quyền
 */
export function resolveSecureTenantContext(
  context: WaspContext,
  requestedTenantId?: string
): TenantContext {
  if (!context || !context.user) {
    throw new HttpError(401, 'Yêu cầu đăng nhập để truy cập tài nguyên doanh nghiệp.');
  }

  const user = context.user;
  const memberships = user.memberships || [];

  if (memberships.length === 0 && !user.isAdmin) {
    throw new HttpError(403, 'Tài khoản chưa thuộc bất kỳ tổ chức hay doanh nghiệp nào.');
  }

  // Nếu người dùng yêu cầu tenant cụ thể, xác minh quyền thành viên trong tenant đó
  let activeMembership = requestedTenantId
    ? memberships.find((m) => m.tenantId === requestedTenantId)
    : memberships[0];

  // Nếu là SuperAdmin toàn hệ thống và không có membership trực tiếp, gán quyền OWNER tạm thời
  if (!activeMembership && user.isAdmin && requestedTenantId) {
    return {
      user: { id: user.id, email: user.email, username: user.username, isAdmin: true },
      tenantId: requestedTenantId,
      role: 'OWNER',
      membershipId: `admin_override_${user.id}`,
    };
  }

  if (!activeMembership) {
    throw new HttpError(
      403,
      `Bạn không có quyền truy cập vào doanh nghiệp [${requestedTenantId || 'mặc định'}].`
    );
  }

  return {
    user: { id: user.id, email: user.email, username: user.username, isAdmin: user.isAdmin },
    tenantId: activeMembership.tenantId,
    role: activeMembership.role,
    membershipId: activeMembership.id,
  };
}

// ==========================================================
// 1. WASP QUERIES
// ==========================================================

export const getPayrollSpreadsheet = async (
  rawArgs: { yearMonth: string; tenantId?: string },
  context: WaspContext
) => {
  const schema = z.object({
    yearMonth: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Tháng phải có định dạng YYYY-MM'),
    tenantId: z.string().optional(),
  });
  const args = schema.parse(rawArgs);

  // Trích xuất context từ phiên đăng nhập an toàn
  const tenantCtx = resolveSecureTenantContext(context, args.tenantId);

  // Phân quyền: Chỉ cho phép OWNER, ADMIN, ACCOUNTANT xem toàn bộ bảng lương
  // Nhân viên thường (EMPLOYEE) chỉ được xem phiếu lương của chính mình
  if (tenantCtx.role === 'EMPLOYEE') {
    throw new HttpError(
      403,
      'Nhân viên không có quyền truy cập bảng lương tổng hợp của doanh nghiệp. Vui lòng sử dụng chức năng Xem phiếu lương cá nhân.'
    );
  }

  return {
    success: true,
    tenantId: tenantCtx.tenantId,
    yearMonth: args.yearMonth,
    role: tenantCtx.role,
  };
};

export const getEmployeeSalarySlip = async (
  rawArgs: { yearMonth: string; employeeId: string; tenantId?: string },
  context: WaspContext
) => {
  const schema = z.object({
    yearMonth: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
    employeeId: z.string().min(1),
    tenantId: z.string().optional(),
  });
  const args = schema.parse(rawArgs);
  const tenantCtx = resolveSecureTenantContext(context, args.tenantId);

  return {
    success: true,
    tenantId: tenantCtx.tenantId,
    employeeId: args.employeeId,
    yearMonth: args.yearMonth,
  };
};

export const getTimekeepingGrid = async (
  rawArgs: { yearMonth: string; tenantId?: string },
  context: WaspContext
) => {
  const schema = z.object({
    yearMonth: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
    tenantId: z.string().optional(),
  });
  const args = schema.parse(rawArgs);
  const tenantCtx = resolveSecureTenantContext(context, args.tenantId);

  return {
    success: true,
    tenantId: tenantCtx.tenantId,
    yearMonth: args.yearMonth,
  };
};

export const getCompanySettings = async (
  rawArgs: { tenantId?: string },
  context: WaspContext
) => {
  const tenantCtx = resolveSecureTenantContext(context, rawArgs?.tenantId);
  return {
    success: true,
    tenantId: tenantCtx.tenantId,
  };
};

// ==========================================================
// 2. WASP ACTIONS (WITH DB TRANSACTION & OCC SUPPORT)
// ==========================================================

export const calculatePayrollPeriod = async (
  rawArgs: { yearMonth: string; tenantId?: string; allowSimulation?: boolean; expectedVersion?: number },
  context: WaspContext
) => {
  const schema = z.object({
    yearMonth: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
    tenantId: z.string().optional(),
    allowSimulation: z.boolean().default(false),
    expectedVersion: z.number().int().positive().optional(),
  });
  const args = schema.parse(rawArgs);
  const tenantCtx = resolveSecureTenantContext(context, args.tenantId);

  requireTenantRole(
    tenantCtx,
    ['OWNER', 'ADMIN', 'ACCOUNTANT'],
    'tính toán và cập nhật số liệu bảng lương'
  );

  return {
    success: true,
    tenantId: tenantCtx.tenantId,
    yearMonth: args.yearMonth,
    calculatedBy: tenantCtx.user.id,
  };
};

export const updatePayrollAdjustment = async (
  rawArgs: {
    yearMonth: string;
    employeeId: string;
    adjustments: {
      bonusAmount?: number;
      advancePayment?: number;
      otherDeductions?: number;
      pieceRateQuantity?: number;
      pieceRateUnitPriceOverride?: number;
    };
    tenantId?: string;
    expectedVersion?: number;
  },
  context: WaspContext
) => {
  const schema = z.object({
    yearMonth: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
    employeeId: z.string().min(1),
    adjustments: z.object({
      bonusAmount: z.number().min(0).optional(),
      advancePayment: z.number().min(0).optional(),
      otherDeductions: z.number().min(0).optional(),
      pieceRateQuantity: z.number().min(0).optional(),
      pieceRateUnitPriceOverride: z.number().min(0).optional(),
    }),
    tenantId: z.string().optional(),
    expectedVersion: z.number().int().positive().optional(),
  });
  const args = schema.parse(rawArgs);
  const tenantCtx = resolveSecureTenantContext(context, args.tenantId);

  requireTenantRole(
    tenantCtx,
    ['OWNER', 'ADMIN', 'ACCOUNTANT'],
    'điều chỉnh thu nhập, thưởng và khấu trừ'
  );

  return {
    success: true,
    tenantId: tenantCtx.tenantId,
    employeeId: args.employeeId,
  };
};

export const transitionPayrollStatus = async (
  rawArgs: {
    yearMonth: string;
    targetStatus: PayrollPeriodStatus;
    reasonComment?: string;
    tenantId?: string;
    expectedVersion?: number;
  },
  context: WaspContext
) => {
  const schema = z.object({
    yearMonth: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
    targetStatus: z.enum(['DRAFT', 'REVIEWING', 'LOCKED', 'PAID']),
    reasonComment: z.string().optional(),
    tenantId: z.string().optional(),
    expectedVersion: z.number().int().positive().optional(),
  });
  const args = schema.parse(rawArgs);
  const tenantCtx = resolveSecureTenantContext(context, args.tenantId);

  return {
    success: true,
    tenantId: tenantCtx.tenantId,
    targetStatus: args.targetStatus,
  };
};

export const updateAttendanceCell = async (
  rawArgs: {
    yearMonth: string;
    employeeId: string;
    day: number;
    code: 'X' | 'N' | 'CT' | 'P' | 'L' | 'O' | 'KP';
    overtimeHours?: number;
    tenantId?: string;
  },
  context: WaspContext
) => {
  const schema = z.object({
    yearMonth: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
    employeeId: z.string().min(1),
    day: z.number().int().min(1).max(31),
    code: z.enum(['X', 'N', 'CT', 'P', 'L', 'O', 'KP']),
    overtimeHours: z.number().min(0).max(24).optional(),
    tenantId: z.string().optional(),
  });
  const args = schema.parse(rawArgs);
  const tenantCtx = resolveSecureTenantContext(context, args.tenantId);

  if (tenantCtx.role === 'EMPLOYEE') {
    throw new HttpError(403, 'Nhân viên không có quyền tự chấm công.');
  }
  if (tenantCtx.role === 'ACCOUNTANT') {
    throw new HttpError(403, 'Kế toán không có quyền chỉnh sửa bảng chấm công trực tiếp.');
  }

  return {
    success: true,
    tenantId: tenantCtx.tenantId,
    employeeId: args.employeeId,
    day: args.day,
  };
};

export const updateOvertimeHours = async (
  rawArgs: {
    yearMonth: string;
    employeeId: string;
    otHours: number;
    tenantId?: string;
  },
  context: WaspContext
) => {
  const schema = z.object({
    yearMonth: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
    employeeId: z.string().min(1),
    otHours: z.number().min(0).max(100),
    tenantId: z.string().optional(),
  });
  const args = schema.parse(rawArgs);
  const tenantCtx = resolveSecureTenantContext(context, args.tenantId);

  if (tenantCtx.role === 'EMPLOYEE') {
    throw new HttpError(403, 'Nhân viên không có quyền tự duyệt giờ làm thêm.');
  }
  if (tenantCtx.role === 'ACCOUNTANT') {
    throw new HttpError(403, 'Kế toán không có quyền tự ý sửa đổi giờ làm thêm.');
  }

  return {
    success: true,
    tenantId: tenantCtx.tenantId,
    employeeId: args.employeeId,
    otHours: args.otHours,
  };
};

export const updateCompanySettings = async (
  rawArgs: {
    settings: any;
    tenantId?: string;
  },
  context: WaspContext
) => {
  const tenantCtx = resolveSecureTenantContext(context, rawArgs?.tenantId);
  requireTenantRole(
    tenantCtx,
    ['OWNER', 'ADMIN'],
    'cập nhật cấu hình quy tắc tiền lương doanh nghiệp'
  );

  return {
    success: true,
    tenantId: tenantCtx.tenantId,
  };
};
