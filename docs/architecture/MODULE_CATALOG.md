# DANH MỤC PHÂN HỆ VÀ MODULE CHỨC NĂNG (MODULE CATALOG)

---

## 1. TỔNG QUAN PHÂN BỔ MODULE TRONG HỆ THỐNG

Hệ thống được chia thành 3 nhóm phân hệ chính:
1. **Core Platform Modules:** Kế thừa và mở rộng từ bộ khung Open SaaS (Xác thực, thanh toán, upload, email, admin).
2. **Domain Business Modules:** Xây dựng mới hoàn toàn cho nghiệp vụ Chấm công, Nhân sự và Tính lương.
3. **Commercial Extensibility Modules:** Các module mở rộng thương mại sẵn sàng cắm thêm trong tương lai khi bán cho khách hàng lớn.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        1. CORE PLATFORM MODULES                        │
│   Auth  │  Tenant & Membership  │  Billing  │  Storage  │  Email  │ Admin│
└────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        2. DOMAIN BUSINESS MODULES                      │
│   HR Master  │  Attendance  │  Payroll Engine  │  Tax & SHUI  │ Settings │
└────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                  3. COMMERCIAL EXTENSIBILITY MODULES (TƯƠNG LAI)       │
│   FaceID/IoT Sync │ E-Contract │ Advance Loan (EWA) │ KPI/Performance  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. CHI TIẾT CÁC PHÂN HỆ NỀN TẢNG (CORE PLATFORM MODULES)

| Mã Module | Tên Module | Nguồn gốc | Vai trò & Khả năng tái sử dụng |
| :--- | :--- | :---: | :--- |
| **MOD-CORE-01** | **Authentication (Xác thực)** | Open SaaS (`src/auth`) | Tái sử dụng nguyên bản cơ chế Wasp Auth: Đăng nhập/đăng ký bằng Email & Mật khẩu, xác thực email qua link, đặt lại mật khẩu, đăng nhập mạng xã hội (Google OAuth). |
| **MOD-CORE-02** | **Tenant & Organization (Đa doanh nghiệp)** | Mở rộng từ Open SaaS | Xây dựng mới trên nền Wasp: Cho phép người dùng tạo công ty, chuyển đổi giữa các công ty (Organization Switcher), mời thành viên qua email và gán vai trò (`OWNER`, `ADMIN`, `ACCOUNTANT`, `HR_MANAGER`, `EMPLOYEE`). |
| **MOD-CORE-03** | **Subscription & Billing (Gói thuê bao)** | Open SaaS (`src/payment`) | Tái sử dụng tích hợp Stripe / LemonSqueezy / Paddle có sẵn để thu phí thuê bao theo tháng/năm của từng công ty khách hàng. |
| **MOD-CORE-04** | **File Storage Gateway (Lưu trữ tệp)** | Open SaaS (`src/file-upload`) | Tái sử dụng `@aws-sdk/client-s3` kết nối với Supabase Storage: Tải lên logo công ty, hợp đồng lao động dạng PDF, avatar nhân viên, tệp đính kèm. |
| **MOD-CORE-05** | **Email Notification Service** | Open SaaS (`src/server/emailSender`) | Tái sử dụng trình gửi email Wasp qua SendGrid/SMTP: Gửi email kích hoạt tài khoản, lời mời tham gia doanh nghiệp và gửi thông báo phiếu lương tháng cho người lao động. |
| **MOD-CORE-06** | **Super Admin Dashboard** | Open SaaS (`src/admin`) | Tái sử dụng trang quản trị cấp cao của Open SaaS để giám sát số lượng doanh nghiệp đăng ký, số lượng nhân sự active toàn hệ thống, doanh thu thuê bao và nhật ký lỗi. |

---

## 3. CHI TIẾT CÁC PHÂN HỆ NGHIỆP VỤ (DOMAIN BUSINESS MODULES)

### 3.1. Phân hệ Quản lý Nhân sự (HR Master Module - `MOD-HR`)
* **Thành phần:**
  * `EmployeeList`: Danh sách nhân viên có lọc theo phòng ban, chức vụ, trạng thái.
  * `EmployeeDetailModal`: Form chi tiết thêm/sửa nhân viên bằng Shadcn Form + Zod.
  * `ExcelImportParser`: Bộ xử lý đọc file `.xlsx` / paste clipboard thông minh, tự động nhận dạng tên cột tiếng Việt và giải quyết xung đột mã.
  * `ExcelExporter`: Xuất danh sách nhân viên ra Excel chuẩn format.
* **Quyền truy cập:** `OWNER`, `ADMIN`, `HR_MANAGER` (Toàn quyền); `ACCOUNTANT` (Xem thông tin lương); `EMPLOYEE` (Xem thông tin cá nhân).

### 3.2. Phân hệ Quản lý Chấm công (Timekeeping Module - `MOD-ATT`)
* **Thành phần:**
  * `AttendanceCalendarGrid`: Lưới chấm công tháng với cột cố định nhân viên, tự tô màu ngày nghỉ tuần và ngày lễ.
  * `BrushToolbar`: Thanh công cụ cọ vẽ chấm công trực quan bằng chuột (X, N, CT, P, L, O, KP, Tẩy).
  * `QuickFillAction`: Điền nhanh ký hiệu công X cho các ngày làm việc trống.
  * `OvertimeTracker`: Cột nhập giờ làm thêm (OT) tích lũy trong tháng.
  * `WorkdaySummarizer`: Động cơ tổng hợp ngày công làm việc, nghỉ phép, nghỉ không lương và công hưởng lương.
  * `AttendancePrintView`: Mẫu in bảng chấm công chuẩn A4 ngang có đầy đủ chữ ký 3 bên.
* **Quyền truy cập:** `OWNER`, `ADMIN`, `HR_MANAGER` (Chấm công & chỉnh sửa); `ACCOUNTANT` (Xem dữ liệu để tính lương); `EMPLOYEE` (Xem bảng công cá nhân).

### 3.3. Phân hệ Tính Lương & Phiếu Lương (Payroll Engine Module - `MOD-PAY`)
* **Thành phần:**
  * `LivePayrollSpreadsheet`: Bảng tính lương tự động đa cột dạng bảng tính, hỗ trợ chỉnh sửa trực tiếp các ô màu vàng (Sản lượng, Đơn giá override, Thưởng, Tạm ứng, Khấu trừ).
  * `PayrollCalculationEngine`: Động cơ tính lương thuần túy (Pure TypeScript Service):
    * Tính lương thời gian theo ngày công.
    * Tính phụ cấp chuyên cần (kiểm tra điều kiện số ngày nghỉ tối đa).
    * Tính phụ cấp thâm niên (nhân số năm công tác).
    * Tính lương sản phẩm và làm thêm giờ OT.
    * Trích nộp bảo hiểm bắt buộc theo trần lương cơ sở và quy tắc miễn đóng 14 ngày.
    * Khấu trừ thuế TNCN lũy tiến từng phần.
    * Tính tiền thực lĩnh và chuyển đổi số tiền thành chữ (`docSo`).
  * `PayrollPeriodManager`: Quản lý trạng thái chu kỳ lương (`DRAFT`, `REVIEWING`, `LOCKED`).
  * `PayslipViewer & BulkPrinter`: Trình hiển thị và in phiếu lương cá nhân (đơn lẻ hoặc in toàn công ty).
* **Quyền truy cập:** `OWNER`, `ACCOUNTANT` (Toàn quyền tính lương, nhập số phát sinh, khóa kỳ lương); `ADMIN` (Xem); `EMPLOYEE` (Chỉ xem phiếu lương cá nhân).

### 3.4. Phân hệ Thuế TNCN & Bảo hiểm (Tax & SHUI Module - `MOD-TAX`)
* **Thành phần:**
  * `AnnualTaxSummary`: Báo cáo thuế TNCN và bảo hiểm 12 tháng phục vụ quyết toán thuế năm.
  * `GrossNetCalculator`: Công cụ tính nhanh lương Gross ⇄ Net hai chiều sử dụng thuật toán tìm kiếm nhị phân (Binary Search).
  * `TaxBracketConfigurator`: Bảng cấu hình mức giảm trừ gia cảnh và các bậc thuế suất lũy tiến theo mốc thời gian áp dụng (Effective Dating).
* **Quyền truy cập:** `OWNER`, `ACCOUNTANT` (Toàn quyền); `ADMIN`, `HR_MANAGER` (Xem báo cáo).

### 3.5. Phân hệ Cài đặt & Cấu hình Doanh nghiệp (Settings Module - `MOD-SET`)
* **Thành phần:**
  * `CompanyProfileSettings`: Cài đặt thông tin công ty, logo, địa chỉ, người ký biểu mẫu.
  * `WorkingRuleSettings`: Cài đặt công chuẩn/tháng (24/26/28), giờ công/ngày (8h), hệ số OT, ngày nghỉ tuần.
  * `DepartmentManager`: Quản lý danh mục phòng ban và chức danh.
  * `InsuranceRateSettings`: Quản lý tỷ lệ đóng bảo hiểm phần NLĐ và DN, mức lương cơ sở và lương tối thiểu vùng.
  * `AuditLogViewer`: Trình tra cứu nhật ký thao tác và thay đổi hệ thống.
* **Quyền truy cập:** `OWNER`, `ADMIN` (Cấu hình công ty, quy tắc công); `OWNER` (Cấu hình thuế & phê duyệt nhạy cảm).

---

## 4. DANH MỤC MODULE MỞ RỘNG THƯƠNG MẠI TRONG TƯƠNG LAI (COMMERCIAL EXTENSIONS)

Kiến trúc hệ thống được thiết kế theo các **Cổng cắm (Extension Points / Hooks)** để sau này mở rộng thành các gói bán hàng cao cấp mà không phá vỡ lõi phần mềm hiện tại:

1. **Module Đồng bộ Máy chấm công (Biometric Device Sync):**
   * Kết nối với máy chấm công vân tay, thẻ từ, FaceID (ZKTeco, Ronald Jack, Hikvision) qua API hoặc Desktop Agent để tự động đổ dữ liệu chấm công về lưới lịch mà không cần nhập tay.
2. **Module Hợp đồng Lao động Điện tử (E-Contract):**
   * Quản lý hợp đồng thử việc, hợp đồng xác định thời hạn/không thời hạn; tự động cảnh báo khi sắp hết hạn hợp đồng; ký số điện tử online.
3. **Module Ứng lương Linh hoạt (Earned Wage Access - EWA):**
   * Cho phép nhân viên ứng trước một phần tiền lương tương ứng với số ngày công thực tế đã đi làm trong tháng, tự động khấu trừ vào mục "Tạm ứng" của kỳ lương.
4. **Module Đánh giá Hiệu suất & KPI (Performance Management):**
   * Giao chỉ tiêu KPI hàng tháng và tự động quy đổi điểm hiệu suất sang khoản "Thưởng / Phạt" trên bảng lương.
