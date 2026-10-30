import type { TenantRole } from '../../types.ts';
import { HttpError } from '../errors.ts';

export interface User {
  id: string;
  email?: string | null;
  username?: string | null;
  isAdmin?: boolean;
}

/**
 * Interface biểu diễn thông tin thành viên và vai trò trong ngữ cảnh doanh nghiệp (Tenant)
 */
export interface TenantContext {
  user: User;
  tenantId: string;
  role: TenantRole;
  membershipId: string;
}

/**
 * Xác minh người dùng đã đăng nhập vào hệ thống
 */
export function requireAuthUser(user?: User | null): User {
  if (!user) {
    throw new HttpError(401, 'Yêu cầu đăng nhập để thực hiện tác vụ này.');
  }
  return user;
}

/**
 * Ma trận quyền phân cấp 6 vai trò trong doanh nghiệp
 * ORG_OWNER (100) > ORG_ADMIN (80) > HR_MANAGER / ACCOUNTANT (60) > DEPARTMENT_MANAGER (40) > EMPLOYEE (20)
 */
export const ROLE_HIERARCHY: Record<string, number> = {
  ORG_OWNER: 100,
  OWNER: 100,
  ORG_ADMIN: 80,
  ADMIN: 80,
  ACCOUNTANT: 60,
  HR_MANAGER: 60,
  DEPARTMENT_MANAGER: 40,
  EMPLOYEE: 20,
};

/**
 * Kiểm tra xem người dùng có thuộc về doanh nghiệp và có một trong các vai trò cho phép hay không
 */
export function hasRequiredRole(userRole: TenantRole | string, allowedRoles: (TenantRole | string)[]): boolean {
  if (userRole === 'ORG_OWNER' || userRole === 'OWNER') return true; // OWNER luôn có toàn quyền trong tenant
  // Chấp nhận cả dạng alias (ADMIN <-> ORG_ADMIN)
  if (userRole === 'ORG_ADMIN' && allowedRoles.includes('ADMIN')) return true;
  if (userRole === 'ADMIN' && allowedRoles.includes('ORG_ADMIN')) return true;
  return allowedRoles.includes(userRole as any);
}

/**
 * Xác minh và kiểm tra quyền của người dùng trong Tenant.
 * Nếu không hợp lệ sẽ ném lỗi HttpError 403 an toàn.
 */
export function requireTenantRole(
  tenantContext: TenantContext,
  allowedRoles: TenantRole[],
  actionDescription: string = 'thực hiện thao tác này'
): void {
  if (!hasRequiredRole(tenantContext.role, allowedRoles)) {
    throw new HttpError(
      403,
      `Bạn không có quyền ${actionDescription}. Yêu cầu vai trò: [${allowedRoles.join(', ')}], vai trò hiện tại: [${tenantContext.role}].`
    );
  }
}

/**
 * Đảm bảo bản ghi nghiệp vụ (nhân viên, bảng công, bảng lương) thuộc đúng tenant của người dùng
 * Ngăn chặn tuyệt đối lỗ hổng IDOR (Insecure Direct Object Reference) / Truy cập chéo doanh nghiệp
 */
export function assertRecordTenantScope<T extends { tenantId: string }>(
  record: T | null | undefined,
  expectedTenantId: string,
  entityName: string = 'Bản ghi'
): T {
  if (!record) {
    throw new HttpError(404, `${entityName} không tồn tại hoặc đã bị xóa.`);
  }

  if (record.tenantId !== expectedTenantId) {
    // Trả về lỗi 403 an toàn, không làm lộ việc bản ghi tồn tại ở tenant khác
    throw new HttpError(403, `Bạn không có quyền truy cập ${entityName} của doanh nghiệp khác.`);
  }

  return record;
}

/**
 * Chuẩn hóa và làm sạch thông báo lỗi, loại bỏ stack trace và thông tin nhạy cảm trước khi trả về client
 */
export function sanitizeErrorMessage(error: unknown): string {
  if (error instanceof HttpError) {
    return error.message;
  }
  if (error instanceof Error) {
    console.error('[SERVER_ERROR_INTERNAL]:', error);
    return 'Đã xảy ra lỗi trong quá trình xử lý yêu cầu. Vui lòng liên hệ quản trị viên.';
  }
  return 'Lỗi không xác định.';
}
