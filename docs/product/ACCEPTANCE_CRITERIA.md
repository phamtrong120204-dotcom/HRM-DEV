# TIÊU CHÍ NGHIỆM THU CHI TIẾT (ACCEPTANCE CRITERIA)
## PHỤC VỤ KIỂM THỬ VÀ ĐẢM BẢO CHẤT LƯỢNG (QA & TEST AUTOMATION)

---

## 1. NGUYÊN TẮC NGHIỆM THU

Tài liệu này được định dạng theo cấu trúc chuẩn **Given - When - Then** (Gherkin format) để làm căn cứ phát triển tính năng, kiểm thử chấp nhận người dùng (UAT) và xây dựng kịch bản kiểm thử tự động (Playwright E2E & Vitest).

Mỗi kịch bản mô tả rõ điều kiện đầu vào, thao tác thực hiện và kết quả kỳ vọng ở cả hai phía: Giao diện người dùng (Client) và Cơ sở dữ liệu/API máy chủ (Server).

---

## 2. CÁC KỊCH BẢN NGHIỆM THU CHÍNH (CORE TEST SCENARIOS)

### Kịch bản 1: Khởi tạo Doanh nghiệp & Cô lập dữ liệu (Multi-tenant Onboarding)
* **Mục tiêu:** Đảm bảo mỗi doanh nghiệp tạo ra có dữ liệu độc lập và người dùng thuộc công ty nào chỉ truy cập đúng công ty đó.
* **Given (Bối cảnh):** Người dùng `user_A@gmail.com` vừa đăng ký và xác thực tài khoản qua email.
* **When (Thao tác):**
  1. Người dùng bấm "Tạo doanh nghiệp mới".
  2. Nhập Tên công ty: `Công ty TNHH Giải Pháp Số`, MST: `0109998888`.
  3. Bấm "Xác nhận tạo".
* **Then (Kết quả kỳ vọng):**
  * Bản ghi `Tenant` mới được tạo với `id = tenant_123`.
  * Một bản ghi `Membership` được tạo liên kết `user_A` với `tenant_123`, vai trò là `OWNER`.
  * Bộ thiết lập mặc định `CompanySetting` được tự động khởi tạo cho `tenant_123`.
  * Khi người dùng `user_B` của công ty khác đăng nhập, hệ thống không trả về bất kỳ bản ghi nào của `tenant_123`.

---

### Kịch bản 2: Nhập danh sách nhân viên từ Excel & Xử lý trùng lặp
* **Mục tiêu:** Kiểm tra khả năng bóc tách file Excel, nhận diện cột tự động và xử lý xung đột mã nhân viên.
* **Given (Bối cảnh):** Công ty đã có nhân viên mã `NV001` (Tên: Nguyễn Văn An, Lương CB: 10.000.000 đ).
* **When (Thao tác):**
  1. Kế toán tải lên file Excel có 2 dòng:
     * Dòng 1: Mã `NV001`, Tên `Nguyễn Văn An`, Lương CB `12.000.000 đ`.
     * Dòng 2: Mã `NV002`, Tên `Trần Thị Bình`, Lương CB `9.000.000 đ`.
  2. Tại giao diện xem trước (Preview), kế toán chọn chế độ xử lý trùng mã: `Cập nhật theo danh sách mới`.
  3. Bấm "Nhập nhân viên".
* **Then (Kết quả kỳ vọng):**
  * Hệ thống thông báo thành công: "Đã thêm 1 nhân viên mới, cập nhật 1 nhân viên".
  * Dữ liệu trong Database: `NV001` được cập nhật mức lương mới 12.000.000 đ.
  * Nhân viên `NV002` được tạo mới với đầy đủ thông tin.
  * Không phát sinh lỗi xung đột khóa chính hoặc tạo bản ghi trùng lặp.

---

### Kịch bản 3: Chấm công bằng cọ vẽ & Tự động tổng hợp công
* **Mục tiêu:** Kiểm tra lưới chấm công trực quan, việc ghi nhận trạng thái và tính toán tổng công hưởng lương.
* **Given (Bối cảnh):** Kỳ chấm công tháng 04/2026 (30 ngày, công chuẩn 26 ngày).
* **When (Thao tác):**
  1. Người chấm công chọn cọ `X` (Đi làm cả ngày), rê chuột chấm 20 ngày thường.
  2. Chọn cọ `P` (Nghỉ phép năm), chấm 2 ngày.
  3. Chọn cọ `L` (Nghỉ lễ 30/4), chấm 1 ngày.
  4. Chọn cọ `KP` (Nghỉ không lương), chấm 3 ngày.
  5. Nhập vào ô Giờ OT: `10` giờ.
* **Then (Kết quả kỳ vọng):**
  * Cột `Công làm (lv)` hiển thị: `20.0`.
  * Cột `Phép + Lễ (P+L)` hiển thị: `3.0`.
  * Cột `Nghỉ KL (kl)` hiển thị: `3.0`.
  * Cột `Công hưởng lương (hl)` hiển thị chính xác: `23.0` công ($20 + 2 + 1$).
  * Cột `Giờ OT` ghi nhận: `10.0` giờ.
  * Dữ liệu được lưu trữ an toàn trong bảng `AttendanceRecord` trên máy chủ.

---

### Kịch bản 4: Động cơ tính lương và Quy tắc miễn bảo hiểm 14 ngày
* **Mục tiêu:** Xác minh tính chính xác của công thức tính lương và điều kiện miễn trừ đóng bảo hiểm theo Luật BHXH.
* **Given (Bối cảnh):**
  * Nhân viên A: Lương CB 13.000.000 đ, Lương đóng BH 10.000.000 đ, Công chuẩn 26 ngày.
  * Trong tháng 04/2026, nhân viên A có số ngày nghỉ không lương `KP = 15` ngày (vượt ngưỡng 14 ngày).
* **When (Thao tác):** Kế toán mở Bảng lương tháng 04/2026.
* **Then (Kết quả kỳ vọng):**
  * Cột `Lương đóng BH` của nhân viên A xuất hiện biểu tượng cảnh báo `!` (Nghỉ KL từ 14 ngày trở lên).
  * Tiền trừ BHXH, BHYT, BHTN phần người lao động đóng tự động bằng `0 đ`.
  * Phần chi phí doanh nghiệp đóng (BHXH, BHYT, BHTN, KPCĐ) cũng tự động bằng `0 đ`.
  * Tiền lương tính theo công:
    $$\text{Lương công} = \text{round}\left(\frac{13.000.000}{26} \times 11\right) = 5.500.000 \text{ đ}$$

---

### Kịch bản 5: Động cơ tính thuế TNCN và Quy tắc miễn thuế làm thêm giờ (OT)
* **Mục tiêu:** Xác minh tính toán thuế TNCN theo biểu lũy tiến và quy định miễn thuế tiền làm thêm giờ.
* **Given (Bối cảnh):**
  * Kỳ lương: Tháng 03/2026.
  * Nhân viên B: Lương CB 26.000.000 đ (Công chuẩn 26 ngày $\rightarrow$ 1.000.000 đ/ngày, 125.000 đ/giờ). Đi làm đủ 26 công.
  * Làm thêm giờ OT ngày thường: 16 giờ (Hệ số 1.5).
  * Tiền OT thực nhận: $125.000 \times 16 \times 1.5 = 3.000.000 \text{ đ}$.
  * Người phụ thuộc: 0. Không có phụ cấp. Lương đóng BH 10.000.000 đ.
* **When (Thao tác):** Hệ thống thực thi tính thuế TNCN.
* **Then (Kết quả kỳ vọng):**
  * Tổng thu nhập (Gross): $26.000.000 + 3.000.000 = 29.000.000 \text{ đ}$.
  * Tiền OT miễn thuế (Áp dụng quy định từ 2026: Miễn toàn bộ tiền OT): $3.000.000 \text{ đ}$.
  * Thu nhập chịu thuế: $29.000.000 - 3.000.000 = 26.000.000 \text{ đ}$.
  * Giảm trừ BHXH (8%), BHYT (1.5%), BHTN (1%): $10.000.000 \times 10.5\% = 1.050.000 \text{ đ}$.
  * Giảm trừ gia cảnh bản thân (cấu hình 2026): $15.500.000 \text{ đ}$.
  * Thu nhập tính thuế:
    $$26.000.000 - 1.050.000 - 15.500.000 = 9.450.000 \text{ đ}$$
  * Thuế TNCN phải nộp (Bậc 1: $\le 10$ triệu, thuế suất 5%):
    $$9.450.000 \times 5\% = 472.500 \text{ đ}$$
  * Thực lĩnh:
    $$29.000.000 - 1.050.000 - 472.500 = 27.477.500 \text{ đ}$$

---

### Kịch bản 6: Khóa kỳ lương và Tính bất biến của dữ liệu lịch sử
* **Mục tiêu:** Đảm bảo khi một kỳ lương đã được chốt và khóa, các thao tác thay đổi hồ sơ nhân viên sau đó không làm thay đổi âm thầm bảng lương cũ.
* **Given (Bối cảnh):** Bảng lương tháng 01/2026 đã được Giám đốc bấm "Khóa kỳ lương" (Trạng thái chuyển sang `LOCKED`).
* **When (Thao tác):**
  1. Sang tháng 02/2026, nhân sự tăng lương cơ bản của nhân viên C từ 10 triệu lên 15 triệu trong mục "Hồ sơ nhân viên".
  2. Kế toán quay lại mở xem Bảng lương tháng 01/2026.
* **Then (Kết quả kỳ vọng):**
  * Bảng lương tháng 01/2026 vẫn giữ nguyên mức lương 10 triệu và số tiền thực lĩnh cũ của nhân viên C.
  * Các ô màu vàng bị khóa (disable), không cho phép chỉnh sửa trực tiếp.
  * Nút "Tính lại lương" bị vô hiệu hóa kèm thông báo "Kỳ lương đã khóa. Vui lòng mở khóa nếu muốn điều chỉnh".

---

### Kịch bản 7: Bảo mật phân quyền Cổng thông tin nhân viên (Self-Service)
* **Mục tiêu:** Kiểm tra cơ chế chặn truy cập trái phép ở mức Server API.
* **Given (Bối cảnh):** Người dùng `nhanvien_01` đăng nhập hệ thống với vai trò `EMPLOYEE`.
* **When (Thao tác):**
  1. Người dùng mở trang tra cứu Phiếu lương cá nhân.
  2. Cố tình gửi một request can thiệp API với mã nhân viên của người khác: `getSalarySlip({ employeeId: "emp_Sep" })`.
* **Then (Kết quả kỳ vọng):**
  * Wasp Backend ném lỗi `HttpError(403, "Bạn không có quyền xem phiếu lương của nhân sự này")`.
  * Trên màn hình chỉ hiển thị phiếu lương của chính `nhanvien_01`.
  * Hành vi cố tình truy vấn trái phép được ghi lại trong `AuditLog`.

---

### Kịch bản 8: Đổi số tiền thành chữ tiếng Việt chính xác (`docSo`)
* **Mục tiêu:** Kiểm tra thuật toán đọc số tiền trên phiếu lương và báo cáo in.
* **Given (Bối cảnh):** Bảng lương có các mức thực lĩnh khác nhau.
* **When (Thao tác):** Chạy hàm chuyển đổi số thành chữ.
* **Then (Kết quả kỳ vọng):**
  * `0` $\rightarrow$ "Không đồng".
  * `15.000.000` $\rightarrow$ "Mười lăm triệu đồng".
  * `27.477.500` $\rightarrow$ "Hai mươi bảy triệu bốn trăm bảy mươi bảy nghìn năm trăm đồng".
  * `101.005.000` $\rightarrow$ "Một trăm lẻ một triệu không trăm lẻ năm nghìn đồng".
  * Luôn viết hoa chữ cái đầu tiên và có chữ "đồng" ở cuối.
