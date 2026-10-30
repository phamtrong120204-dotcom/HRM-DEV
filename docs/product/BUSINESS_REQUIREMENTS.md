# YÊU CẦU NGHIỆP VỤ HỆ THỐNG (BUSINESS REQUIREMENTS DOCUMENT - BRD)

---

## 1. MỤC TIÊU VÀ PHẠM VI HỆ THỐNG

Tài liệu này xác định chi tiết các **Yêu cầu Chức năng (Functional Requirements - FR)** và **Yêu cầu Phi chức năng (Non-Functional Requirements - NFR)** cho nền tảng SaaS Chấm công & Tính lương đa doanh nghiệp.

Toàn bộ các quy tắc nghiệp vụ trong tài liệu được chuẩn hóa và mở rộng từ file nghiệp vụ tham chiếu `Cham_cong_Tinh_luong_ThayDat_V3.html` kết hợp với các quy định pháp luật lao động, thuế và bảo hiểm xã hội hiện hành tại Việt Nam.

---

## 2. PHÂN LOẠI YÊU CẦU QUẢN TRỊ (NHÓM A & NHÓM B)

Hệ thống phân tách triệt để giữa nội dung khách hàng được toàn quyền tự cấu hình và nội dung hệ thống phải kiểm soát nghiêm ngặt:

```
┌────────────────────────────────────────────────────────────────────────┐
│                   NHÓM A: KHÁCH HÀNG TỰ CẤU HÌNH (SETTINGS)            │
│  - Thông tin doanh nghiệp, logo, thông tin người ký                    │
│  - Sơ đồ phòng ban, chức vụ, quản lý trạng thái làm việc               │
│  - Số ngày công chuẩn (24/26/28), số giờ công/ngày (8h), ngày nghỉ tuần│
│  - Danh mục ký hiệu chấm công và giá trị hưởng lương                   │
│  - Danh mục các khoản phụ cấp nội bộ (chuyên cần, thâm niên, xăng xe)  │
│  - Đơn giá lương sản phẩm và cách thức nhập sản lượng                  │
│  - Quy tắc phân quyền vai trò thành viên nội bộ                        │
│  - Chu kỳ tính lương (ngày bắt đầu - ngày kết thúc chu kỳ)             │
│  - Mẫu xuất nhập Excel, mẫu in phiếu lương cá nhân                     │
└────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│               NHÓM B: HỆ THỐNG KIỂM SOÁT & PHÊ DUYỆT (GOVERNED)        │
│  - Biểu thuế thu nhập cá nhân lũy tiến từng phần (5 bậc 2026 vs 7 bậc) │
│  - Mức giảm trừ gia cảnh bản thân và người phụ thuộc theo luật         │
│  - Tỷ lệ trích nộp bảo hiểm bắt buộc (BHXH, BHYT, BHTN, KPCĐ)          │
│  - Mức trần đóng bảo hiểm (20 lần lương cơ sở / lương tối thiểu vùng)  │
│  - Quy tắc khóa bảng lương đã chốt và quy trình mở khóa hồi tố         │
│  - Lịch sử kiểm toán (Audit Trail) ghi nhận mọi thao tác nhạy cảm      │
│  - Phân quyền cấp Super Admin và các thiết lập hạ tầng bảo mật         │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. CHI TIẾT YÊU CẦU CHỨC NĂNG (FUNCTIONAL REQUIREMENTS)

### 3.1. Phân hệ Quản lý Tổ chức & Doanh nghiệp (Tenant Management)
* **FR-ORG-01:** Cho phép một tài khoản người dùng tạo mới hoặc tham gia vào một hoặc nhiều Doanh nghiệp (Multi-organization support).
* **FR-ORG-02:** Thiết lập hồ sơ công ty: Tên pháp nhân, mã số thuế, địa chỉ trụ sở, số điện thoại, email liên hệ, website và tải lên logo công ty (lưu trữ S3/Supabase Storage).
* **FR-ORG-03:** Quản lý cơ cấu phòng ban đa cấp và danh mục chức vụ công việc.
* **FR-ORG-04:** Thiết lập danh sách người ký đại diện hiển thị trên các biểu mẫu in ấn (Người lập biểu, Kế toán trưởng, Giám đốc).

### 3.2. Phân hệ Hồ sơ Nhân sự (HR Master Data)
* **FR-HR-01:** Quản lý thông tin định danh nhân viên: Mã NV (duy nhất trong từng công ty), Họ và tên, Giới tính, Ngày sinh, Số CCCD/Hộ chiếu, Mã số thuế cá nhân, SĐT, Email.
* **FR-HR-02:** Quản lý thông tin hợp đồng & công việc: Phòng ban, Chức vụ, Ngày vào làm việc, Trạng thái nhân sự (`Đang làm`, `Thử việc`, `Nghỉ việc`).
* **FR-HR-03:** Quản lý chế độ đãi ngộ cơ bản:
  * Lương cơ bản tháng (dùng để tính lương thời gian).
  * Lương làm căn cứ đóng bảo hiểm (cho phép bằng 0 nếu không tham gia BHXH).
  * Phụ cấp chịu thuế khác (trách nhiệm, phụ cấp kiêm nhiệm...).
  * Phụ cấp không chịu thuế (ăn trưa/ăn ca tối đa theo quy chế, công tác phí, trang phục).
  * Mức phụ cấp chuyên cần tối đa.
  * Mức phụ cấp thâm niên (đồng/năm làm việc).
  * Phụ cấp xăng xe / đi lại.
  * Đơn giá sản phẩm mặc định (đồng/sản phẩm).
* **FR-HR-04:** Quản lý thanh toán & giảm trừ: Số người phụ thuộc (NPT) có hồ sơ đăng ký hợp lệ, Tên ngân hàng, Số tài khoản ngân hàng nhận lương.
* **FR-HR-05:** **Nhập dữ liệu nhân sự hàng loạt (Bulk Import):**
  * Hỗ trợ tải file Excel (.xlsx, .csv) hoặc dán trực tiếp dữ liệu từ Clipboard.
  * Thuật toán tự động nhận diện tên cột tiếng Việt (ví dụ: "Họ và tên", "Họ tên", "Tên NV" đều tự động ánh xạ vào trường `fullName`).
  * Xử lý trùng lặp mã nhân viên: Tùy chọn `Cập nhật ghi đè` hoặc `Bỏ qua giữ nguyên`.
  * Tải file mẫu chuẩn Excel kèm hướng dẫn định dạng ngày tháng và số tiền.
* **FR-HR-06:** Xuất danh sách nhân sự ra file Excel (.xlsx) chuẩn hóa định dạng.

### 3.3. Phân hệ Quản lý Chấm công (Timekeeping & Attendance)
* **FR-ATT-01:** Lưới chấm công trực quan theo tháng: Hiển thị danh sách nhân viên cố định bên trái và các cột từ ngày 1 đến hết tháng (28/29/30/31).
* **FR-ATT-02:** Tự động nhận diện và tô màu các ngày nghỉ hàng tuần (Chủ nhật hoặc Thứ 7 & CN tùy cấu hình công ty).
* **FR-ATT-03:** **Bộ cọ chấm công (Brush Tool):**
  * Click chọn ký hiệu công rồi bấm hoặc rê chuột để chấm hàng loạt ô ngày.
  * Hỗ trợ các mã công tiêu chuẩn:
    * `X` (Đi làm cả ngày): 1 công làm việc, 1 công hưởng lương.
    * `N` (Làm nửa ngày): 0.5 công làm việc, 0.5 công hưởng lương, 0.5 ngày nghỉ.
    * `CT` (Đi công tác): 1 công làm việc, 1 công hưởng lương.
    * `P` (Nghỉ phép năm): 0 công làm việc, 1 công hưởng lương.
    * `L` (Nghỉ lễ/Tết): 0 công làm việc, 1 công hưởng lương.
    * `O` (Nghỉ ốm hưởng BHXH): 0 công làm việc, 0 công hưởng lương công ty.
    * `KP` (Nghỉ không lương): 0 công làm việc, 0 công hưởng lương công ty.
    * `Tẩy`: Xóa trạng thái ô đã chấm.
* **FR-ATT-04:** Chức năng tự động điền nhanh ký hiệu `X` vào tất cả các ngày làm việc chưa chấm (bỏ qua ngày nghỉ tuần và ngày trong tương lai).
* **FR-ATT-05:** Cột nhập số giờ làm thêm (OT) tích lũy trong tháng cho từng nhân sự.
* **FR-ATT-06:** Tự động tính toán tổng số công làm việc (`lv`), tổng phép + lễ (`P + L`), tổng số ngày nghỉ không hưởng lương (`kl`) và tổng công hưởng lương (`hl = lv + P + L + CT`).
* **FR-ATT-07:** Xuất bảng chấm công chi tiết ra Excel (.xlsx có đóng băng tiêu đề) và In bảng chấm công khổ A4 ngang kèm khối chữ ký.

### 3.4. Động cơ Tính Lương & Phiếu Lương (Payroll Engine & Payslips)
* **FR-PAY-01:** **Bảng lương tổng hợp tự động (Live Payroll Sheet):**
  * Tự động đồng bộ số ngày công và giờ OT từ Bảng chấm công sang Bảng lương.
  * Cung cấp các ô màu vàng cho phép kế toán nhập số liệu biến động hàng tháng:
    * Sản lượng thực tế hoàn thành (`slSP`).
    * Đơn giá sản phẩm thay đổi tháng này (`dgSP` - ghi đè đơn giá hồ sơ).
    * Tiền thưởng tháng (`thuong`).
    * Tiền tạm ứng trong kỳ (`tamUng`).
    * Các khoản khấu trừ khác (`khauTru`).
* **FR-PAY-02:** **Quy tắc tính toán thu nhập:**
  $$\text{Lương ngày} = \frac{\text{Lương cơ bản}}{\text{Công chuẩn}}$$
  $$\text{Lương giờ} = \frac{\text{Lương ngày}}{\text{Giờ chuẩn}}$$
  $$\text{Lương theo công} = \text{Lương ngày} \times \text{Công hưởng lương}$$
  $$\text{Lương sản lượng} = \text{Sản lượng SP} \times \text{Đơn giá}$$
  $$\text{Tiền làm thêm giờ (OT)} = \text{Lương giờ} \times \text{Giờ OT} \times \text{Hệ số OT}$$
  $$\text{Phụ cấp thâm niên} = \text{Số năm làm việc tính đến tháng} \times \text{Đơn giá thâm niên/năm}$$
  $$\text{Phụ cấp chuyên cần} = \begin{cases} \text{Mức PC chuyên cần} & \text{nếu } \text{Số ngày nghỉ } \le \text{Mức tối đa cho phép} \\ 0 & \text{ngược lại} \end{cases}$$
  $$\text{Tổng thu nhập (Gross)} = \text{Lương công} + \sum \text{Phụ cấp} + \text{Lương SL} + \text{Tiền OT} + \text{Thưởng}$$
* **FR-PAY-03:** **Quy tắc trích nộp bảo hiểm bắt buộc:**
  * Áp dụng trần đóng BHXH/BHYT $= 20 \times \text{Mức lương cơ sở}$.
  * Áp dụng trần đóng BHTN $= 20 \times \text{Lương tối thiểu vùng}$.
  * **Quy tắc miễn trừ 14 ngày:** Nếu nhân viên có số ngày nghỉ không hưởng lương trong tháng $\ge 14$ ngày hoặc không có lương đóng BH, toàn bộ bảo hiểm phần NLĐ và DN tự động tính bằng 0.
  * Phần NLĐ đóng: BHXH (8%), BHYT (1.5%), BHTN (1%).
  * Phần DN đóng (ghi nhận chi phí công ty): BHXH (17.5%), BHYT (3%), BHTN (1%), Kinh phí công đoàn (2%).
* **FR-PAY-04:** **Quy tắc tính thuế thu nhập cá nhân (TNCN):**
  * Thu nhập chịu thuế:
    $$\text{TN chịu thuế} = \max(0, \text{Gross} - \text{PC không thuế} - \text{Phần OT miễn thuế})$$
  * Giảm trừ gia cảnh:
    $$\text{Giảm trừ} = \text{Giảm trừ bản thân} + (\text{Số NPT} \times \text{Mức giảm trừ NPT})$$
  * Thu nhập tính thuế:
    $$\text{TN tính thuế} = \max(0, \text{TN chịu thuế} - \text{Bảo hiểm NLĐ} - \text{Giảm trừ})$$
  * Tính thuế lũy tiến từng phần theo Biểu thuế được cấu hình.
* **FR-PAY-05:** **Thực lĩnh của người lao động:**
  $$\text{Thực lĩnh} = \text{Gross} - \text{Bảo hiểm NLĐ} - \text{Thuế TNCN} - \text{Tạm ứng} - \text{Khấu trừ khác}$$
* **FR-PAY-06:** **Phiếu lương cá nhân & In ấn:**
  * Xem trước và in phiếu lương chi tiết cho từng người hoặc in hàng loạt (`slipAll`).
  * Tự động chuyển đổi số tiền thực lĩnh thành chữ tiếng Việt chính xác (`docSo`).
  * Hiển thị hộp giải trình từng bước tính thuế và hộp chi phí DN gánh vác nộp thay.
* **FR-PAY-07:** **Khóa kỳ lương (Lock Payroll):** Cho phép Quản trị viên khóa kỳ lương đã chi trả để ngăn chặn mọi thay đổi vô tình. Mở khóa kỳ lương yêu cầu quyền hạn cấp cao và ghi nhận nhật ký kiểm toán.

### 3.5. Báo cáo & Thống kê
* **FR-REP-01:** Thống kê quỹ lương theo phòng ban và cơ cấu chi phí doanh nghiệp.
* **FR-REP-02:** Biểu đồ xu hướng quỹ lương và biến động chi phí 12 tháng.
* **FR-REP-03:** Tổng hợp báo cáo trích nộp bảo hiểm và thuế TNCN theo năm phục vụ quyết toán.
* **FR-REP-04:** Công cụ tính toán chuyển đổi nhanh Gross ⇄ Net hai chiều.

---

## 4. CHI TIẾT YÊU CẦU PHI CHỨC NĂNG (NON-FUNCTIONAL REQUIREMENTS)

### 4.1. An toàn & Bảo mật Dữ liệu (Security & Privacy)
* **NFR-SEC-01 (Bảo vệ dữ liệu cá nhân - Nghị định 13/2023/NĐ-CP):** Số CCCD, số tài khoản ngân hàng và mức lương của nhân viên phải được bảo vệ nghiêm ngặt. Hệ thống che mờ (mask) các trường nhạy cảm trên giao diện đối với người không có thẩm quyền.
* **NFR-SEC-02 (Kiểm soát truy cập trên Server):** Tuyệt đối không dựa vào việc ẩn/hiện nút bấm trên giao diện để phân quyền. Mọi Wasp Action và Query đều phải kiểm tra quyền của `context.user` trên Backend trước khi thực thi.
* **NFR-SEC-03 (Bảo vệ dữ liệu lương):** Nhân viên thông thường chỉ được phép xem phiếu lương của chính mình thông qua bộ lọc cứng `where: { employee: { userId: context.user.id } }`.

### 4.2. Cô lập Dữ liệu Đa khách hàng (Multi-tenant Isolation)
* **NFR-TEN-01:** Tất cả các bảng dữ liệu nghiệp vụ (Employee, Attendance, PayrollPeriod, Slip, Setting) bắt buộc phải có khóa ngoại `tenantId` (hoặc `companyId`).
* **NFR-TEN-02:** Hệ thống tự động gắn điều kiện lọc `tenantId` ở lớp xử lý dữ liệu để triệt tiêu hoàn toàn rủi ro rò rỉ dữ liệu chéo giữa các doanh nghiệp khách hàng.

### 4.3. Độ chính xác & Tính toàn vẹn Dữ liệu (Data Accuracy & Integrity)
* **NFR-ACC-01 (Độ chính xác tính lương):** Tất cả các phép tính tiền lương phải tuân thủ thứ tự làm tròn tiền tệ VND (làm tròn số nguyên `Math.round`) để tránh sai số lũy kế.
* **NFR-ACC-02 (Tính bất biến của kỳ lương đã khóa):** Một khi kỳ lương đã được chuyển sang trạng thái `LOCKED`, mọi thay đổi trong danh mục nhân viên hoặc cấu hình cài đặt sau đó tuyệt đối không được làm thay đổi số liệu của kỳ lương cũ.
* **NFR-ACC-03 (Dấu vết kiểm toán - Audit Trail):** Ghi nhật ký đầy đủ (ai thực hiện, thời gian nào, dữ liệu trước và sau khi đổi) cho các thao tác: Sửa bảng lương, duyệt lương, mở khóa kỳ lương, xóa nhân sự.

### 4.4. Hiệu năng & Khả năng mở rộng (Performance & Scalability)
* **NFR-PERF-01:** Thời gian tính toán và hiển thị bảng lương cho doanh nghiệp 300 nhân sự không quá 2 giây.
* **NFR-PERF-02:** Thao tác chấm công bằng chuột phản hồi tức thì dưới 100ms trên giao diện người dùng.
* **NFR-PERF-03:** Khả năng phục vụ đồng thời hàng trăm doanh nghiệp trên cùng một cụm máy chủ mà không làm suy giảm hiệu năng.
