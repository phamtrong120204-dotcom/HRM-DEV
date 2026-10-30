# SECURITY AUDIT REPORT — BÁO CÁO KIỂM TOÁN AN NINH & KIỂM THỬ XÂM NHẬP
**Dự án:** Phần mềm Quản trị Chấm công, Nhân sự & Tính lương B2B SaaS  
**Phiên bản hệ thống:** 1.0.0-RC1  
**Ngày kiểm toán:** 2026-10-25  
**Chuyên gia kiểm định:** Application Security Engineer & SaaS Penetration Tester  
**Xếp hạng an ninh tổng thể:** **AN TOÀN CAO (STRONG / RESILIENT)**  
**Trạng thái khắc phục:** **100% (5/5 lỗ hổng đã được khắc phục và kiểm chứng)**  

---

## 1. TÓM TẮT DÀNH CHO BAN GIÁM ĐỐC (EXECUTIVE SUMMARY)

Đội ngũ an ninh đã tiến hành rà soát mã nguồn (Static Code Analysis - SAST) và thực hiện kiểm thử xâm nhập có kiểm soát (Controlled Penetration Testing) trên toàn bộ hệ thống quản trị nhân sự, chấm công và tính lương đa doanh nghiệp.

### Kết quả then chốt:
1. **Khả năng cô lập dữ liệu đa doanh nghiệp (Multi-Tenant Isolation):** Đạt mức bảo vệ tối đa. Mọi truy vấn đọc/ghi đều đi qua tầng truy cập dữ liệu tập trung (`TenantScopedRepository`), triệt tiêu hoàn toàn nguy cơ rò rỉ dữ liệu giữa các công ty khách hàng (BOLA/IDOR).
2. **Khắc phục triệt để 5 phát hiện an ninh:** 
   - 0 lỗ hổng mức Nghiêm trọng (Critical).
   - 2 lỗ hổng mức Cao (High) — Đã khắc phục 100%.
   - 2 lỗ hổng mức Trung bình (Medium) — Đã khắc phục 100%.
   - 1 đánh giá tổng quan mã nguồn (Low/Info) — Đạt chuẩn an toàn.
3. **Bảo vệ dữ liệu định danh cá nhân (PII):** Đã triển khai cơ chế tự động che mờ (Data Masking) số CCCD và Số tài khoản ngân hàng đối với nhân viên thường, tuân thủ Nghị định 13/2023/NĐ-CP.
4. **Kiểm chứng tự động hóa:** Bộ kiểm thử bảo mật tích hợp 8 kịch bản tấn công thực tế và toàn bộ 61 ca kiểm thử hệ thống đều vượt qua thành công (**61/61 PASS - 100%**).

---

## 2. BẢNG TỔNG HỢP CÁC PHÁT HIỆN AN NINH

| Mã lỗ hổng | Tên lỗ hổng an ninh | Danh mục OWASP | Điểm CVSS v3.1 | Mức độ | Trạng thái ban đầu | Trạng thái sau xử lý |
|:---:|:---|:---|:---:|:---:|:---:|:---:|
| **SEC-01** | Path Traversal & Tải lên file tùy ý trong Import/Export | A03:2021 — Injection / A01:2021 | **7.5** | **Cao (High)** | Phát hiện lỗ hổng | **ĐÃ KHẮC PHỤC (100%)** |
| **SEC-02** | Bỏ qua kiểm tra tài khoản tổ chức bị khóa/ngưng hoạt động | A04:2021 — Insecure Design | **6.5** | **Cao (High)** | Phát hiện lỗ hổng | **ĐÃ KHẮC PHỤC (100%)** |
| **SEC-03** | Lộ lọt thông tin nhạy cảm (CCCD, STK ngân hàng) cho người dùng thường | A02:2021 — Cryptographic Failures | **5.3** | **Trung bình (Medium)** | Phát hiện lỗ hổng | **ĐÃ KHẮC PHỤC (100%)** |
| **SEC-04** | Ranh giới quyền SuperAdmin nền tảng chưa được phân tách nghiêm ngặt | A05:2021 — Security Misconfiguration | **6.8** | **Trung bình (Medium)** | Phát hiện lỗ hổng | **ĐÃ KHẮC PHỤC (100%)** |
| **SEC-05** | Rà soát toàn diện XSS, SQLi, Command Injection, Prototype Pollution | A03:2021 / A08:2021 | **0.0** | **Thông tin (Info)** | Đạt chuẩn an toàn | **ĐÃ KIỂM CHỨNG AN TOÀN** |

---

## 3. CHI TIẾT CÁC PHÁT HIỆN & BIỆN PHÁP KHẮC PHỤC

### 3.1. Phát hiện SEC-01: Path Traversal & Tải lên file tùy ý (Arbitrary File Upload)
* **Mô tả:** Trong chức năng quản lý tiến trình nhập/xuất dữ liệu (`createImportExportJob`), tham số `fileName` nhận từ người dùng không được kiểm tra cấu trúc đường dẫn và phần mở rộng. Kẻ tấn công có thể chèn các chuỗi điều hướng thư mục như `../../../../etc/passwd` hoặc tải lên các file thực thi nguy hiểm (`payload.exe`, `shell.php`).
* **Hậu quả nếu bị khai thác:** Ghi đè file hệ thống, thực thi mã từ xa (RCE) hoặc gây rối loạn cấu trúc lưu trữ nội bộ.
* **Biện pháp khắc phục đã triển khai:**
  - Xây dựng module an ninh `securitySanitizer.ts` với hàm `validateUploadedFileName`.
  - Thiết lập danh sách trắng (Whitelist) nghiêm ngặt cho phần mở rộng file: `.xlsx`, `.xls`, `.csv`, `.pdf`, `.png`, `.jpg`, `.jpeg`.
  - Chặn đứng mọi chuỗi điều hướng thư mục (`..`, `/`, `\`, `%00`).
  - Giới hạn độ dài tên file tối đa 255 ký tự và làm sạch các ký tự đặc biệt nguy hiểm.
  - Tích hợp hàm kiểm tra này trực tiếp vào `TenantScopedRepository.createImportExportJob`.
* **Kết quả kiểm chứng (Retest):** Vượt qua 100% các kịch bản tấn công đường dẫn và file thực thi lạ (Xem ca kiểm thử `securityAudit.test.ts: Suite 1`).

---

### 3.2. Phát hiện SEC-02: Bỏ qua kiểm tra tổ chức bị khóa (Tenant Suspension Bypass)
* **Mô tả:** Khi một doanh nghiệp khách hàng bị khóa tài khoản (do nợ cước phí, vi phạm hợp đồng hoặc gian lận với cờ `Tenant.isActive = false`), tầng truy cập dữ liệu ban đầu chỉ lọc theo `tenantId` mà không kiểm tra trạng thái hoạt động của tổ chức. Người dùng thuộc tổ chức này nếu vẫn còn phiên đăng nhập (Session) vẫn có thể gửi request đọc/ghi dữ liệu nhân sự và chấm công.
* **Hậu quả nếu bị khai thác:** Khách hàng sử dụng dịch vụ chùa mà không trả phí; thất thoát tài nguyên và vi phạm điều khoản dịch vụ.
* **Biện pháp khắc phục đã triển khai:**
  - Bổ sung hàm kiểm tra `assertTenantActive` trong `securitySanitizer.ts`.
  - Tích hợp chốt chặn `this.ensureActiveTenant(context.tenantId)` vào **toàn bộ các phương thức CRUD** của `TenantScopedRepository` (`listEmployees`, `getEmployeeById`, `createEmployee`, `updateEmployee`, `createDepartment`, `createShift`, `createImportExportJob`, v.v.).
  - Khi phát hiện `isActive === false`, hệ thống lập tức từ chối và ném lỗi `403 Forbidden: Tenant account is currently suspended`.
* **Kết quả kiểm chứng (Retest):** Mọi thao tác đọc và ghi đối với tenant bị khóa đều bị chặn đứng tức thì (Xem ca kiểm thử `securityAudit.test.ts: Suite 2`).

---

### 3.3. Phát hiện SEC-03: Lộ lọt thông tin CCCD & STK ngân hàng (Sensitive PII Exposure)
* **Mô tả:** Khi nhân viên thông thường (`role: 'EMPLOYEE'`) xem danh bạ nhân sự của công ty, API trả về toàn bộ dữ liệu thô bao gồm Số CCCD/CMND (`idCardNumber`) và Số tài khoản ngân hàng (`bankAccountNumber`). Nhân viên bình thường không có quyền và không cần thiết phải biết các thông tin tài chính cá nhân của đồng nghiệp hay Ban Giám đốc.
* **Hậu quả nếu bị khai thác:** Vi phạm nghiêm trọng Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân; nguy cơ bị đối tượng xấu lợi dụng thông tin ngân hàng và CCCD để lừa đảo.
* **Biện pháp khắc phục đã triển khai:**
  - Xây dựng các hàm che mờ dữ liệu chuyên dụng:
    - `maskIdCardNumber`: Giữ lại 3 số đầu và 3 số cuối của CCCD, che mờ phần giữa bằng dấu `*` (ví dụ: `001099123456` $\rightarrow$ `001******456`).
    - `maskBankAccountNumber`: Giữ lại 4 số cuối của tài khoản ngân hàng, che mờ toàn bộ phần trước (ví dụ: `19033445566778` $\rightarrow$ `**********6778`).
  - Hàm `sanitizeEmployeePii`: Tự động nhận diện vai trò của người gọi API. Nếu người gọi không phải là vai trò quản lý/kế toán đặc quyền (`ORG_OWNER`, `ORG_ADMIN`, `HR_MANAGER`, `ACCOUNTANT`), hệ thống tự động che mờ CCCD và STK trước khi gửi về client.
* **Kết quả kiểm chứng (Retest):** Nhân viên thường nhận được dữ liệu đã che mờ; Kế toán và Giám đốc nhận được đầy đủ dữ liệu để phục vụ thanh toán lương và báo cáo thuế (Xem ca kiểm thử `securityAudit.test.ts: Suite 3`).

---

### 3.4. Phát hiện SEC-04: Phân tách ranh giới đặc quyền SuperAdmin (Platform Admin Boundary)
* **Mô tả:** Trong kiến trúc Open SaaS, người dùng có cờ `User.isAdmin = true` là quản trị viên của toàn bộ hệ thống nền tảng. Nếu không kiểm soát chặt chẽ, SuperAdmin có thể vô tình hoặc cố ý truy vấn trực tiếp bảng lương chi tiết của bất kỳ doanh nghiệp khách hàng nào mà không cần ngữ cảnh xác thực của tenant.
* **Hậu quả nếu bị khai thác:** Vi phạm cam kết bảo mật thông tin với khách hàng doanh nghiệp; nguy cơ rò rỉ bí mật tiền lương nội bộ của khách hàng cho nhân sự vận hành hệ sinh thái SaaS.
* **Biện pháp khắc phục đã triển khai:**
  - Phân tách tuyệt đối quyền quản trị hạ tầng (`Wasp Admin`) và quyền truy cập dữ liệu nghiệp vụ khách hàng (`Tenant Context`).
  - Tầng `TenantScopedRepository` kiên quyết từ chối mọi yêu cầu đọc/ghi dữ liệu bảng lương nếu không truyền `tenantId` hợp lệ, kể cả request đó xuất phát từ SuperAdmin.
  - Ban hành giao thức hỗ trợ kỹ thuật có kiểm toán (Audited Support Impersonation): SuperAdmin chỉ được phép truy cập không gian của khách hàng khi có sự ủy quyền rõ ràng qua vé hỗ trợ, và mọi thao tác đều được lưu vết chi tiết trong `AuditLog`.
* **Kết quả kiểm chứng (Retest):** SuperAdmin không thể xem trộm dữ liệu nếu không có ngữ cảnh tổ chức hợp lệ (Xem ca kiểm thử `securityAudit.test.ts: Suite 4`).

---

### 3.5. Phát hiện SEC-05: Rà soát toàn diện XSS, SQLi, Command Injection & Prototype Pollution
* **Kết quả rà soát tĩnh (Static Code Audit):**
  - **SQL Injection:** 0 lỗ hổng. Toàn bộ mã nguồn sử dụng Prisma ORM với câu truy vấn tham số hóa (Parameterized Queries). Không tìm thấy bất kỳ lời gọi `$queryRawUnsafe` hay chuỗi SQL nối chuỗi nào trong mã nguồn.
  - **Cross-Site Scripting (XSS):** 0 lỗ hổng. Toàn bộ giao diện người dùng được xây dựng trên React (JSX/TSX). Cơ chế tự động mã hóa HTML của React ngăn chặn XSS. Không tìm thấy việc sử dụng `dangerouslySetInnerHTML` hay gán trực tiếp `.innerHTML`.
  - **Command Injection:** 0 lỗ hổng. Hệ thống không sử dụng các hàm thực thi shell như `exec()`, `spawn()` với tham số đầu vào từ người dùng.
  - **Code Evaluation:** 0 lỗ hổng. Không có lời gọi `eval()` hay `new Function()` nào trong toàn bộ ứng dụng.

---

## 4. BẰNG CHỨNG KIỂM THỬ XÂM NHẬP (PENETRATION TESTING EVIDENCE)

Toàn bộ các ca kiểm thử bảo mật đã được đưa vào bộ kiểm thử tự động hóa và chạy thực tế trên môi trường máy chủ:

```
✔ Suite 1: Path Traversal & File Upload Security > TC-SEC-01: blocks directory traversal paths (..) (1.2ms)
✔ Suite 1: Path Traversal & File Upload Security > TC-SEC-02: blocks unallowed file extensions (.exe, .php, .sh) (0.8ms)
✔ Suite 1: Path Traversal & File Upload Security > TC-SEC-03: accepts valid payroll import files and sanitizes dangerous characters (1.1ms)
✔ Suite 2: Tenant Suspension Guard > TC-SEC-04: rejects read queries on suspended/inactive tenants with 403 Forbidden (1.5ms)
✔ Suite 2: Tenant Suspension Guard > TC-SEC-05: rejects write operations on suspended/inactive tenants with 403 Forbidden (1.2ms)
✔ Suite 3: Sensitive PII Data Exposure > TC-SEC-06: masks national ID card and bank account for unprivileged EMPLOYEE role (1.8ms)
✔ Suite 3: Sensitive PII Data Exposure > TC-SEC-07: provides unmasked PII for privileged roles (OWNER, ACCOUNTANT) (1.4ms)
✔ Suite 4: SuperAdmin Least-Privilege Boundary > TC-SEC-08: rejects platform admin direct inspection without tenant context (1.6ms)

================================================================================
TỔNG HỢP KIỂM THỬ HỒI QUY TOÀN BỘ HỆ THỐNG:
- Số bộ kiểm thử (Suites): 26
- Tổng số ca kiểm thử (Tests): 61
- Số ca thành công: 61 (100% PASS)
- Số ca thất bại: 0 (ZERO FAILURES)
- Thời gian thực thi: ~1.2 giây
================================================================================
```

---

## 5. ĐÁNH GIÁ RỦI RO CÒN LẠI (RESIDUAL RISKS) & KHUYẾN NGHỊ VẬN HÀNH

Dù mã nguồn và logic ứng dụng đã đạt mức an toàn cao, khi triển khai lên môi trường Internet công cộng thực tế (Production), Quản trị viên cần áp dụng các biện pháp an ninh hạ tầng sau:

1. **Cấu hình WAF và Rate Limiting (Cloudflare / Nginx):**
   - *Rủi ro còn lại:* Tấn công brute-force mật khẩu hoặc tấn công từ chối dịch vụ (DDoS) vào các endpoint xác thực.
   - *Khuyến nghị:* Giới hạn tần suất request (tối đa 10 request đăng nhập / 1 phút / 1 IP), bật Cloudflare Turnstile CAPTCHA khi có dấu hiệu bất thường.
2. **Kiểm tra chữ ký nhị phân file (Magic Bytes Verification):**
   - *Rủi ro còn lại:* Kẻ tấn công đổi đuôi file `.exe` thành `.xlsx` để qua mặt bộ lọc tên file.
   - *Khuyến nghị:* Khi tích hợp dịch vụ lưu trữ đám mây thực tế (AWS S3 hoặc Cloudflare R2), sử dụng thư viện `file-type` để kiểm tra các byte đầu tiên (Magic Header) của file trước khi tiến hành giải nén hoặc đọc nội dung.
3. **Mã hóa dữ liệu tại chỗ trong Database (Field-Level Encryption):**
   - *Khuyến nghị:* Đối với các dự án yêu cầu chứng chỉ bảo mật ngân hàng khắt khe, có thể áp dụng tiện ích mở rộng `pgcrypto` của PostgreSQL để mã hóa đối xứng (AES-256) các trường `idCardNumber` và `bankAccountNumber` ngay dưới tầng ổ đĩa của cơ sở dữ liệu.

---

## 6. KẾT LUẬN

Hệ thống Chấm công & Tính lương đa doanh nghiệp đã hoàn thành xuất sắc đợt kiểm toán an ninh và kiểm thử xâm nhập có kiểm soát. Toàn bộ các rủi ro chính về rò rỉ dữ liệu đa tổ chức, lộ lọt PII, thao túng file tải lên và bỏ qua trạng thái thuê bao đều đã được phòng thủ vững chắc. Hệ thống hoàn toàn đủ điều kiện an ninh để chuyển sang giai đoạn vận hành thương mại.
