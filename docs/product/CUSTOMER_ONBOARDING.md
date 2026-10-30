# CUSTOMER ONBOARDING GUIDE — HƯỚNG DẪN THIẾT LẬP DÀNH CHO KHÁCH HÀNG MỚI
**Dự án:** Phần mềm Quản trị Chấm công, Nhân sự & Tính lương B2B SaaS  
**Đối tượng phục vụ:** Giám đốc doanh nghiệp, Trưởng phòng Nhân sự, Kế toán trưởng (Không yêu cầu kiến thức kỹ thuật)  
**Thời gian hoàn thành ước tính:** 30 - 45 phút  

---

Chào mừng Quý Doanh nghiệp đến với hệ thống Quản trị Chấm công, Nhân sự & Tính lương! Dưới đây là lộ trình 12 bước chuẩn hóa giúp doanh nghiệp thiết lập hệ thống nhanh chóng và chính xác.

```
[ 1. Khởi tạo tổ chức ] ----> [ 2. Tài khoản Quản trị ] ----> [ 3. Thông tin công ty ]
                                                                      |
[ 6. Chính sách chấm công ] <-- [ 5. Import nhân viên ] <--- [ 4. Phòng ban & Ca làm ]
          |
          v
[ 7. Thành phần lương ] ----> [ 8. Cấu hình Thuế/BH ] ----> [ 9. Chạy thử nghiệm ]
                                                                      |
[ 12. Hướng dẫn & Hỗ trợ ] <-- [ 11. Phân quyền thành viên ] <-- [ 10. Duyệt & Bàn giao ]
```

---

## 12 BƯỚC THIẾT LẬP CHI TIẾT

### Bước 1: Khởi tạo Tổ chức khách hàng (Tenant Setup)
* Đăng ký tên định danh công ty (ví dụ: `cong-ty-abc`).
* Hệ thống sẽ tự động tạo một không gian làm việc số (Workspace) độc lập, bảo mật và hoàn toàn cách ly với các doanh nghiệp khác.

### Bước 2: Tạo Tài khoản Quản trị viên Doanh nghiệp (`ORG_OWNER`)
* Đăng ký tài khoản người dùng đầu tiên (thường là Giám đốc hoặc Trưởng ban triển khai).
* Kích hoạt xác thực 2 lớp (2FA) qua email/số điện thoại để bảo vệ tối đa dữ liệu nhân sự.

### Bước 3: Khởi tạo Thông tin Doanh nghiệp
* Truy cập menu **Cài đặt $\rightarrow$ Hồ sơ Doanh nghiệp**.
* Điền đầy đủ: Tên công ty pháp lý, Mã số thuế, Địa chỉ trụ sở, Số điện thoại liên hệ và tải lên Logo chính thức của công ty (dùng để in lên phiếu lương điện tử).

### Bước 4: Thiết lập Phòng ban, Chức vụ & Ca làm việc
* **Phòng ban:** Thêm danh mục các phòng ban trong công ty (ví dụ: *Phòng Kinh doanh, Phòng Kỹ thuật, Phòng Kế toán, Khối Sản xuất*).
* **Chức vụ:** Khai báo các chức danh (ví dụ: *Trưởng phòng, Chuyên viên, Nhân viên, Công nhân*).
* **Ca làm việc:** Tạo các khung giờ làm việc:
  - *Ca hành chính:* 08:00 - 17:30 (nghỉ trưa 12:00 - 13:30, 8 giờ làm việc chuẩn).
  - *Ca sáng:* 06:00 - 14:00 | *Ca chiều:* 14:00 - 22:00 | *Ca đêm:* 22:00 - 06:00.

### Bước 5: Nhập danh sách Nhân viên bằng File Excel mẫu (Import Employees)
* Bấm vào nút **"Tải file mẫu Excel"** trong mục Quản lý Nhân sự.
* Điền thông tin nhân viên theo các cột hướng dẫn: *Mã NV, Họ tên, Ngày sinh, CCCD, Số điện thoại, Ngày vào làm, Lương cơ bản, Số người phụ thuộc, Số tài khoản ngân hàng*.
* Tải file Excel lên hệ thống. Hệ thống sẽ tự động rà quét lỗi: kiểm tra trùng lặp mã nhân viên, sai định dạng CCCD hoặc thiếu thông tin bắt buộc trước khi lưu vào danh bạ.

### Bước 6: Thiết lập Chính sách Chấm công & Làm thêm giờ
* Cài đặt thời gian cho phép đi muộn / về sớm mà không bị phạt (ví dụ: 15 phút đầu giờ).
* Cấu hình tỷ lệ tính tiền làm thêm giờ (OT): Mặc định tuân thủ Bộ luật Lao động Việt Nam:
  - Làm thêm ngày thường: **150%**.
  - Làm thêm ngày nghỉ cuối tuần: **200%**.
  - Làm thêm ngày lễ, tết: **300%**.

### Bước 7: Thiết lập Thành phần Lương & Chu kỳ tính lương
* **Thành phần lương:** Bật/tắt các khoản phụ cấp và phúc lợi đang áp dụng tại công ty:
  - *Phụ cấp ăn trưa:* Khuyến nghị mức tối đa 730.000 VNĐ/tháng để được miễn thuế TNCN.
  - *Phụ cấp thâm niên:* Tự động cộng thêm số tiền theo số năm cống hiến.
  - *Thưởng chuyên cần:* Tự động khấu trừ nếu nghỉ không phép vượt quá số ngày quy định.
* **Chu kỳ tính lương:** Chọn ngày chốt công (ví dụ: Từ ngày 01 đến ngày cuối tháng, hoặc từ ngày 26 tháng trước đến ngày 25 tháng này).

### Bước 8: Kiểm tra Quy tắc Thuế TNCN & Bảo hiểm xã hội
* **Bảo hiểm xã hội bắt buộc:** Xác nhận tỷ lệ trích nộp phần người lao động chịu (8% BHXH, 1.5% BHYT, 1% BHTN) và mức lương cơ sở để áp mức trần đóng bảo hiểm.
* **Biểu thuế thu nhập cá nhân:**
  - *Chính thức (Khuyến nghị áp dụng):* Biểu thuế lũy tiến từng phần 7 bậc và mức giảm trừ 11 triệu (bản thân) + 4.4 triệu (người phụ thuộc).
  - *Mô phỏng thử nghiệm (Dự thảo):* Biểu thuế 5 bậc và giảm trừ 15.5 triệu / 5.5 triệu (chỉ dùng để mô phỏng dự toán ngân sách).

### Bước 9: Chạy tính thử nghiệm Kỳ lương đầu tiên (Dry-Run Test)
* Bấm nút **"Tính toán bảng lương"** cho tháng hiện tại.
* Hệ thống sẽ tự động tổng hợp số công thực tế, tính tiền làm thêm giờ, trừ tiền bảo hiểm, tính thuế TNCN và cho ra mức Lương thực lĩnh (Net Pay) cuối cùng.

### Bước 10: Xem trước kết quả & Khóa xác nhận thiết lập
* Kiểm tra thử phiếu lương của một vài nhân viên tiêu biểu (nhân viên có thâm niên, nhân viên có làm thêm giờ, nhân viên nghỉ phép không lương $\ge 14$ ngày).
* Đọc lại bảng tổng hợp quỹ lương của toàn công ty. Khi số liệu hoàn toàn khớp đúng với quy chế công ty, bấm **"Xác nhận hoàn tất cấu hình ban đầu"**.

### Bước 11: Mời thành viên & Phân quyền truy cập nội bộ
* Gửi lời mời qua email cho các bộ phận liên quan:
  - **Kế toán lương (`ACCOUNTANT`):** Có quyền nhập công, tính toán lương, xem số tài khoản ngân hàng để chuyển khoản nhưng không được đổi cấu hình hệ thống.
  - **Quản lý Nhân sự (`HR_MANAGER`):** Quản lý hồ sơ nhân viên, phân ca làm việc và duyệt đơn xin nghỉ phép.
  - **Nhân viên thông thường (`EMPLOYEE`):** Chỉ xem được bảng chấm công của chính mình và phiếu lương cá nhân của bản thân; không xem được số CCCD/STK hay lương của đồng nghiệp.

### Bước 12: Hướng dẫn Sao lưu, Xuất dữ liệu & Hỗ trợ kỹ thuật
* Hướng dẫn Kế toán trưởng cách xuất file Excel tổng hợp hằng tháng và phiếu lương PDF gửi cho nhân viên.
* Hướng dẫn Giám đốc cách tải file sao lưu dự phòng định kỳ (`.json`).
* Cung cấp số Hotline và nhóm Zalo hỗ trợ khách hàng ưu tiên 24/7.

---

## 2. CÁC MẪU CẤU HÌNH DOANH NGHIỆP CÓ SẴN (PRE-BUILT TEMPLATES)

Để tiết kiệm thời gian, hệ thống cung cấp 3 mẫu thiết lập chuẩn hóa theo ngành nghề:
1. **Mẫu Khối Văn phòng - Dịch vụ (Standard Office):**
   - Làm việc 5 hoặc 5.5 ngày/tuần (thứ Hai đến thứ Sáu hoặc hết sáng thứ Bảy).
   - Lương thời gian cố định, phụ cấp ăn trưa 730k, thưởng chuyên cần.
2. **Mẫu Khối Sản xuất - Nhà máy (Manufacturing & Factory Shifts):**
   - Phân chia 3 ca xoay vòng, làm thêm giờ thường xuyên, phụ cấp ca đêm (+30%), lương khoán theo sản phẩm kết hợp lương thời gian.
3. **Mẫu Chuỗi Cửa hàng - Bán lẻ / F&B (Retail & Restaurant Chains):**
   - Chấm công linh hoạt theo giờ, lương part-time theo giờ làm thực tế, thưởng doanh số chi nhánh.

*Lưu ý bảo mật:* Khi áp dụng các mẫu cấu hình này, hệ thống chỉ kế thừa cấu trúc khung cài đặt, tuyệt đối không sao chép bất kỳ dữ liệu nhân sự hay thông tin cá nhân của các công ty khác.
