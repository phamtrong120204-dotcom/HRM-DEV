# THREAT MODEL — MÔ HÌNH HÓA MỐI ĐE DỌA AN NINH
**Dự án:** Phần mềm Quản trị Chấm công, Nhân sự & Tính lương B2B SaaS  
**Phiên bản tài liệu:** 1.0.0  
**Ngày lập:** 2026-10-25  
**Phương pháp luận:** STRIDE & OWASP SaaS Threat Modeling  
**Trạng thái:** Đã phê duyệt & Đã triển khai phòng thủ  

---

## 1. MỤC TIÊU & PHẠM VI

Tài liệu này xác định các ranh giới tin cậy (Trust Boundaries), phân loại tài sản nhạy cảm (Assets), nhận diện các tác nhân đe dọa (Threat Actors) và phân tích các nguy cơ an ninh theo mô hình **STRIDE** cho hệ thống B2B SaaS Quản lý Nhân sự, Chấm công và Tính lương.

Hệ thống được thiết kế phục vụ mô hình **Multi-Tenant (Đa doanh nghiệp)** chia sẻ chung hạ tầng cơ sở dữ liệu (Shared Database, Pooled Schema), do đó trọng tâm an ninh cao nhất đặt vào:
1. **Cô lập dữ liệu tuyệt đối giữa các tổ chức (Cross-Tenant Isolation).**
2. **Bảo vệ dữ liệu định danh cá nhân (PII) và bí mật tài chính/tiền lương.**
3. **Tính toàn vẹn của chu trình chốt lương và nhật ký kiểm toán (Audit Trail).**

---

## 2. TÀI SẢN QUAN TRỌNG CẦN BẢO VỆ (ASSETS)

| Mã tài sản | Nhóm tài sản | Dữ liệu cụ thể | Mức độ nhạy cảm | Hậu quả nếu bị lộ / thay đổi |
|:---|:---|:---|:---:|:---|
| **AST-01** | **Dữ liệu định danh cá nhân (PII)** | Họ tên, Số CCCD/CMND, Ngày sinh, Mã số thuế cá nhân, Số tài khoản ngân hàng | **Cực cao (CRITICAL)** | Vi phạm Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân, nguy cơ lừa đảo tài chính, kiện tụng pháp lý. |
| **AST-02** | **Dữ liệu tiền lương & Tài chính** | Lương cơ bản, phụ cấp, tiền thưởng, công thức tính lương, kết quả phiếu lương cá nhân, tổng quỹ lương doanh nghiệp | **Cực cao (CRITICAL)** | Rò rỉ bí mật kinh doanh, xung đột nội bộ nhân sự, mất lợi thế cạnh tranh. |
| **AST-03** | **Dữ liệu chấm công & Vận hành** | Lịch sử check-in/out, số giờ làm việc, đi muộn/về sớm, đơn xin nghỉ phép, duyệt làm thêm giờ (OT) | **Cao (HIGH)** | Gian lận ngày công, trả sai lương, thất thoát tài chính doanh nghiệp. |
| **AST-04** | **Cấu hình & Quyền tổ chức** | Thông tin tenant, trạng thái tài khoản (Active/Suspended), gói cước (Free/Pro/Enterprise), phân quyền vai trò (RBAC) | **Cao (HIGH)** | Leo thang đặc quyền, vượt rào gói cước chưa thanh toán, can thiệp trái phép thiết lập doanh nghiệp. |
| **AST-05** | **Khóa bí mật & Token xác thực** | Session cookie, JWT secret, Database connection string, Webhook secret (Stripe), Khóa lưu trữ S3/R2 | **Cực cao (CRITICAL)** | Chiếm quyền điều khiển toàn bộ hệ thống (Total System Compromise). |
| **AST-06** | **Tính toàn vẹn kỳ lương & Nhật ký kiểm toán** | Trạng thái kỳ lương (`DRAFT`, `SUBMITTED`, `APPROVED`, `LOCKED`), bản ghi lịch sử `AuditLog` | **Cao (HIGH)** | Sửa đổi số liệu lương đã chốt và báo cáo thuế, chối bỏ trách nhiệm tài chính. |

---

## 3. RANH GIỚI TIN CẬY (TRUST BOUNDARIES)

Hệ thống được chia thành 7 ranh giới tin cậy phân tầng nghiêm ngặt:

```
[ Internet / External Clients ]
              |
====== TB-1: TLS / HTTPS Termination & Reverse Proxy ======================
              v
[ Wasp Application Server (Node.js / Express) ]
  - Public Routes (Landing, Auth, Webhooks)
              |
====== TB-2: Authentication & Session Verification Layer ==================
              v
  - Authenticated Context: { user: { id, role, tenantId, permissions } }
              |
====== TB-3: Tenant Data Access Layer (TenantScopedRepository) =============
  - MANDATORY TENANT_ID INJECTION
  - ACTIVE TENANT STATUS VERIFICATION (assertTenantActive)
  - PII AUTO-SANITIZATION (sanitizeEmployeePii)
  - FILE UPLOAD SANITIZATION (validateUploadedFileName)
              |
====== TB-4: Database Protocol Boundary ===================================
              v
[ PostgreSQL / Supabase Database (Pooled Schema / Row Ownership) ]
              |
====== TB-5: Third-Party External Services Boundary =======================
              v
[ Stripe Payments / Webhook, Resend/SendGrid Email, Cloudflare R2 / S3 ]

====== TB-6: Virtual Cross-Tenant Boundary ================================
  [ Tenant A Space ]  <--- CRITICAL ISOLATION --->  [ Tenant B Space ]

====== TB-7: Administrative Least-Privilege Boundary =======================
  [ Platform SuperAdmin ]  <--- ZERO DIRECT ACCESS --->  [ Tenant Payroll Data ]
```

### Chi tiết các ranh giới tin cậy:
* **TB-1 (Mạng công cộng $\leftrightarrow$ Web Server):** Ranh giới phân chia thế giới bên ngoài và ứng dụng. Bắt buộc mã hóa toàn bộ dữ liệu truyền tải qua TLS 1.3, thiết lập HTTP Security Headers (HSTS, CSP, X-Frame-Options).
* **TB-2 (Wasp Auth Middleware $\leftrightarrow$ Operations/APIs):** Mọi request vào nghiệp vụ Chấm công/Tiền lương đều phải có Session hợp lệ. User chưa đăng nhập bị chặn 100% tại cổng vào.
* **TB-3 (Nghiệp vụ $\leftrightarrow$ TenantScopedRepository):** **Đây là ranh giới sống còn nhất của hệ sinh thái B2B SaaS.** Tầng nghiệp vụ không bao giờ gọi Prisma trực tiếp mà phải thông qua `TenantScopedRepository`. Tại đây, mọi câu lệnh truy vấn đều được tự động ép điều kiện `tenantId`, kiểm tra trạng thái kích hoạt của tổ chức (`isActive !== false`), và lọc bỏ PII nhạy cảm nếu người gọi không đủ thẩm quyền.
* **TB-4 (DAL $\leftrightarrow$ PostgreSQL Database):** Sử dụng ORM Prisma với tham số hóa câu lệnh (Parameterized Queries), triệt tiêu hoàn toàn SQL Injection.
* **TB-5 (Ứng dụng $\leftrightarrow$ Dịch vụ ngoài):** Webhook từ Stripe phải xác thực chữ ký số mã hóa (`stripe.webhooks.constructEvent`); Email gửi qua API token cách ly.
* **TB-6 (Tenant A $\leftrightarrow$ Tenant B):** Ranh giới ảo nhưng mang tính cách ly tuyệt đối. Người dùng của Tenant A dù đổi ID của Tenant B trong request header/body/param đều bị tầng Repository chặn lại với mã lỗi `403/404`.
* **TB-7 (Platform SuperAdmin $\leftrightarrow$ Dữ liệu khách hàng):** Tài khoản SuperAdmin nền tảng chỉ quản lý các vấn đề hạ tầng và tài khoản cấp cao, không có quyền tự ý đọc bảng lương hoặc thông tin nhân sự của khách hàng nếu không có quy trình hỗ trợ ủy quyền (Support Impersonation with Audit Log).

---

## 4. CÁC TÁC NHÂN ĐE DỌA (THREAT ACTORS)

1. **External Anonymous Attacker (Kẻ tấn công ẩn danh bên ngoài):**
   * *Động cơ:* Quét lỗ hổng tự động, khai thác endpoint lộ, dò tìm file upload, brute-force thông tin đăng nhập, tấn công DoS/DDoS.
   * *Khả năng:* Thấp đến Trung bình.
2. **Malicious Insider / Employee (Nhân viên nội bộ có ý đồ xấu):**
   * *Động cơ:* Xem trộm bảng lương của đồng nghiệp hoặc cấp trên, sửa ngày công của bản thân để nhận thêm tiền, tải danh sách CCCD/SĐT bán ra ngoài.
   * *Khả năng:* Đã có tài khoản hợp lệ với vai trò `EMPLOYEE`. Cố gắng can thiệp các API endpoint không được phân quyền chặt chẽ (Broken Object Level Authorization - BOLA).
3. **Cross-Tenant Malicious Competitor (Đối thủ cạnh tranh thuê bao):**
   * *Động cơ:* Đăng ký một tài khoản tenant hợp lệ (Tenant B), sau đó thay đổi các ID nhân viên, ID bảng lương sang ID của Tenant A để đánh cắp danh sách nhân sự, cấu trúc lương thưởng của đối thủ.
   * *Khả năng:* Trung bình đến Cao. Am hiểu API web và sử dụng Postman/Burp Suite để thao túng tham số.
4. **Suspended / Churned Organization User (Người dùng thuộc tổ chức đã bị khóa/hết hạn cước):**
   * *Động cơ:* Tiếp tục sử dụng phần mềm, xuất báo cáo tài chính mà không gia hạn hợp đồng.
   * *Khả năng:* Vẫn giữ session cookie cũ còn hạn.
5. **Negligent Operator / Untrusted Admin (Quản trị viên bất cẩn):**
   * *Động cơ:* Vô tình xem hoặc làm rò rỉ dữ liệu bảng lương của khách hàng khi xử lý sự cố hệ thống.
   * *Khả năng:* Rất cao vì có quyền quản trị hệ thống.

---

## 5. PHÂN TÍCH THEO MÔ HÌNH STRIDE & BIỆN PHÁP GIẢM THIỂU

| Nguy cơ STRIDE | Kịch bản tấn công thực tế | Vị trí nguy cơ | Mức độ nghiêm trọng | Biện pháp giảm thiểu kiến trúc (Mitigations) | Trạng thái |
|:---|:---|:---|:---:|:---|:---:|
| **S - Spoofing** *(Giả mạo danh tính)* | Kẻ tấn công giả danh Webhook thanh toán Stripe để mở khóa gói trả phí cho Tenant. | TB-5 (Webhooks) | **HIGH** | Xác thực chữ ký điện tử HMAC của Stripe bằng secret key; từ chối mọi request không có chữ ký hợp lệ. | **Đã bảo vệ** |
| **S - Spoofing** *(Giả mạo danh tính)* | Giả mạo danh tính người dùng bằng cách đánh cắp Session token. | TB-2 (Auth) | **HIGH** | Session cookie sử dụng cờ `HttpOnly`, `Secure`, `SameSite=Lax`. Thu hồi session khi đổi mật khẩu hoặc đăng xuất. | **Đã bảo vệ** |
| **T - Tampering** *(Can thiệp / Sửa đổi)* | Kế toán hoặc quản lý cố ý sửa đổi ngày công, tăng lương cho người quen trong kỳ lương **đã khóa sổ (`LOCKED`)**. | TB-3 (Payroll Engine) | **HIGH** | **State Machine Guard:** Kiểm tra trạng thái kỳ lương trước mọi thao tác ghi (`recordAttendance`, `calculatePayroll`, `finalizePayroll`). Nếu `status === 'LOCKED'`, hệ thống lập tức ném lỗi `400 Bad Request`. | **Đã bảo vệ** |
| **T - Tampering** *(Can thiệp / Sửa đổi)* | Tải lên file chứa mã độc hoặc dùng kỹ thuật Path Traversal (`../../etc/passwd`, `shell.php`) qua tính năng Import dữ liệu. | TB-1, TB-3 (File Upload) | **HIGH** | Bộ lọc `validateUploadedFileName`: Ép buộc whitelist đuôi file (`.xlsx`, `.xls`, `.csv`, `.pdf`, `.png`, `.jpg`), loại bỏ toàn bộ ký tự `..`, `/`, `\`, `%00`, giới hạn độ dài tên file 255 ký tự. | **Đã bảo vệ (SEC-01)** |
| **R - Repudiation** *(Chối bỏ trách nhiệm)* | Giám đốc duyệt chi trả lương nhưng sau đó chối bỏ rằng mình không duyệt, đổ lỗi cho hệ thống tính sai. | TB-3 (Audit Trail) | **MEDIUM** | Mọi hành động duyệt (`APPROVE`), khóa sổ (`LOCK`), xuất báo cáo (`EXPORT`) đều ghi lại bản ghi `AuditLog` với `userId`, `tenantId`, `action`, `timestamp`, `ipAddress` và `metadata` chi tiết. | **Đã bảo vệ** |
| **I - Information Disclosure** *(Lộ lọt thông tin)* | Người dùng Tenant B gọi API `getEmployeeById(id_of_tenant_A)` để đọc hồ sơ nhân sự của đối thủ. | TB-6 (Multi-Tenant DAL) | **CRITICAL** | Mọi truy vấn bắt buộc có mệnh đề `WHERE id = ? AND tenantId = ?`. Không bao giờ truy vấn bằng ID đơn thuần. Ném lỗi `404 Not Found` nếu không khớp tenant. | **Đã bảo vệ** |
| **I - Information Disclosure** *(Lộ lọt thông tin)* | Nhân viên thường truy cập danh sách nhân viên thấy toàn bộ Số CCCD và Số tài khoản ngân hàng của đồng nghiệp và Ban Giám đốc. | TB-3 (Data Masking) | **HIGH** | Hàm `sanitizeEmployeePii`: Tự động che mấu số CCCD (`001******456`) và STK ngân hàng (`**********6778`) đối với người dùng không có vai trò đặc quyền (`EMPLOYEE`). | **Đã bảo vệ (SEC-03)** |
| **D - Denial of Service** *(Từ chối dịch vụ)* | Tải lên file nén Zip Bomb hoặc file Excel chứa hàng triệu dòng nhằm gây tràn bộ nhớ (Out-Of-Memory) server. | TB-1, TB-3 (Resource Management) | **HIGH** | Giới hạn kích thước file upload tối đa (10MB), xử lý streaming dữ liệu theo chunk, rate limiting tại reverse proxy. | **Đã khuyến nghị** |
| **E - Elevation of Privilege** *(Leo thang đặc quyền)* | Nhân viên thường gửi request PATCH sửa trường `role` của chính mình từ `EMPLOYEE` thành `ORG_ADMIN`. | TB-3 (RBAC Enforcement) | **CRITICAL** | Sử dụng DTO được xác thực kiểu dữ liệu chặt chẽ; cấm cập nhật trực tiếp trường `role` từ client; chỉ `ORG_OWNER` mới có quyền thay đổi vai trò qua mutation riêng biệt. | **Đã bảo vệ** |
| **E - Elevation of Privilege** *(Leo thang đặc quyền)* | Tổ chức đã bị khóa/ngưng hoạt động (`isActive = false`) vẫn tiếp tục đọc/ghi dữ liệu hệ thống. | TB-3 (Tenant Suspension Guard) | **HIGH** | Hàm `assertTenantActive`: Chặn đứng mọi thao tác truy vấn và ném lỗi `403 Forbidden` đối với các tenant có trạng thái bị tạm đình chỉ. | **Đã bảo vệ (SEC-02)** |
| **E - Elevation of Privilege** *(Leo thang đặc quyền)* | SuperAdmin nền tảng tự ý duyệt lương hoặc xem trích lục lương của doanh nghiệp khách hàng mà không qua phân quyền. | TB-7 (Admin Boundary) | **HIGH** | Cô lập hoàn toàn quyền `isAdmin` của Wasp khỏi dữ liệu nghiệp vụ của Tenant; từ chối truy cập nếu không có cờ ủy quyền hỗ trợ có ghi log. | **Đã bảo vệ (SEC-04)** |

---

## 6. KẾT LUẬN & ĐỊNH HƯỚNG BẢO VỆ TOÀN DIỆN

Mô hình đe dọa này là cơ sở trực tiếp để xây dựng **Kế hoạch Kiểm thử Bảo mật (Security Test Plan)** và tiến hành **Kiểm thử Xâm nhập Có kiểm soát (Controlled Penetration Testing)** trong giai đoạn nghiệm thu. Mọi tầng kiểm soát an ninh đã được lập trình thành các quy tắc bất biến trong kiến trúc phần mềm, đảm bảo an toàn tuyệt đối khi triển khai sản phẩm thương mại.
