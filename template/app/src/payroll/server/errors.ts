/**
 * Chuẩn hóa lỗi HTTP cho toàn bộ các server operations phân hệ chấm công & tính lương
 * Tương thích hoàn toàn với Wasp HttpError và chạy được trong mọi môi trường Node.js / kiểm thử độc lập
 */
export class HttpError extends Error {
  statusCode: number;
  data?: unknown;

  constructor(statusCode: number, message?: string, data?: unknown) {
    super(message);
    this.name = 'HttpError';
    this.statusCode = statusCode;
    this.data = data;
    Object.setPrototypeOf(this, HttpError.prototype);
  }
}
