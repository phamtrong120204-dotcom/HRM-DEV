# SECURITY TEST PLAN — KẾ HOẠCH KIỂM THỬ AN NINH CÓ KIỂM SOÁT
**Dự án:** Phần mềm Quản trị Chấm công, Nhân sự & Tính lương B2B SaaS  
**Phiên bản tài liệu:** 1.0.0  
**Ngày lập:** 2026-10-25  
**Tiêu chuẩn đối chiếu:** OWASP Top 10:2021 & OWASP ASVS v4.0 (Level 2)  
**Phạm vi áp dụng:** Kiểm thử xâm nhập có kiểm soát (Controlled Penetration Testing) trên môi trường thử nghiệm  

---

## 1. MỤC TIÊU & NGUYÊN TẮC THỰC HIỆN

### 1.1 Mục tiêu
Kiểm tra, phát hiện và đánh giá thực tế các lỗ hổng an ninh ứng dụng web trước khi đưa hệ thống vào vận hành thương mại. Kế hoạch này tập trung vào:
1. **Kiểm tra khả năng cô lập dữ liệu đa doanh nghiệp (Multi-Tenant Isolation)** nhằm ngăn chặn tuyệt đối tình trạng rò rỉ dữ liệu chéo giữa các công ty khách hàng (BOLA/IDOR).
2. **Kiểm tra tính an toàn của việc xử lý file tải lên (File Upload Security)** và phòng chống tấn công điều hướng thư mục (Path Traversal).
3. **Kiểm tra cơ chế che giấu dữ liệu định danh cá nhân nhạy cảm (PII Data Masking)** theo quy định của pháp luật.
4. **Kiểm tra cơ chế kiểm soát vòng đời thuê bao (Tenant Suspension Enforcement)**.
5. **Kiểm tra tính toàn vẹn của logic nghiệp vụ (Business Logic & State Machine Integrity)** đối với các kỳ lương đã chốt.

### 1.2 Nguyên tắc đạo đức & Ranh giới kiểm thử (Rules of Engagement)
* **Môi trường thử nghiệm:** Chỉ thực hiện trên môi trường phát triển cục bộ (Local Development) và Staging được cấp phép.
* **Dữ liệu thử nghiệm:** Sử dụng 100% dữ liệu giả lập (Synthetic Mock Data), tuyệt đối không dùng dữ liệu người thật hay dữ liệu khách hàng thực tế.
* **Tính không phá hủy (Non-Destructive Testing):** Không thực hiện các hành vi gây sập hạ tầng, từ chối dịch vụ (DoS/DDoS) hoặc xóa vĩnh viễn dữ liệu hệ thống.
* **Không tấn công bên thứ ba:** Không gửi request tấn công hay giả mạo lưu lượng tới các nhà cung cấp dịch vụ bên ngoài (Stripe, Resend, Cloudflare, Supabase Production).

---

## 2. MA TRẬN ĐỐI CHIẾU TIÊU CHUẨN OWASP

| Mã kiểm tra | Danh mục OWASP Top 10:2021 | Yêu cầu đối chiếu OWASP ASVS v4.0 | Mục tiêu kiểm thử cụ thể trong hệ thống Chấm công & Tính lương |
|:---:|:---|:---|:---|
| **ST-01** | **A01:2021 — Broken Access Control** | V4.1 Access Control Architecture<br>V4.2 Operation Level Access Control | Ngăn chặn truy cập chéo giữa Tenant A và Tenant B (BOLA/IDOR); ngăn nhân viên thường truy cập API của quản trị viên (Privilege Escalation). |
| **ST-02** | **A02:2021 — Cryptographic Failures** | V2.1 Password Security<br>V3.1 Data Protection (PII) | Bảo vệ dữ liệu nhạy cảm (CCCD, Số tài khoản ngân hàng, Tiền lương); áp dụng che mờ (masking) đối với các vai trò không có thẩm quyền. |
| **ST-03** | **A03:2021 — Injection** | V5.1 Input Validation<br>V5.3 Output Encoding / Injection Prevention | Ngăn chặn Path Traversal khi tải lên file đính kèm/import dữ liệu; triệt tiêu SQL Injection thông qua ORM Prisma; ngăn XSS trong giao diện React. |
| **ST-04** | **A04:2021 — Insecure Design** | V1.1 Secure Software Development Lifecycle<br>V8.1 Business Logic Security | Kiểm tra máy trạng thái (State Machine) kỳ lương: không thể sửa công hay tính lại lương khi kỳ lương đã ở trạng thái `LOCKED`. |
| **ST-05** | **A05:2021 — Security Misconfiguration** | V14.1 Build and Deployment<br>V14.2 Server Configuration | Kiểm soát tài khoản SuperAdmin nền tảng: không có quyền tự do đọc dữ liệu doanh nghiệp khách hàng khi không được ủy quyền hỗ trợ. |
| **ST-06** | **A07:2021 — Identification & Authentication** | V2.8 Session Management | Thu hồi quyền truy cập ngay lập tức khi Tenant bị đình chỉ (`isActive: false`) hoặc nhân viên bị vô hiệu hóa (`TERMINATED`). |
| **ST-07** | **A08:2021 — Software & Data Integrity** | V10.2 Malicious Code Search | Kiểm soát việc parse file Excel/CSV, chống thực thi code tùy ý từ file tải lên. |
| **ST-08** | **A09:2021 — Security Logging & Monitoring** | V7.1 Log Content & Structure<br>V7.2 Log Protection | Mọi hành vi nhạy cảm (Duyệt lương, khóa sổ, xuất file, cấu hình bảo mật) phải ghi vết đầy đủ vào bảng `AuditLog`. |

---

## 3. DANH SÁCH CÁC KỊCH BẢN KIỂM THỬ XÂM NHẬP (TEST CASES)

### Nhóm 1: Kiểm thử Tải lên File & Điều hướng Thư mục (Path Traversal & Arbitrary File Upload)
* **Kịch bản TC-SEC-01 (Path Traversal via Directory Climbing):**
  * *Mô tả:* Gửi yêu cầu tạo công việc import với tên file chứa ký tự điều hướng: `../../../../etc/passwd` hoặc `..\\..\\Windows\\System32\\cmd.exe`.
  * *Kỳ vọng:* Hệ thống lập tức từ chối và ném lỗi `400 Bad Request: Path traversal patterns (..) are not allowed`.
* **Kịch bản TC-SEC-02 (Dangerous File Extensions):**
  * *Mô tả:* Tải lên các file thực thi nguy hiểm: `malware.exe`, `exploit.sh`, `shell.php`, `script.js`.
  * *Kỳ vọng:* Hệ thống chặn đứng với thông báo lỗi phần mở rộng file không nằm trong danh sách trắng cho phép (`.xlsx`, `.xls`, `.csv`, `.pdf`, `.png`, `.jpg`, `.jpeg`).
* **Kịch bản TC-SEC-03 (Filename Sanitization & Null Byte Injection):**
  * *Mô tả:* Gửi tên file chứa ký tự điều khiển nguy hiểm hoặc null byte: `payroll_data%00.exe.csv` hoặc tên file dài hơn 255 ký tự.
  * *Kỳ vọng:* Hệ thống làm sạch tên file hoặc từ chối nếu tên file không hợp lệ.

### Nhóm 2: Kiểm thử Vòng đời Thuê bao & Khóa Tài khoản (Tenant Suspension Enforcement)
* **Kịch bản TC-SEC-04 (Read Operation on Suspended Tenant):**
  * *Mô tả:* Thực hiện truy vấn danh sách nhân viên (`listEmployees`) hoặc chi tiết phòng ban dưới danh nghĩa một Tenant có cờ `isActive: false` (bị khóa do nợ cước hoặc gian lận).
  * *Kỳ vọng:* Hệ thống từ chối thực thi và trả về mã lỗi `403 Forbidden: Tenant account is currently suspended`.
* **Kịch bản TC-SEC-05 (Write Operation on Suspended Tenant):**
  * *Mô tả:* Thực hiện tạo nhân viên mới (`createEmployee`) hoặc sửa thông tin phòng ban thuộc Tenant bị khóa.
  * *Kỳ vọng:* Hệ thống chặn ghi và trả về mã lỗi `403 Forbidden: Tenant account is currently suspended`.

### Nhóm 3: Kiểm thử Lộ lọt Thông tin Định danh Cá nhân (PII Exposure & Masking)
* **Kịch bản TC-SEC-06 (PII Masking for Unprivileged Roles):**
  * *Mô tả:* Tài khoản với vai trò nhân viên thông thường (`EMPLOYEE`) gọi hàm lấy danh sách nhân viên hoặc chi tiết nhân sự khác.
  * *Kỳ vọng:* Số CCCD bị che mờ phần giữa (ví dụ: `001******456`), Số tài khoản ngân hàng bị che mờ phần đầu (ví dụ: `**********6778`). Không trả về số đầy đủ trong JSON response.
* **Kịch bản TC-SEC-07 (PII Access for Authorized Payroll Roles):**
  * *Mô tả:* Tài khoản với vai trò Giám đốc (`ORG_OWNER`), Quản trị viên (`ORG_ADMIN`) hoặc Kế toán lương (`ACCOUNTANT`) truy cập hồ sơ nhân sự cùng tổ chức.
  * *Kỳ vọng:* Trả về đầy đủ số CCCD và Số tài khoản ngân hàng để phục vụ việc chuyển khoản ngân hàng và kê khai thuế.

### Nhóm 4: Kiểm thử Phân tách Quản trị Nền tảng (Platform SuperAdmin Least-Privilege Boundary)
* **Kịch bản TC-SEC-08 (Direct Cross-Tenant Inspection without Tenant Context):**
  * *Mô tả:* Tài khoản Wasp Admin (`isAdmin = true`) cố gắng truy vấn dữ liệu nhân sự của Tenant A mà không truyền ngữ cảnh Tenant hợp lệ.
  * *Kỳ vọng:* Hệ thống từ chối với lỗi `403 Forbidden: Missing or invalid tenant context`.
* **Kịch bản TC-SEC-09 (Audited Support Impersonation Protocol):**
  * *Mô tả:* Tài khoản Wasp Admin kích hoạt chế độ hỗ trợ khách hàng có ủy quyền (`isSupportAccess: true`, có mã vé hỗ trợ và ghi log kiểm toán).
  * *Kỳ vọng:* Chỉ truy cập được dữ liệu khi có ghi nhận đầy đủ vào hệ thống giám sát an ninh.

### Nhóm 5: Kiểm thử Tính toàn vẹn Nghiệp vụ Kỳ lương (Business Logic & State Machine)
* **Kịch bản TC-SEC-10 (Tampering with Locked Payroll Period):**
  * *Mô tả:* Gửi yêu cầu cập nhật ngày công (`recordAttendance`) hoặc tính lại lương cho một kỳ lương đã khóa (`status: 'LOCKED'`).
  * *Kỳ vọng:* Hệ thống ném lỗi `400 Bad Request: Cannot record attendance for a locked payroll period`.

---

## 4. PHƯƠNG THỨC THỰC THI & TỰ ĐỘNG HÓA

Toàn bộ các ca kiểm thử bảo mật trên được tự động hóa hoàn toàn bằng mã nguồn TypeScript chạy trên test runner gốc của Node.js (Zero-Dependency Architecture):
* **File kịch bản kiểm thử bảo mật:** `template/app/src/payroll/server/securityAudit.test.ts`
* **File bộ lọc và hàm an ninh:** `template/app/src/payroll/server/security/securitySanitizer.ts`
* **Lệnh thực thi kiểm tra:**
  ```bash
  node --test --experimental-strip-types "src/payroll/server/securityAudit.test.ts"
  ```
* **Tích hợp hồi quy toàn diện:** Chạy song song cùng các bài kiểm thử Frontend, Backend, Multi-tenant Isolation và QA Regression để đảm bảo không phát sinh xung đột giữa an ninh và chức năng nghiệp vụ.
