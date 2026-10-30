# PLATFORM ADMIN USER GUIDE — HƯỚNG DẪN QUẢN TRỊ NỀN TẢNG SAAS
**Dự án:** Phần mềm Quản trị Chấm công, Nhân sự & Tính lương B2B SaaS  
**Phiên bản hệ thống:** 1.0.0-RC1  
**Ngày lập tài liệu:** 2026-10-25  
**Đối tượng sử dụng:** Đội ngũ Vận hành Nền tảng (Platform Operations & System Admins)  

---

## 1. PHÂN ĐỊNH RANH GIỚI QUẢN TRỊ (SEPARATION OF POWERS)

Hệ thống phân chia ranh giới quản trị thành 2 cấp độ hoàn toàn độc lập:

1. **Quản trị Tổ chức khách hàng (Tenant Administration):**
   - Người dùng: Giám đốc, Kế toán, HR của từng công ty khách hàng.
   - Thẩm quyền: Chỉ thao tác trên dữ liệu nội bộ của chính công ty mình thông qua trang Cài đặt (Nhóm A).
2. **Quản trị Nền tảng SaaS (Platform SuperAdmin):**
   - Người dùng: Kỹ sư vận hành của đơn vị cung cấp SaaS (`User.isAdmin = true`).
   - Thẩm quyền: Quản lý hạ tầng máy chủ, vòng đời tài khoản tổ chức (Kích hoạt/Tạm khóa), gói cước thuê bao, giám sát an ninh toàn cục.
   - **Ranh giới bất biến:** Quản trị viên nền tảng **KHÔNG ĐƯỢC PHÉP tự ý đọc bảng lương chi tiết hoặc thông tin nhân sự nhạy cảm của khách hàng** nếu không có phiên hỗ trợ kỹ thuật được ủy quyền chính thức.

---

## 2. QUẢN LÝ VÒNG ĐỜI TỔ CHỨC KHÁCH HÀNG (TENANT LIFECYCLE)

### 2.1. Khởi tạo Tổ chức mới (Provisioning a New Tenant)
Khi một khách hàng doanh nghiệp ký hợp đồng sử dụng dịch vụ:
1. Đăng nhập trang Quản trị Nền tảng tại `https://app.yourdomain.com/admin`.
2. Truy cập menu **Quản lý Tổ chức (Organizations / Tenants)** $\rightarrow$ Bấm **"Tạo tổ chức mới"**.
3. Điền các trường thông tin:
   - *Tên tổ chức:* Tên đầy đủ của công ty khách hàng.
   - *Mã định danh (Slug):* Chuỗi viết liền không dấu duy nhất (ví dụ: `fpt-software`).
   - *Gói cước (Plan):* Chọn `PRO` hoặc `ENTERPRISE`.
   - *Email đại diện quản trị:* Email của Giám đốc hoặc Trưởng ban triển khai của khách hàng.
4. Bấm **"Khởi tạo & Gửi thư mời kích hoạt"**. Hệ thống sẽ tự động gửi email chứa liên kết thiết lập mật khẩu an toàn cho người đại diện.

### 2.2. Tạm đình chỉ Tổ chức (Tenant Suspension SOP)
Khi khách hàng quá hạn thanh toán cước phí hoặc vi phạm điều khoản dịch vụ:
1. Trong danh sách Tổ chức, tìm kiếm theo tên hoặc mã `tenantId`.
2. Chuyển trạng thái cờ hoạt động từ `isActive = true` sang **`isActive = false`**.
3. Điền lý do tạm khóa (ví dụ: *Quá hạn thanh toán hợp đồng số HD-2026/01*).
4. **Hiệu lực kỹ thuật tức thì:**
   - Hàm `assertTenantActive` tại tầng `TenantScopedRepository` sẽ lập tức chặn đứng mọi thao tác đọc/ghi của toàn bộ nhân viên thuộc tổ chức này với mã lỗi `403 Forbidden`.
   - Toàn bộ dữ liệu của khách hàng vẫn được bảo toàn nguyên vẹn trong cơ sở dữ liệu và sẵn sàng hoạt động trở lại ngay khi được kích hoạt lại.

---

## 3. GIAO THỨC ỦY QUYỀN HỖ TRỢ KỸ THUẬT CÓ KIỂM TOÁN (AUDITED SUPPORT IMPERSONATION)

Khi khách hàng gặp sự cố phức tạp và yêu cầu kỹ thuật viên đăng nhập vào không gian của họ để hỗ trợ:

> [!CAUTION]
> **QUY TẮC AN NINH:** Nghiêm cấm kỹ thuật viên tự ý đăng nhập vào không gian của khách hàng nếu không có Mã vé hỗ trợ (Support Ticket ID) và văn bản đồng ý của khách hàng!

### Quy trình thực hiện:
1. **Tiếp nhận yêu cầu:** Khách hàng gửi yêu cầu hỗ trợ chính thức qua email hoặc hệ thống Helpdesk.
2. **Kích hoạt phiên ủy quyền:** Quản trị viên nhập mã vé hỗ trợ (ví dụ: `TICKET-8892`) vào màn hình quản trị và bấm **"Bắt đầu phiên hỗ trợ có kiểm toán"**.
3. **Cơ chế ghi nhận vết an ninh:**
   - Hệ thống tự động tạo một phiên làm việc tạm thời có thời hạn tối đa 60 phút.
   - Toàn bộ các thao tác xem, sửa dữ liệu trong phiên này đều được gắn nhãn `[SUPPORT_ACCESS]` và ghi vết chi tiết vào bảng `AuditLog` để khách hàng có thể tra soát bất kỳ lúc nào.
4. **Kết thúc phiên hỗ trợ:** Bấm **"Đóng phiên hỗ trợ"** ngay khi hoàn thành xử lý sự cố.

---

## 4. GIÁM SÁT AN NINH & NHẬT KÝ KIỂM TOÁN HỆ THỐNG (AUDIT LOG MONITORING)

Quản trị viên có trách nhiệm định kỳ rà soát các bảng dữ liệu an ninh:
1. **Bảng `AuditLog`:**
   - Theo dõi các hành vi nhạy cảm: `LOCK_PAYROLL`, `APPROVE_PAYROLL`, `EXPORT_DATA`, `CHANGE_SECURITY_SETTINGS`.
   - Kiểm tra các lượt truy cập bất thường từ địa chỉ IP lạ hoặc ngoài giờ hành chính.
2. **Bảng `ImportExportJob`:**
   - Giám sát các tiến trình import/export file dung lượng lớn.
   - Phát hiện các nỗ lực tải lên file có tên lạ hoặc phần mở rộng bị bộ lọc an ninh chặn đứng (`TC-SEC-01`, `TC-SEC-02`).
3. **Giám sát tải hệ thống:**
   - Theo dõi số lượng kết nối Database Connection qua Supavisor/PGBouncer, đảm bảo không vượt quá 80% giới hạn tối đa của máy chủ cơ sở dữ liệu.
