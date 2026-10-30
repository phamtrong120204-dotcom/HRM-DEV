# BÁO CÁO KIỂM THỬ BACKEND & ENGINE TÍNH LƯƠNG CÓ KIỂM SOÁT (GĐ3)
## Phân Hệ Server-side Quản Lý Chấm Công, Tính Lương & Đa Doanh Nghiệp (Multi-Tenant B2B SaaS)

> **Mã tài liệu:** `BACKEND_TEST_REPORT.md`  
> **Phiên bản:** `1.0.0`  
> **Ngày lập:** 25/10/2026  
> **Người thực hiện:** Senior Backend Engineer, Payroll Systems Engineer & QA Engineer  
> **Môi trường thử nghiệm:** Node.js v24.14.1 Test Runner (`node --test --experimental-strip-types`) · Prisma 5.19 · Wasp v0.26.1  

---

## 1. TỔNG QUAN KIẾN TRÚC BACKEND & ENGINE TÍNH TOÁN

Trong Giai đoạn 3 (Prompt 3), chúng tôi đã xây dựng toàn bộ tầng nghiệp vụ phía máy chủ (Server-side Business Logic) và động cơ tính lương có kiểm soát theo các nguyên tắc nghiêm ngặt:

1. **Phân tách 6 tầng độc lập:**
   - **Tầng dữ liệu đầu vào (Inputs):** Dữ liệu chấm công theo ca/ngày, các khoản phát sinh nhập tay (sản lượng sản phẩm, khen thưởng, tạm ứng, khấu trừ khác).
   - **Tầng quy tắc doanh nghiệp (Nhóm A - Company Settings):** Ngày công chuẩn (24/26 ngày), ca kíp, thời gian ân hạn đi muộn, phụ cấp thâm niên, định mức chuyên cần, quy tắc làm tròn tiền tệ.
   - **Tầng quy tắc pháp lý có phiên bản (Nhóm B - Statutory Rules):** Biểu thuế TNCN, tỷ lệ trích nộp bảo hiểm, mức lương cơ sở, mức lương tối thiểu vùng, mức giảm trừ gia cảnh, quy định miễn thuế OT. Có kiểm soát chặt chẽ bằng trạng thái `VERIFIED_ACTIVE` vs `UNVERIFIED_DRAFT`.
   - **Động cơ tính toán xác định (Deterministic Pure Engine):** Thuật toán tính toán số học tiền tệ chuẩn (VND integer math), không có tác dụng phụ (no side-effects), có thể kiểm thử lặp lại độc lập và tạo snapshot giải trình công thức.
   - **Luồng phê duyệt & Tính bất biến (State Machine & Period Lock):** Vòng đời kỳ lương `DRAFT` $\rightarrow$ `REVIEWING` $\rightarrow$ `LOCKED` $\rightarrow$ `PAID`. Khi kỳ lương đã khóa (`LOCKED`), toàn bộ số liệu và kết quả tính được đóng băng vĩnh viễn, ngăn chặn mọi thay đổi cấu hình trong tương lai làm biến đổi âm thầm bảng lương đã chốt.
   - **Nhật ký kiểm toán & Phiên bản cấu hình (Audit Trail & Versioning):** Mọi thao tác chuyển trạng thái, mở khóa kỳ lương hay điều chỉnh tham số đều được lưu vết đầy đủ (`AuditLog` và `ConfigurationVersion`).

---

## 2. KIỂM SOÁT BẢO MẬT & PHÂN QUYỀN ĐA DOANH NGHIỆP (MULTI-TENANT SECURITY)

Mọi API, query, action và tác vụ nền đều được bảo vệ qua tầng Middleware bảo mật tại `src/payroll/server/security/authMiddleware.ts`:

1. **Xác minh danh tính (Authentication):** Kiểm tra `context.user` hợp lệ, từ chối các yêu cầu nặc danh (`401 Unauthorized`).
2. **Cô lập dữ liệu doanh nghiệp (Tenant Isolation & Anti-IDOR):**
   - Mọi truy vấn bắt buộc phải lọc theo `tenantId`.
   - Hàm kiểm tra `assertRecordTenantScope(record, tenantId)` ném lỗi `403 Forbidden` ngay lập tức nếu client cố tình truyền ID của một nhân viên hay bản ghi thuộc doanh nghiệp khác.
3. **Phân quyền vai trò có thứ bậc (RBAC Hierarchy):**
   - `OWNER`: Toàn quyền trong tenant, có quyền tối cao mở khóa kỳ lương đã chốt.
   - `ADMIN`: Quản lý nhân sự, phê duyệt bảng lương (`REVIEWING` $\rightarrow$ `LOCKED`), quản lý cấu hình.
   - `ACCOUNTANT`: Nhập số liệu phát sinh, tính toán bảng lương, lập báo cáo thuế, gửi duyệt kỳ lương.
   - `HR_MANAGER`: Chấm công hàng ngày, quản lý hồ sơ nhân viên, ca làm việc.
   - `EMPLOYEE`: Chỉ được phép đọc phiếu lương cá nhân của chính mình.
4. **Làm sạch thông báo lỗi (Error Sanitization):**
   - Hàm `sanitizeErrorMessage` chặn đứng nguy cơ rò rỉ cấu trúc database, stack trace hoặc dữ liệu nhạy cảm ra ngoài phản hồi API.

---

## 3. DANH MỤC CÁC BỘ QUY TẮC PHÁP LÝ & CƠ CHẾ CHỐT CHẶN (COMPLIANCE GUARDS)

Được thiết kế tại `src/payroll/server/rules/statutoryRules.ts`:

| Tên bộ quy tắc | Phiên bản | Căn cứ pháp lý | Trạng thái | Hành vi hệ thống |
| :--- | :--- | :--- | :---: | :--- |
| **Biểu thuế TNCN 7 bậc** | `LEGACY_7_TIER` | Nghị quyết 954/2020/UBTVQH14 & TT 111/2013 | **`VERIFIED_ACTIVE`** | Được phép dùng để tính lương và **Khóa sổ chính thức (Lock Period)**. Giảm trừ bản thân: 11M, NPT: 4.4M. |
| **Dự thảo Thuế TNCN 5 bậc** | `PROPOSED_2026_5_TIER` | Dự thảo Luật Thuế TNCN sửa đổi (chưa thông qua) | **`UNVERIFIED_DRAFT`** | **Bị chặn khóa sổ chính thức!** Chỉ cho phép chạy ở chế độ mô phỏng dự báo thu nhập (`allowSimulation: true`). |
| **Quy chuẩn BHXH hiện hành** | `INSURANCE_2024_OFFICIAL` | Nghị định 73/2024/NĐ-CP & Nghị định 74/2024/NĐ-CP | **`VERIFIED_ACTIVE`** | Lương cơ sở: 2.340.000đ (Trần BHXH/BHYT = 46.8M). Lương tối thiểu Vùng I: 4.960.000đ (Trần BHTN = 99.2M). Tỷ lệ NLĐ: 10.5%, NSDLĐ: 23.5%. |
| **Quy tắc 14 ngày nghỉ KL** | Luật BHXH Điều 85 | Khoản 3 Điều 85 Luật BHXH & QĐ 595/QĐ-BHXH | **`VERIFIED_ACTIVE`** | Nghỉ không lương $\ge 14$ ngày làm việc trong tháng: Tự động miễn đóng BHXH/BHYT/BHTN cả 2 phía. |

---

## 4. KẾT QUẢ KIỂM THỬ TOÀN BỘ BACKEND & ENGINE (33/33 TESTS PASS)

Tất cả các ca kiểm thử unit test và integration test được chạy trực tiếp bằng Node.js Test Runner nguyên bản với lệnh:
```powershell
node --test --experimental-strip-types "src/payroll/payrollEngine.test.ts" "src/payroll/server/backendEngine.test.ts"
```

### Chi tiết kết quả thực thi:

```text
▶ Vietnamese Number to Words Converter (docSo)
  ✔ converts 0 correctly (0.91ms)
  ✔ converts round millions (1.18ms)
  ✔ converts compound amounts (0.21ms)
  ✔ formats currency with symbol (19.49ms)
  ✔ formats plain number with dots (0.82ms)
✔ Vietnamese Number to Words Converter (docSo) (23.99ms)

▶ Seniority Calculation (calculateSeniorityYears)
  ✔ computes 0 years for start dates after or in same year (0.96ms)
  ✔ computes multiple seniority years accurately (0.25ms)
✔ Seniority Calculation (calculateSeniorityYears) (1.49ms)

▶ Personal Income Tax (calculateTax)
  ✔ returns 0 tax when taxable income <= 0 (0.31ms)
  ✔ computes Tier 1 under 2026 5-tier proposal (5% up to 10M) (0.22ms)
  ✔ computes Tier 2 under 2026 5-tier proposal (up to 30M) (0.29ms)
  ✔ computes legacy 7-tier tax (5% up to 5M, 10% next 5M) (0.20ms)
✔ Personal Income Tax (calculateTax) (1.47ms)

▶ Full Employee Payroll Engine (calcEmployeePayroll)
  ✔ calculates full month payroll for time-based standard employee (0.56ms)
  ✔ exempts statutory insurance when employee takes >= 14 unpaid leave days (Luật BHXH) (0.20ms)
  ✔ correctly calculates piece-rate employee (0.23ms)
  ✔ disqualifies attendance bonus if unpaid leave days exceed allowance threshold (0.19ms)
  ✔ enforces insurance ceiling on high base salaries (20x base salary) (0.16ms)
✔ Full Employee Payroll Engine (calcEmployeePayroll) (1.54ms)

▶ 1. Timekeeping & Attendance Calculations
  ✔ correctly aggregates all attendance codes (X, N, CT, P, L, O, KP) into work & paid days (1.41ms)
✔ 1. Timekeeping & Attendance Calculations (2.98ms)

▶ 2. Salary Components, Rounding & Tax-Exempt Splits
  ✔ enforces exact currency rounding rules without floating-point inaccuracy (0.45ms)
  ✔ correctly splits lunch allowance into tax-exempt (<=730k) and taxable portion (28.47ms)
  ✔ calculates seniority allowance according to exact years of service (0.39ms)
✔ 2. Salary Components, Rounding & Tax-Exempt Splits (29.69ms)

▶ 3. Legal Boundaries & Edge Cases
  ✔ evaluates exact 14-day unpaid leave threshold: 13 days pays, 14 days exempts (0.49ms)
  ✔ caps statutory insurance base at 20x base salary for high earners (e.g. 100M) (0.29ms)
  ✔ gracefully handles employee with zero work days (0 paid days -> 0 time-based salary) (0.25ms)
✔ 3. Legal Boundaries & Edge Cases (1.30ms)

▶ 4. Multi-Tenant Security & Access Control
  ✔ blocks cross-tenant access when record tenantId does not match user tenantId (0.64ms)
  ✔ allows access when record tenantId matches user tenantId (0.14ms)
  ✔ enforces role authorization: blocks EMPLOYEE from calculating or locking payroll (0.30ms)
  ✔ guarantees OWNER bypasses normal role restriction checks (0.19ms)
✔ 4. Multi-Tenant Security & Access Control (1.49ms)

▶ 5. Immutability & Configuration Versioning
  ✔ blocks any modification to a LOCKED or PAID payroll period (0.25ms)
  ✔ creates configuration version and audit log when company settings are updated (0.32ms)
✔ 5. Immutability & Configuration Versioning (0.68ms)

▶ 6. State Machine & Compliance Guards
  ✔ follows strict valid lifecycle: DRAFT -> REVIEWING -> LOCKED -> PAID (0.41ms)
  ✔ rejects invalid state transition jumps (e.g. DRAFT directly to PAID) (0.17ms)
  ✔ strictly blocks locking a payroll period if tax rule is UNVERIFIED_DRAFT without simulation override (0.20ms)
  ✔ requires OWNER role and minimum 10 characters explanation to unlock a LOCKED period (0.34ms)
✔ 6. State Machine & Compliance Guards (1.31ms)

============================================================
ℹ tests: 33
ℹ suites: 10
ℹ pass: 33 (100%)
ℹ fail: 0 (0%)
ℹ cancelled: 0
ℹ skipped: 0
ℹ total duration: 240.71 ms
============================================================
```

---

## 5. CẬP NHẬT LƯỢC ĐỒ CƠ SỞ DỮ LIỆU PRISMA (`schema.prisma`)

Chúng tôi đã bổ sung đầy đủ 10 models và 4 enums chuẩn hóa vào tệp `template/app/schema.prisma`:
1. `Tenant`: Quản lý thông tin pháp nhân và gói đăng ký SaaS.
2. `Membership`: Liên kết User với Tenant kèm vai trò (`OWNER`, `ADMIN`, `ACCOUNTANT`, `HR_MANAGER`, `EMPLOYEE`).
3. `Department`: Danh mục phòng ban bên trong từng tenant (`@@unique([tenantId, name])`).
4. `Employee`: Hồ sơ nhân viên, ngạch bậc lương, mức đóng BHXH, người phụ thuộc, tài khoản ngân hàng.
5. `AttendanceRecord`: Bản ghi chấm công 31 ngày (`@@unique([tenantId, employeeId, yearMonth, day])`).
6. `PayrollPeriod`: Quản lý kỳ lương tháng, trạng thái quy trình (`DRAFT`, `REVIEWING`, `LOCKED`, `PAID`) và tổng hợp quỹ lương.
7. `PayrollRecord`: Bản chụp chi tiết bảng lương từng nhân sự (snapshot bất biến 22 cột số liệu).
8. `CompanySetting`: Cấu hình tham số doanh nghiệp hiện hành (ngày công chuẩn, ca kíp, trần ăn trưa, làm tròn tiền).
9. `ConfigurationVersion`: Lưu vết các phiên bản thay đổi cấu hình (`category`, `effectiveFrom`, `configJson`).
10. `AuditLog`: Nhật ký kiểm toán mọi tác vụ quan trọng (`userId`, `action`, `oldValuesJson`, `newValuesJson`).

---

## 6. DANH SÁCH TỆP TIN ĐÃ TẠO MỚI VÀ CẬP NHẬT TRONG GĐ3

```text
template/app/
├── schema.prisma                                        [Cập nhật - Thêm 10 models & 4 enums multi-tenant]
└── src/
    └── payroll/
        └── server/
            ├── errors.ts                                [Mới - Lớp HttpError chuẩn tương thích Wasp & Node]
            ├── schemaValidator.ts                       [Mới - Bộ validate Zod-compatible không phụ thuộc package ngoài]
            ├── security/
            │   └── authMiddleware.ts                   [Mới - Middleware xác thực, phân quyền RBAC & cô lập tenant]
            ├── rules/
            │   └── statutoryRules.ts                   [Mới - Bộ quy tắc pháp lý có phiên bản & chốt chặn tuân thủ]
            ├── engine/
            │   └── payrollCalculationEngine.ts         [Mới - Động cơ tính lương xác định, số học VND & snapshot]
            ├── workflow/
            │   └── payrollPeriodManager.ts             [Mới - Quản lý máy trạng thái, chốt khóa sổ & mở khóa an toàn]
            ├── operations/
            │   ├── settingsOperations.ts               [Mới - Nghiệp vụ cài đặt cấu hình & nhật ký kiểm toán]
            │   ├── timekeepingOperations.ts            [Mới - Nghiệp vụ chấm công, tổng hợp công & giờ OT]
            │   └── payrollOperations.ts                [Mới - Nghiệp vụ tính lương tháng, điều chỉnh & phiếu lương]
            └── backendEngine.test.ts                   [Mới - Bộ kiểm thử 17 ca test backend 6 nhóm nghiệp vụ]

docs/
├── product/UNVERIFIED_BUSINESS_RULES.md                 [Cập nhật - Mục 4: Cơ chế bảo vệ và chốt chặn pháp lý GĐ3]
└── testing/BACKEND_TEST_REPORT.md                       [Mới - Báo cáo kiểm thử backend toàn diện]
```

---

## 7. ĐIỀU CHƯA XÁC MINH & HÀNH ĐỘNG CẦN CHỦ DỰ ÁN DUYỆT TRƯỚC KHI LÊN PRODUCTION

1. **Hiệu lực biểu thuế TNCN mới (5 bậc):** Hiện tại là Dự thảo, hệ thống mặc định khóa chỉ cho phép tính chính thức theo Biểu thuế 7 bậc (`LEGACY_7_TIER`). Cần cập nhật ngày hiệu lực khi Quốc hội bấm thông qua Luật chính thức.
2. **Quy định trần BHTN theo Vùng:** Hiện tại hệ thống đang dùng mức trần Vùng I (4.960.000đ $\times$ 20 = 99.200.000đ). Cần chuyên gia nhân sự xác nhận xem có cần bổ sung trường chọn Vùng II/III/IV cho từng chi nhánh của khách hàng hay không.
3. **Môi trường triển khai:** Không triển khai production, không dùng dữ liệu nhân sự thật. Dữ liệu thử nghiệm hoàn toàn là mock an toàn.

---
*Báo cáo Giai đoạn 3 đã hoàn tất và sẵn sàng cho Quản lý dự án nghiệm thu.*
