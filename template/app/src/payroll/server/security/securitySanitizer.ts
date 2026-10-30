import { HttpError } from '../errors.ts';
import type { Employee, Tenant } from '../../types.ts';

/**
 * Danh sách phần mở rộng tệp tin được phép tải lên hệ thống (Allowlist)
 */
export const ALLOWED_FILE_EXTENSIONS = ['xlsx', 'xls', 'csv', 'pdf', 'png', 'jpg', 'jpeg'];

/**
 * Kiểm tra tính hợp lệ và an toàn của tên tệp tin tải lên
 * Ngăn chặn triệt để lỗ hổng Path Traversal (../, ..\), Null-byte injection (\0) và tệp thực thi nguy hiểm (.exe, .sh, .bat)
 */
export function validateUploadedFileName(fileName: string): {
  isValid: boolean;
  sanitizedName: string;
  extension: string;
} {
  if (!fileName || typeof fileName !== 'string') {
    throw new HttpError(400, 'Tên tệp tin không hợp lệ hoặc để trống.');
  }

  // 1. Chặn Path Traversal và Null-byte injection
  if (
    fileName.includes('..') ||
    fileName.includes('/') ||
    fileName.includes('\\') ||
    fileName.includes('\0') ||
    fileName.includes('%00')
  ) {
    throw new HttpError(
      400,
      'Tên tệp tin chứa ký tự đường dẫn hoặc ký tự điều khiển nguy hiểm (Path Traversal).'
    );
  }

  // 2. Giới hạn độ dài tên tệp
  if (fileName.length > 255) {
    throw new HttpError(400, 'Tên tệp tin vượt quá độ dài tối đa cho phép (255 ký tự).');
  }

  // 3. Trích xuất và kiểm tra phần mở rộng theo Allowlist
  const match = fileName.match(/\.([a-zA-Z0-9]+)$/);
  if (!match) {
    throw new HttpError(400, 'Tệp tin bắt buộc phải có phần mở rộng hợp lệ.');
  }

  const extension = match[1].toLowerCase();
  if (!ALLOWED_FILE_EXTENSIONS.includes(extension)) {
    throw new HttpError(
      400,
      `Định dạng tệp ".${extension}" không được phép tải lên. Các định dạng hỗ trợ: [${ALLOWED_FILE_EXTENSIONS.join(', ')}].`
    );
  }

  // 4. Làm sạch tên tệp, thay thế ký tự lạ bằng dấu gạch dưới
  const sanitizedName = fileName.replace(/[^a-zA-Z0-9._\-]/g, '_');

  return {
    isValid: true,
    sanitizedName,
    extension,
  };
}

/**
 * Kiểm tra trạng thái hoạt động của doanh nghiệp (Tenant Suspension Guard)
 * Ngăn chặn người dùng thuộc doanh nghiệp bị khóa hoặc nợ cước thực hiện thao tác
 */
export function assertTenantActive(tenant: Tenant | null | undefined, tenantId?: string): void {
  if (!tenant) {
    throw new HttpError(404, `Doanh nghiệp [${tenantId || 'Không xác định'}] không tồn tại trong hệ thống.`);
  }

  if (tenant.isActive === false) {
    throw new HttpError(
      403,
      `Tài khoản doanh nghiệp "${tenant.name}" hiện đang bị tạm khóa hoặc chưa kích hoạt gói cước. Vui lòng liên hệ Quản trị viên để được hỗ trợ.`
    );
  }
}

/**
 * Che giấu số Căn cước công dân (CCCD / CMND) để bảo vệ quyền riêng tư dữ liệu cá nhân
 * Ví dụ: 001099123456 -> 001******456
 */
export function maskIdCardNumber(idCard?: string | null): string | null {
  if (!idCard) return null;
  const trimmed = idCard.trim();
  if (trimmed.length < 8) return '***';
  const prefix = trimmed.substring(0, 3);
  const suffix = trimmed.substring(trimmed.length - 3);
  return `${prefix}${'*'.repeat(trimmed.length - 6)}${suffix}`;
}

/**
 * Che giấu số tài khoản ngân hàng
 * Ví dụ: 19033445566778 -> **********6778
 */
export function maskBankAccountNumber(accountNumber?: string | null): string | null {
  if (!accountNumber) return null;
  const trimmed = accountNumber.trim();
  if (trimmed.length <= 4) return '****';
  const suffix = trimmed.substring(trimmed.length - 4);
  return `${'*'.repeat(trimmed.length - 4)}${suffix}`;
}

/**
 * Làm sạch và che giấu dữ liệu định danh nhạy cảm (PII Sanitization) trước khi trả về cho vai trò không có đặc quyền
 */
export function sanitizeEmployeePii(
  employee: Employee,
  isPrivilegedRole: boolean = false
): Employee {
  if (isPrivilegedRole) {
    return employee; // Quản trị viên hoặc nhân sự có quyền xem đầy đủ
  }

  return {
    ...employee,
    idCardNumber: maskIdCardNumber(employee.idCardNumber) || undefined,
    bankAccountNumber: maskBankAccountNumber(employee.bankAccountNumber) || undefined,
  };
}

/**
 * Mã hóa ký tự đặc biệt HTML nhằm chống triệt để lỗ hổng Cross-Site Scripting (XSS)
 */
export function escapeHtml(str: unknown): string {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Làm sạch ô dữ liệu xuất CSV chống lỗ hổng CSV / Formula Injection
 * Ngăn chặn trình đọc bảng tính (Excel/Calc) kích hoạt công thức nguy hiểm
 */
export function sanitizeCsvCell(val: unknown): string {
  if (val === null || val === undefined) return '';
  let str = String(val);
  // Nếu bắt đầu bằng các tiền tố công thức =, +, -, @, tab hoặc CR, thêm nháy đơn phía trước
  if (/^[=\+\-@\t\r]/.test(str)) {
    str = "'" + str;
  }
  return str.replace(/"/g, '""');
}

