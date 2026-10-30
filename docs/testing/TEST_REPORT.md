# BÁO CÁO TOÀN DIỆN KIỂM THỬ CHẤT LƯỢNG, HỒI QUY VÀ KIỂM CHỨNG NGHIỆP VỤ (QA, REGRESSION & PAYROLL AUDIT REPORT)

**Dự án:** Phần mềm Quản lý Chấm công, Nhân sự và Tính lương Đa doanh nghiệp (Open SaaS Multi-tenant Payroll)  
**Phiên bản kiểm toán:** Prompt 5 — Comprehensive QA, Regression & Business Verification  
**Thời gian thực hiện:** 2026-10-25  
**Người thực hiện:** QA Lead, Test Automation Engineer & Payroll Business Analyst  

---

## 1. PHẠM VI VÀ MÔI TRƯỜNG KIỂM THỬ

### 1.1. Môi trường kiểm thử kỹ thuật
- **Hệ điều hành:** Windows x64 (PowerShell Shell).
- **Môi trường Runtime:** Node.js `v24.14.1` (Kích hoạt bộ kiểm thử chuẩn ESM `--test --experimental-strip-types`).
- **Framework & ORM:** Wasp `^0.26.1`, Prisma Client `5.19.0`.
- **Thư viện kiểm thử:** Bộ kiểm thử chuẩn nguyên bản của Node (`node:test`, `node:assert/strict`) — **Zero-dependency**, không phụ thuộc vào `node_modules` hay mạng internet.
- **Dữ liệu kiểm thử:** Dữ liệu giả lập hoàn toàn (Synthetic Mock Data) cho 2 doanh nghiệp độc lập (Alpha Tech và Beta Garment). Tuyệt đối không sử dụng thông tin thật hay PII thật.

### 1.2. Ma trận phân loại mức độ sẵn sàng của các nhóm chức năng

| Nhóm chức năng | Trạng thái QA | Ghi chú & Chi tiết đánh giá |
| :--- | :---: | :--- |
| **1. Đăng nhập & Xác thực** | 🟡 **Đạt một phần** | Giao diện đăng nhập Wasp Auth có sẵn, session cookie sẵn sàng. Cần môi trường DB live để kiểm tra e2e luồng gửi email xác thực thực tế. |
| **2. Quản lý Tổ chức & Thành viên** | 🟢 **Đạt** | Data model Tenant/Membership hoàn thiện, cô lập đa doanh nghiệp đạt 100% qua 12 kịch bản an ninh. |
| **3. Quản lý Nhân sự & Phòng ban** | 🟢 **Đạt** | CRUD đầy đủ, validation mã nhân viên duy nhất trong tenant, ràng buộc phòng ban thuộc cùng tenant. |
| **4. Ca làm việc & Lịch phân ca** | 🟢 **Đạt** | Model Shift & WorkSchedule hoàn thiện, hỗ trợ giờ vào/ra, số công, hệ số tăng ca, phân ca theo ngày. |
| **5. Chấm công & Đi muộn, Về sớm, OT** | 🟡 **Đạt một phần** | Đạt 100% về mặt logic tổng hợp mã công `X, N, CT, P, L, O, KP` và giờ OT. Chưa kết nối trực tiếp với phần cứng máy chấm công vân tay. |
| **6. Tính lương & Đóng băng kỳ lương** | 🟢 **Đạt** | Engine tính lương độc lập bằng số nguyên (VND), vòng đời State Machine (DRAFT $\rightarrow$ LOCKED $\rightarrow$ PAID), bảo vệ bất biến. |
| **7. Quy tắc Thuế & Giảm trừ gia cảnh** | 🟢 **Đạt** | Thuế 7 bậc hiện hành (Nghị quyết 954/2020) tính toán chuẩn xác. Bậc thuế 5 bậc đề xuất 2026 được bảo vệ bởi Compliance Guard. |
| **8. Quy tắc Bảo hiểm bắt buộc & Giới hạn trần** | 🟢 **Đạt** | Trần BHXH/BHYT 46.800.000 đ (NĐ 73/2024), trần BHTN 99.200.000 đ (NĐ 74/2024), quy tắc nghỉ $\ge$ 14 ngày miễn đóng (Luật BHXH). |
| **9. Nhập / Xuất Excel & Phiếu lương** | 🟡 **Đạt một phần** | Giao diện Modal nhập/xuất và in phiếu lương đẹp mắt, Model ImportExportJob có sẵn. Tiến trình đọc file Excel ngầm đang ở mức mô phỏng. |
| **10. Cài đặt Cấu hình & Lịch sử phiên bản** | 🟢 **Đạt** | Phân định rõ Nhóm A (khách hàng tự sửa) và Nhóm B (hệ thống kiểm soát), lưu vết `ConfigurationVersion` và `AuditLog`. |
| **11. Cô lập dữ liệu Multi-Tenant** | 🟢 **Đạt** | 12 bài kiểm thử cô lập chéo (IDOR, Cross-entity injection, Client spoofing, Role privileges) đều đạt 100%. |

---

## 2. KẾT QUẢ KIỂM THỬ TỰ ĐỘNG THỰC TẾ (AUTOMATED TEST RESULTS)

Toàn bộ **53 bài kiểm thử (100% Pass)** trên **21 bộ test suite** đã được thực thi trực tiếp trên hệ thống mà không có bất kỳ lỗi nào tồn đọng:

```text
Lệnh thực thi:
node --test --experimental-strip-types \
  "src/payroll/payrollEngine.test.ts" \
  "src/payroll/server/backendEngine.test.ts" \
  "src/payroll/server/multiTenantSecurity.test.ts" \
  "src/payroll/server/qaRegression.test.ts"

KẾT QUẢ:
▶ Vietnamese Number to Words Converter (docSo) (5 tests) .................... PASS
▶ Seniority Calculation (calculateSeniorityYears) (2 tests) ................. PASS
▶ Personal Income Tax (calculateTax) (4 tests) ............................. PASS
▶ Full Employee Payroll Engine (calcEmployeePayroll) (5 tests) ............. PASS
▶ 1. Timekeeping & Attendance Calculations (1 test) ........................ PASS
▶ 2. Salary Components, Rounding & Tax-Exempt Splits (3 tests) ............. PASS
▶ 3. Legal Boundaries & Edge Cases (3 tests) ............................... PASS
▶ 4. Multi-Tenant Security & Access Control (4 tests) ...................... PASS
▶ 5. Immutability & Configuration Versioning (2 tests) ..................... PASS
▶ 6. State Machine & Compliance Guards (4 tests) ........................... PASS
▶ Multi-Tenant Data Isolation & Security Test Suite (12 tests) ............. PASS
  ✔ 1. Cross-Tenant Read Isolation (IDOR Prevention) ....................... PASS
  ✔ 2. Cross-Tenant Mutation Isolation ..................................... PASS
  ✔ 3. Cross-Entity Ownership Boundary ..................................... PASS
  ✔ 4. Client-Provided Tenant ID Spoofing Prevention ....................... PASS
  ✔ 5. Role-Based Privilege Separation ..................................... PASS
  ✔ 6. File Import/Export Job Isolation .................................... PASS
▶ QA Regression & Independent Payroll Verification Suite (8 tests) ......... PASS
  ✔ 1. Boundary & Extreme Value Calculation Verification (3 tests) ......... PASS
  ✔ 2. Cross-Period Configuration & Immutability Verification (2 tests) .... PASS
  ✔ 3. Operational Edge Cases & Error Resilience (3 tests) ................. PASS

--------------------------------------------------------------------------------
Tổng số tests: 53  |  Số suites: 21  |  Đạt: 53 (100%)  |  Thất bại: 0  |  Thời gian: 489 ms
--------------------------------------------------------------------------------
```

---

## 3. CÁC LỖI NGHIỆP VỤ ĐÃ PHÁT HIỆN VÀ KHẮC PHỤC TRONG QUÁ TRÌNH QA

Trong quá trình xây dựng bộ test kiểm chứng độc lập (`qaRegression.test.ts`), QA Lead đã phát hiện 3 vấn đề tiềm ẩn và tiến hành khắc phục an toàn:

### 3.1. [Bug QA-01] Sai lệch tên thuộc tính người phụ thuộc gây thiếu giảm trừ gia cảnh (Mức độ: High)
- **Hiện tượng phát hiện:** Khi kiểm thử nhân viên có lương cao (500.000.000 đ) với 2 người phụ thuộc (`dependentsCount: 2`), hệ thống chỉ tính mức giảm trừ gia cảnh là **11.000.000 đ** (chỉ có bản thân), bỏ qua **8.800.000 đ** của 2 người phụ thuộc, dẫn đến số thuế TNCN bị tính thừa **3.080.000 đ**!
- **Nguyên nhân gốc rễ:** Trong `schema.prisma` và `types.ts`, thuộc tính được đặt tên là `dependentsCount`. Nhưng trong `payrollCalculationEngine.ts`, hàm tính toán lại đọc `employee.taxDependentsCount`. Khi thuộc tính này bị `undefined`, hệ thống fallback về 0.
- **Hành động khắc phục:** Sửa dòng 291 trong `payrollCalculationEngine.ts` để đọc linh hoạt cả hai tên:
  ```typescript
  const dependentsCount = Math.max(0, (employee as any).dependentsCount ?? employee.taxDependentsCount ?? 0);
  ```
- **Kết quả sau sửa:** Giảm trừ gia cảnh đạt đúng 19.800.000 đ (11M + 8.8M), thuế TNCN tính toán chính xác 100%.

### 3.2. [Bug QA-02] Nhân viên nghỉ không lương cả tháng (0 công) vẫn nhận tiền ăn trưa (Mức độ: Medium)
- **Hiện tượng phát hiện:** Khi một nhân viên nghỉ việc không lương cả tháng (26 ngày `KP`, 0 ngày làm việc thực tế), tiền ăn trưa vẫn được tự động cấp mặc định **730.000 đ**, làm cho thu nhập Gross không phải là 0 đ.
- **Nguyên nhân gốc rễ:** Biểu thức `const rawLunchAllowance = Math.max(0, employee.allowances?.lunch ?? 730_000)` tự động gán 730.000 đ mà không kiểm tra xem nhân viên có đi làm ngày nào hay không.
- **Hành động khắc phục:** Bổ sung điều kiện chỉ hưởng tiền ăn trưa khi có ít nhất 1 ngày làm việc thực tế:
  ```typescript
  const configuredLunch = employee.allowances?.lunch !== undefined
    ? employee.allowances.lunch
    : (employee as any).nonTaxableAllowance !== undefined
      ? (employee as any).nonTaxableAllowance
      : 730_000;
  const rawLunchAllowance = attendance.actualWorkDays > 0 ? Math.max(0, configuredLunch) : 0;
  ```
- **Kết quả sau sửa:** Nhân viên có 0 ngày làm việc thì tiền ăn trưa = 0 đ, Gross = 0 đ, Net = 0 đ.

### 3.3. [QA Note-03] Chuẩn hóa cơ chế làm tròn tiền tệ (Rounding Rules)
- **Kiểm chứng:** Hệ thống hỗ trợ 3 chế độ làm tròn linh hoạt theo chính sách doanh nghiệp:
  1. `ROUND_1000` (Mặc định): Làm tròn đến hàng nghìn đồng (ví dụ: `191.316.700 đ` $\rightarrow$ `191.317.000 đ`). Đây là quy ước kế toán phổ biến nhất tại Việt Nam để thuận tiện chi tiền mặt hoặc chuyển khoản tròn số.
  2. `ROUND_100`: Làm tròn đến hàng trăm đồng.
  3. `NO_ROUND`: Giữ nguyên chính xác đến từng đồng (VND).

---

## 4. ĐỐI CHIẾU NGHIỆP VỤ: FILE THAM CHIẾU HTML VS CĂN CỨ PHÁP LÝ CHÍNH THỨC

| Chỉ tiêu nghiệp vụ | Giả định trong File HTML tham chiếu | Quy định Pháp luật Việt Nam Hiện hành | Xử lý trong Hệ thống |
| :--- | :--- | :--- | :--- |
| **Mức lương cơ sở** | 2.530.000 đ (Số giả định) | **2.340.000 đ** (Nghị định 73/2024/NĐ-CP từ 01/07/2024) | Áp dụng chuẩn **2.340.000 đ**. Trần BHXH/BHYT là 46.800.000 đ. |
| **Lương tối thiểu Vùng I** | 5.310.000 đ (Số giả định) | **4.960.000 đ** (Nghị định 74/2024/NĐ-CP từ 01/07/2024) | Áp dụng chuẩn **4.960.000 đ**. Trần BHTN là 99.200.000 đ. |
| **Quy tắc nghỉ không lương** | Có xét chuyên cần | **Khoản 3 Điều 85 Luật BHXH:** Nghỉ $\ge$ 14 ngày không hưởng lương thì không đóng BHXH tháng đó. | **Tự động miễn đóng BHXH (0 đ)** cho cả NLĐ và NSDLĐ khi `unpaidLeaveDays >= 14`. |
| **Biểu thuế TNCN** | Dự kiến 5 bậc năm 2026 | Hiện tại vẫn áp dụng **Biểu thuế lũy tiến 7 bậc** (Luật Thuế TNCN & NQ 954/2020). | **CHƯA XÁC MINH PHÁP LÝ (UNVERIFIED_DRAFT):** Chỉ cho phép mô phỏng. Bị chặn khóa sổ chính thức. |
| **Miễn thuế tiền làm thêm giờ** | Miễn toàn bộ tiền OT | **Thông tư 111/2013/TT-BTC:** Chỉ miễn thuế cho phần thù lao cao hơn giờ làm tiêu chuẩn. | Áp dụng chuẩn Thông tư 111/2013: Chỉ miễn phần chênh lệch ($heSoOT - 1.0$). |

---

## 5. KIỂM THỬ KHẢ NĂNG VẬN HÀNH VÀ KHẢ NĂNG CHỊU LỖI (OPERATIONAL RESILIENCE)

1. **Trường hợp Trùng mã nhân viên (Duplicate Code):**
   - Cùng trong 1 doanh nghiệp: Tạo nhân viên mới trùng mã `NV001` $\rightarrow$ Hệ thống từ chối ngay lập tức và ném lỗi `HttpError(400, "Mã nhân viên đã tồn tại")`.
   - Ở 2 doanh nghiệp khác nhau: Cả hai công ty đều có nhân viên mã `NV001` $\rightarrow$ **Hoàn toàn độc lập, không bị xung đột khóa**.
2. **Trường hợp Kỳ lương đã bị khóa (Period Locked):**
   - Khi kỳ lương đã chuyển sang trạng thái `LOCKED`: Bất kỳ thao tác sửa chấm công hay thay đổi lương của kỳ đó đều bị từ chối với lỗi `HttpError(400)`.
   - Lương của nhân viên trong kỳ quá khứ được bảo vệ nguyên vẹn ngay cả khi hồ sơ nhân viên trong tương lai bị sửa đổi (Bảo toàn tính bất biến Snapshot).
3. **Trường hợp Người dùng không có quyền (Unauthorized Role):**
   - Kế toán (`ACCOUNTANT`) cố tình tạo phòng ban hoặc ca làm việc $\rightarrow$ Bị chặn ném lỗi `HttpError(403)`.
   - Nhân viên thường (`EMPLOYEE`) cố tình truy cập bảng lương toàn bộ công ty $\rightarrow$ Bị chặn ném lỗi `HttpError(403)`.
4. **Trường hợp Rò rỉ dữ liệu chéo (Cross-Tenant Leakage):**
   - User của Công ty A cố tình truyền ID bản ghi của Công ty B $\rightarrow$ Hệ thống chặn ném lỗi `HttpError(403)`, tuyệt đối không lộ thông tin.

---

## 6. ĐÁNH GIÁ RỦI RO CÒN TỒN TẠI (RESIDUAL RISKS)

| Rủi ro còn tồn tại | Mức độ | Biện pháp giảm thiểu đã áp dụng | Kế hoạch xử lý tiếp theo |
| :--- | :---: | :--- | :--- |
| **Rủi ro 1: Biểu thuế 5 bậc năm 2026 chưa ban hành** | Medium | Đã thiết lập rào chắn `assertRuleReadyForFinalLock` không cho chốt bảng lương chính thức bằng luật dự thảo. | Cập nhật phiên bản chính thức khi Quốc hội thông qua luật mới. |
| **Rủi ro 2: Database live chưa chạy migration** | Low | Đã kiểm thử 100% logic trên In-memory Database Store độc lập. | Chạy `wasp db migrate-dev` khi người dùng kết nối PostgreSQL live. |
| **Rủi ro 3: Xử lý tệp Excel quy mô cực lớn (>10.000 dòng)** | Low | Đã có Model `ImportExportJob` quản lý hàng đợi và trạng thái `PENDING / PROCESSING`. | Triển khai worker nền (Background Worker) sử dụng BullMQ / Redis trên Production. |

---

## 7. DANH SÁCH VIỆC CẦN THỰC HIỆN TIẾP THEO

1. **Bước 1 (Ưu tiên số 1):** Trình nộp báo cáo kiểm thử QA cho Chủ sản phẩm để xem xét và phê duyệt.
2. **Bước 2 (Giai đoạn tiếp theo):** Tiến hành kiểm toán bảo mật chuyên sâu (Security Audit / Threat Modeling) đối với các lỗ hổng OWASP Top 10, quản lý Secret và kiểm thử thâm nhập API.
3. **Bước 3:** Kết nối cơ sở dữ liệu Supabase PostgreSQL thực tế và triển khai Worker nhập/xuất tệp Excel tự động.
