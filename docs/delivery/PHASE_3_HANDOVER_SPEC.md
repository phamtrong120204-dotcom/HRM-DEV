# KẾ HOẠCH BÀN GIAO & ĐẶC TẢ TRIỂN KHAI GIAI ĐOẠN 3 (PHASE 3)
## Phân hệ Chấm công & Tính lương B2B SaaS

---

### 1. Hiện trạng Hệ thống & Tóm tắt Giai đoạn 1 & 2

* **Giai đoạn 1 (Phase 1) - Đã hoàn thành:**
  * Xây dựng lõi tính lương Việt Nam chuẩn hóa (`payrollCalculationEngine.ts`, `statutoryRules.ts`).
  * Hoàn thiện 10 kịch bản nghiệp vụ kiểm thử độc lập (`payrollEngine.test.ts`, `backendEngine.test.ts`).
  * Bộ dữ liệu demo chuẩn doanh nghiệp cho 2 tenant: **Tân Phát Digital Corp** (`tenant-alpha-tech`) và **Bắc Nam Logistics** (`tenant-beta-logistics`).
* **Giai đoạn 2 (Phase 2) - Đã hoàn thành:**
  * **Khai báo Wasp Operations & Prisma Entities:** Khai báo trọn vẹn trong `payroll.wasp.ts` và triển khai trong `waspPayrollOperations.ts` gắn kết các entities: `Tenant`, `Employee`, `PayrollPeriod`, `PayrollRecord`, `CompanySetting`, `AttendanceRecord`, `Membership`, `AuditLog`.
  * **Xác thực phiên Server-Side & Chống Giả mạo (Anti-Spoofing):** Loại bỏ tin cậy `tenantId`/`userRole` từ client. Cung cấp endpoint `POST /api/auth/switch-context`, thiết lập cookie `payroll_session=sess_...; HttpOnly; SameSite=Lax`. Áp dụng `assertNoSpoofing(body)` chặn đứng tấn công IDOR với mã lỗi `403 Forbidden`.
  * **Giao dịch tuần tự & Khóa đồng thời (OCC):** Triển khai mutex hàng đợi `runInTenantTransaction(tenantId, task)` và Optimistic Concurrency Control với `periodVersionStore[tenantId]`, phát hiện xung đột và trả về `409 Conflict`.
  * **Bộ kiểm thử tự động:** Đạt 70/70 tests pass (100% pass rate trên 30 suites).
  * **Máy chủ ứng dụng:** Đang chạy tại `http://localhost:3000` (và cổng phụ `3005`).

---

### 2. Mục tiêu Chi tiết Giai đoạn 3 (Phase 3)

Giai đoạn 3 tập trung vào tuân thủ pháp luật lao động Việt Nam và bảo mật dữ liệu cá nhân nâng cao:

#### 2.1 Giới hạn trần khấu trừ tối đa 30% tiền lương (Điều 102 Bộ luật Lao động 2019)
* **Căn cứ pháp lý:** Khoản 1 Điều 102 BLLĐ 2019 quy định:
  > *"Người sử dụng lao động chỉ được khấu trừ tiền lương của người lao động để bồi thường thiệt hại do làm hư hỏng dụng cụ, thiết bị, tài sản của người sử dụng lao động theo quy định tại Điều 129 của Bộ luật này. Người lao động có quyền được biết lý do khấu trừ tiền lương của mình. Mức khấu trừ tiền lương hằng tháng không được quá 30% tiền lương thực lĩnh hằng tháng của người lao động sau khi trích nộp các khoản bảo hiểm xã hội bắt buộc, bảo hiểm y tế, bảo hiểm thất nghiệp, thuế thu nhập cá nhân."*
* **Yêu cầu kỹ thuật:**
  1. Trong `payrollCalculationEngine.ts`: Tính `netBeforeDeductions = grossSalary - totalInsurance - personalIncomeTax`.
  2. Trần khấu trừ tối đa: `maxAllowedDeduction = netBeforeDeductions * 0.30`.
  3. Tổng khấu trừ kỷ luật/bồi thường/tạm ứng: `actualDeduction = Math.min(requestedDeduction, maxAllowedDeduction)`.
  4. Nếu `requestedDeduction > maxAllowedDeduction`: Ghi nhận phần vượt trần `remainingDebt = requestedDeduction - maxAllowedDeduction` để tự động chuyển sang kỳ lương tiếp theo (carryover), và trả về warning cảnh báo trong API/UI.
  5. Cập nhật endpoint `/api/payroll/adjustments` để validate và cảnh báo người dùng khi nhập mức khấu trừ vượt quá 30%.

#### 2.2 Hệ số làm thêm giờ (OT) đa bậc (Điều 98 Bộ luật Lao động 2019)
* **Căn cứ pháp lý:** Điều 98 BLLĐ 2019 và Nghị định 145/2020/NĐ-CP:
  * Làm thêm vào ngày thường: ít nhất **150%**.
  * Làm thêm vào ngày nghỉ hằng tuần (Chủ nhật/Thứ bảy): ít nhất **200%**.
  * Làm thêm vào ngày nghỉ lễ, tết, ngày nghỉ có hưởng lương: ít nhất **300%** (chưa kể tiền lương ngày lễ, tết).
  * Làm việc vào ban đêm (từ 22h đến 06h hôm sau): cộng thêm ít nhất **30%** tiền lương tính theo đơn giá tiền lương hoặc tiền lương thực trả.
  * Làm thêm giờ vào ban đêm: ngoài tiền lương làm thêm giờ ban ngày, người lao động còn được trả thêm **20%** tiền lương tính theo đơn giá tiền lương hoặc tiền lương thực trả của ngày đó.
* **Yêu cầu kỹ thuật:**
  1. Mở rộng cấu trúc dữ liệu lưu trữ OT trong `attendanceStore` và `AttendanceRecord`:
     ```ts
     interface EmployeeOvertimeBreakdown {
       otWeekdayHours: number;   // Ngày thường (1.5x)
       otWeekendHours: number;   // Ngày nghỉ tuần (2.0x)
       otHolidayHours: number;   // Ngày lễ/Tết (3.0x)
       otNightHours: number;     // Ban đêm (1.3x)
       otNightOvertimeHours: number; // Làm thêm ca đêm (2.0x / 2.1x / 2.7x / 3.9x)
     }
     ```
  2. Cập nhật `calculateEmployeePayroll` để tính toán chính xác chi phí OT theo từng bậc.
  3. Bổ sung modal hoặc cột nhập chi tiết OT trên lưới chấm công (giao diện và API `/api/timekeeping/ot`).

#### 2.3 Mã hóa dữ liệu cá nhân nhạy cảm ở trạng thái tĩnh (PII Encryption at Rest - Nghị định 13/2023/NĐ-CP)
* **Căn cứ pháp lý:** Nghị định số 13/2023/NĐ-CP ngày 17/04/2023 của Chính phủ về bảo vệ dữ liệu cá nhân (khoản 2 Điều 26: Áp dụng các biện pháp kỹ thuật phù hợp để bảo vệ dữ liệu cá nhân nhạy cảm).
* **Yêu cầu kỹ thuật:**
  1. Tạo module `src/payroll/server/security/cryptoService.ts`:
     * Sử dụng thư viện `node:crypto` chuẩn (Zero external dependencies).
     * Thuật toán: **AES-256-GCM** với IV 12 bytes ngẫu nhiên và Authentication Tag 16 bytes.
     * Khóa mã hóa (Master Key) đọc từ biến môi trường `PAYROLL_MASTER_KEY` (hoặc fallback key an toàn chuẩn doanh nghiệp cho dev/demo).
  2. Dữ liệu cần mã hóa khi lưu trữ:
     * Số CCCD / Hộ chiếu (`idCardNumber`).
     * Số tài khoản ngân hàng (`bankAccountNumber`).
  3. Cung cấp hàm:
     * `encryptPII(plainText: string): string` (trả về định dạng `iv:authTag:cipherText`).
     * `decryptPII(encryptedText: string): string`.
     * `maskPII(plainText: string, type: 'cccd' | 'bank'): string`.
  4. Tích hợp giải mã trong `repository.listEmployees` khi người dùng có thẩm quyền (`OWNER`, `ADMIN`, `HR_MANAGER`), và giữ nguyên hoặc che mờ với vai trò thường (`EMPLOYEE`).

#### 2.4 Bộ kiểm thử tự động Giai đoạn 3 (Phase 3 Test Suite)
* **File kiểm thử:** `src/payroll/server/phase3Compliance.test.ts`.
* **Kịch bản kiểm thử bắt buộc:**
  * Test giới hạn trần khấu trừ 30%: thử khấu trừ 50% lương net $\rightarrow$ hệ thống chỉ trừ tối đa 30%, 20% còn lại chuyển kỳ sau.
  * Test nhân viên có lương net = 0 $\rightarrow$ trần khấu trừ = 0.
  * Test 5 loại hệ số OT (ngày thường, ngày nghỉ, ngày lễ, đêm thường, làm thêm đêm).
  * Test mã hóa AES-256-GCM: giải mã chính xác chuỗi gốc, tính toàn vẹn (tamper detection), thay đổi IV mỗi lần mã hóa.
  * Cập nhật `package.json` bổ sung test file này vào lệnh `npm test`.

---

### 3. Danh sách File Trọng tâm trong Giai đoạn 3

1. `src/payroll/engine/payrollCalculationEngine.ts`: Logic trần 30% khấu trừ & OT đa bậc.
2. `src/payroll/types.ts`: Bổ sung interface `EmployeeOvertimeBreakdown` và các trường PII.
3. `src/payroll/server/security/cryptoService.ts`: Triển khai AES-256-GCM encryption/decryption.
4. `src/payroll/server/standaloneAppServer.ts`: Cập nhật API `/api/payroll/adjustments`, `/api/timekeeping/ot` và giao diện bento hiển thị.
5. `src/payroll/server/phase3Compliance.test.ts`: Bộ test tự động cho Phase 3.
6. `package.json`: Khai báo chạy file test mới trong script `test`.

---

### 4. Quy trình Thực thi cho Phiên Chat Mới

Khi bắt đầu phiên chat mới, chỉ cần gửi câu lệnh kích hoạt bên dưới. Hệ thống sẽ:
1. Đọc tài liệu này (`docs/delivery/PHASE_3_HANDOVER_SPEC.md`).
2. Triển khai tuần tự 4 nhiệm vụ kỹ thuật.
3. Chạy `npm test` để xác nhận 100% test pass.
4. Kiểm tra máy chủ `http://localhost:3000` và nghiệm thu hoàn thành.
