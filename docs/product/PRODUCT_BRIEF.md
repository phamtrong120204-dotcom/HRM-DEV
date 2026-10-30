# TỔNG QUAN SẢN PHẨM (PRODUCT BRIEF)
## NỀN TẢNG CHẤM CÔNG & TÍNH LƯƠNG ĐA DOANH NGHIỆP (B2B SAAS PAYROLL)

---

## 1. TẦM NHÌN SẢN PHẨM (PRODUCT VISION)

Xây dựng một giải pháp phần mềm dạng dịch vụ (**B2B Multi-tenant SaaS**) chuyên sâu cho thị trường Việt Nam, số hóa toàn diện quy trình **Quản lý Hồ sơ Nhân sự, Chấm công Đa ca kíp và Tính lương Tự động**. 

Sản phẩm kế thừa sự đơn giản, trực quan và tốc độ xử lý tức thì của bảng tính quen thuộc (như bản mẫu tham chiếu của Thầy Đạt Tin Học), đồng thời giải quyết triệt để các nhược điểm cố hữu của Excel: **rủi ro rò rỉ dữ liệu lương, phân quyền lỏng lẻo, thiếu dấu vết kiểm toán (audit trail), không có cơ chế cô lập dữ liệu đa doanh nghiệp và phụ thuộc vào thao tác thủ công**.

---

## 2. ĐỐI TƯỢNG KHÁCH HÀNG MỤC TIÊU (TARGET AUDIENCE)

1. **Doanh nghiệp vừa và nhỏ (SMEs):** Quy mô từ 15 đến 300 nhân sự thuộc các lĩnh vực thương mại, dịch vụ, công nghệ, tư vấn.
2. **Cơ sở sản xuất, chuỗi bán lẻ, F&B, kho vận:** Có cơ cấu lao động hỗn hợp gồm:
   - Nhân viên văn phòng (lương cố định theo ngày công chuẩn).
   - Lao động sản xuất / kho vận (lương sản lượng, làm thêm giờ OT ca kíp).
   - Nhân viên kinh doanh (lương cơ bản + hoa hồng thưởng doanh số).
3. **Các đơn vị cung cấp dịch vụ kế toán / nhân sự thuê ngoài (HR & Accounting Agencies):** Cần quản lý nhiều công ty khách hàng trên cùng một nền tảng tập trung với chi phí tối ưu.

---

## 3. CHÂN DUNG NGƯỜI DÙNG (USER PERSONAS)

| Vai trò người dùng | Trách nhiệm chính | Điểm đau (Pain Points) hiện tại | Giá trị sản phẩm mang lại |
| :--- | :--- | :--- | :--- |
| **Chủ doanh nghiệp / CEO** | Phê duyệt quỹ lương, giám sát biến động chi phí nhân sự. | Thiếu bức tranh tài chính tổng thể, sợ sai phạm pháp lý về BHXH và thuế TNCN. | Dashboard trực quan, xem báo cáo quỹ lương theo phòng ban, phê duyệt lương 1 chạm. |
| **Kế toán trưởng / Chuyên viên tiền lương** | Tính toán bảng lương, lập phiếu lương, kê khai thuế TNCN & trích nộp bảo hiểm. | Mất 3-5 ngày mỗi tháng kiểm tra công thức Excel; dễ sai sót khi luật thuế/BH thay đổi; sợ lộ lương. | Động cơ tính lương tự động trong 3 giây; khóa kỳ lương bảo vệ lịch sử; sinh phiếu lương hàng loạt. |
| **Chuyên viên Nhân sự / Chấm công** | Quản lý hồ sơ nhân viên, theo dõi chấm công hàng ngày, quản lý phép/nghỉ việc. | Nhân viên thắc mắc công; nhập liệu thủ công từ file Excel máy chấm công; nhầm lẫn ký hiệu công. | Lưới chấm công trực quan với công cụ cọ vẽ (Brush Tool); tự động tổng hợp công hưởng lương và OT. |
| **Người lao động (Nhân viên)** | Đi làm, theo dõi ngày công và nhận tiền lương hàng tháng. | Nhận phiếu lương giấy chậm hoặc qua email thủ công; không rõ cách tính thuế và các khoản khấu trừ. | Cổng thông tin tự phục vụ (Self-Service): Tra cứu ngày công cá nhân và xem phiếu lương minh bạch. |
| **Quản trị viên Hệ thống (SaaS Super Admin)** | Quản lý các gói thuê bao, giám sát hạ tầng, cập nhật quy tắc pháp lý quốc gia. | Khó quản lý nhiều phiên bản triển khai riêng lẻ cho từng khách hàng. | Quản trị Tenant tập trung, cấu hình tham số thuế/bảo hiểm toàn hệ thống theo mốc thời gian. |

---

## 4. CHIẾN LƯỢC ĐÓNG GÓI & THƯƠNG MẠI HÓA (PACKAGING & PRICING)

Sản phẩm được thiết kế theo kiến trúc module để linh hoạt bán theo gói thuê bao (Subscription Tier) hoặc bán trọn gói đóng gói theo nhu cầu:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        TIER 1: GÓI KHỞI NGHIỆP (STARTER)              │
│  - Tối đa 30 nhân sự                                                   │
│  - Chấm công hành chính 1 ca chuẩn (26 ngày/tháng)                    │
│  - Tính lương thời gian cơ bản, trích nộp BHXH & Thuế TNCN             │
│  - Xuất Excel, in phiếu lương A4 chuẩn                                │
└────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        TIER 2: GÓI CHUYÊN NGHIỆP (PRO)                │
│  - Không giới hạn nhân sự (tính phí theo số lượng người dùng)          │
│  - Chấm công đa ca kíp, phân ca tuần, tính làm thêm giờ (OT) linh hoạt │
│  - Tính lương sản phẩm, hoa hồng, thưởng, phụ cấp thâm niên, chuyên cần│
│  - Cổng thông tin nhân viên tự tra cứu phiếu lương (Employee Portal)   │
│  - Nhập liệu Excel thông minh, tùy biến mẫu xuất Excel                 │
└────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        TIER 3: GÓI DOANH NGHIỆP (ENTERPRISE)          │
│  - Đa chi nhánh / Đa pháp nhân (Multi-organization)                    │
│  - Tích hợp API máy chấm công vân tay / khuôn mặt FaceID               │
│  - Quy trình phê duyệt bảng lương đa cấp (Multi-level Approval)        │
│  - Lưu trữ tài liệu không giới hạn, hỗ trợ cam kết SLA 99.9%           │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 5. CÁC NGUYÊN TẮC THIẾT KẾ TRẢI NGHIỆM CỐT LÕI

1. **Thân thiện như Bảng tính (Spreadsheet Simplicity):** Giữ lại thao tác quen thuộc: phím Enter di chuyển ô, click chọn cọ chấm công, ô màu vàng nhập trực tiếp số phát sinh (thưởng, tạm ứng, sản lượng) mà không phải mở pop-up rườm rà.
2. **Minh bạch từng đồng lẻ (Auditability & Transparency):** Mọi con số trên phiếu lương đều có diễn giải công thức rõ ràng (ví dụ: `22.000.000 đ ÷ 26 công × 24.5 công = 20.730.769 đ`).
3. **Tuyệt đối an toàn dữ liệu lương (Zero-leakage Security):** Nhân viên tuyệt đối không thể truy vấn hoặc xem trộm lương của đồng nghiệp. Dữ liệu công ty A cách ly tuyệt đối khỏi công ty B.
4. **Không phụ thuộc vào kỹ thuật (Zero-code Customer Onboarding):** Khách hàng tự đăng ký tài khoản, khai báo phòng ban, nhập danh sách nhân viên bằng file Excel có sẵn và bắt đầu tính lương ngay trong 15 phút.
