# SETTINGS USER GUIDE — HƯỚNG DẪN CÀI ĐẶT NGHIỆP VỤ DOANH NGHIỆP (NHÓM A)
**Dự án:** Phần mềm Quản trị Chấm công, Nhân sự & Tính lương B2B SaaS  
**Phiên bản hệ thống:** 1.0.0-RC1  
**Ngày lập tài liệu:** 2026-10-25  
**Đối tượng sử dụng:** Ban Giám đốc, Kế toán trưởng, Quản trị viên Doanh nghiệp  

---

## 1. TỔNG QUAN VỀ KHU VỰC CÀI ĐẶT DOANH NGHIỆP (NHÓM A)

Hệ thống được thiết kế theo nguyên tắc trao quyền tối đa cho khách hàng: **Toàn bộ các quy tắc nghiệp vụ Nhóm A đều do Doanh nghiệp tự chủ động cấu hình trực tiếp trên giao diện web mà không cần phải biết lập trình hay nhờ nhân viên kỹ thuật can thiệp**.

Mọi thay đổi cấu hình đều được ghi nhận phiên bản (`Configuration Versioning`) và lưu vết trong `AuditLog` để đảm bảo tính minh bạch.

---

## 2. CHI TIẾT CÁC MỤC CÀI ĐẶT NGHIỆP VỤ

### 2.1. Hồ sơ Doanh nghiệp (Company Profile)
* **Tên doanh nghiệp:** Tên pháp lý chính xác trên Giấy chứng nhận đăng ký kinh doanh.
* **Mã số thuế (MST):** Mã số thuế của doanh nghiệp (dùng để in lên bảng lương tổng hợp và báo cáo thuế).
* **Địa chỉ trụ sở & Số điện thoại liên hệ:** Xuất hiện trên tiêu đề của phiếu lương điện tử.
* **Logo công ty:** Hỗ trợ tải lên định dạng `.png`, `.jpg` (dung lượng $\le 2$MB). Logo sẽ tự động gắn vào góc trên cùng của phiếu lương PDF và giao diện làm việc.

### 2.2. Danh mục Phòng ban & Chức vụ (Departments & Positions)
* **Thêm mới phòng ban:** Nhập Tên phòng ban, Mã phòng ban (ví dụ: `KT` - Phòng Kế toán, `KD` - Phòng Kinh doanh), chọn Trưởng bộ phận.
* **Thêm mới chức vụ:** Khai báo chức danh nghề nghiệp và mức phụ cấp chức vụ tương ứng (nếu có).

### 2.3. Quản lý Ca làm việc & Lịch làm (Shifts & Schedules)
* **Khai báo ca làm:**
  - *Tên ca:* Ca hành chính, Ca 1, Ca 2, Ca đêm.
  - *Khung giờ:* Giờ bắt đầu vào ca, Giờ kết thúc ca, Giờ bắt đầu/kết thúc nghỉ giữa ca.
  - *Thời gian làm việc chuẩn:* Mặc định 8 giờ / ca.
  - *Hệ số lương ca đêm:* Tự động cộng thêm tỷ lệ % lương ca đêm (ví dụ: +30% theo luật).
* **Lịch làm việc tuần:** Chọn các ngày làm việc tiêu chuẩn trong tuần (thứ Hai đến thứ Sáu, hoặc thêm thứ Bảy). Các ngày còn lại được tự động coi là ngày nghỉ tuần.

### 2.4. Chính sách Chấm công & Làm thêm giờ (Attendance & Overtime Rules)
* **Quy tắc đi muộn / Về sớm:**
  - *Thời gian ân hạn (Grace Period):* Cho phép đi muộn trong khoảng 5 - 15 phút đầu giờ mà không trừ công.
  - *Mức trừ công khi vi phạm:* Khấu trừ theo phút hoặc theo tỷ lệ 0.25 công / 0.5 công tùy quy chế nội bộ.
* **Hệ số làm thêm giờ (OT Multipliers):**
  - Làm thêm ngày làm việc bình thường: Mặc định **150%**.
  - Làm thêm vào ngày nghỉ hằng tuần (thứ Bảy/Chủ nhật): Mặc định **200%**.
  - Làm thêm vào ngày lễ, tết, ngày nghỉ có hưởng lương: Mặc định **300%**.

### 2.5. Thành phần Tiền lương & Phụ cấp (Salary Components)
Doanh nghiệp có thể bật/tắt và điều chỉnh công thức tính của từng khoản thu nhập:
* **Lương cơ bản / Lương hợp đồng:** Căn cứ tính đóng bảo hiểm và tính lương ngày công.
* **Phụ cấp ăn trưa:**
  - *Mức chi trả:* Ví dụ 730.000 VNĐ / tháng.
  - *Quy tắc thuế:* Hệ thống tự động tách thành 2 phần: Phần $\le 730.000$ VNĐ được miễn thuế TNCN; phần vượt quá 730.000 VNĐ (nếu có) sẽ cộng vào thu nhập chịu thuế theo đúng Thông tư 26/2015/TT-BTC.
* **Phụ cấp thâm niên (Seniority Allowance):**
  - Cấu hình số tiền thưởng cộng thêm cho mỗi năm công tác (ví dụ: 100.000 VNĐ / năm thâm niên). Hệ thống tự động tính số năm làm việc dựa trên ngày vào công ty.
* **Thưởng chuyên cần (Attendance Bonus):**
  - Mức tiền thưởng (ví dụ: 500.000 VNĐ / tháng).
  - *Điều kiện hưởng:* Không nghỉ không lương quá số ngày cho phép (ví dụ: $\le 1$ ngày). Nếu nghỉ từ 2 ngày không lương trở lên, hệ thống tự động hủy khoản thưởng này.

### 2.6. Biểu thuế Thu nhập cá nhân & Giảm trừ gia cảnh (Personal Income Tax)
* **Phương án 1 (Chính thức theo luật hiện hành):**
  - Biểu thuế lũy tiến từng phần 7 bậc (5%, 10%, 15%, 20%, 25%, 30%, 35%).
  - Mức giảm trừ bản thân: **11.000.000 VNĐ / tháng**.
  - Mức giảm trừ mỗi người phụ thuộc: **4.400.000 VNĐ / tháng**.
* **Phương án 2 (Mô phỏng dự thảo sửa đổi):**
  - Biểu thuế rút gọn 5 bậc và giảm trừ 15.5 triệu / 5.5 triệu.
  - *Cảnh báo:* Chỉ dùng cho mục đích dự toán chi phí nhân sự năm sau, không dùng để nộp thuế kho bạc thực tế.

### 2.7. Tỷ lệ Trích đóng Bảo hiểm xã hội (Statutory Insurance Rates)
* **BHXH (Hưu trí & Tử tuất, Ốm đau, Thai sản):** 8% (NLĐ) | 17.5% (Doanh nghiệp).
* **BHYT (Y tế):** 1.5% (NLĐ) | 3% (Doanh nghiệp).
* **BHTN (Thất nghiệp):** 1% (NLĐ) | 1% (Doanh nghiệp).
* **Mức trần đóng bảo hiểm:** Tối đa bằng 20 lần mức lương cơ sở do Chính phủ quy định tại thời điểm tính lương.

### 2.8. Quy tắc Làm tròn tiền tệ (Currency Rounding Rules)
* **Làm tròn đến 1.000 VNĐ (`ROUND_1000` - Khuyến nghị):** Tiền lương thực lĩnh được làm tròn đến hàng nghìn đồng (ví dụ: 15.456.789 VNĐ $\rightarrow$ 15.457.000 VNĐ) để thuận tiện cho việc chuyển khoản ngân hàng và phát lương tiền mặt.
* **Làm tròn đến 100 VNĐ / Không làm tròn (`NO_ROUND`):** Giữ nguyên số lẻ phục vụ kiểm toán tài chính chi tiết.

---

## 3. NGUYÊN TẮC BẤT BIẾN KHI KỲ LƯƠNG ĐÃ KHÓA SỔ (LOCKED PERIOD GUARD)

> [!IMPORTANT]
> **TÍNH ĐÓNG BĂNG DỮ LIỆU LỊCH SỬ:**  
> Khi một kỳ lương đã được chuyển sang trạng thái **ĐÃ KHÓA SỔ (`LOCKED`)** hoặc **ĐÃ CHI TRẢ (`PAID`)**, mọi thay đổi trong phần Cài đặt sau đó **HOÀN TOÀN KHÔNG LÀM THAY ĐỔI** số liệu của kỳ lương cũ.  
> Cài đặt mới chỉ có hiệu lực áp dụng cho các kỳ lương đang ở trạng thái Bản nháp (`DRAFT`) hoặc các kỳ lương của các tháng tiếp theo.
