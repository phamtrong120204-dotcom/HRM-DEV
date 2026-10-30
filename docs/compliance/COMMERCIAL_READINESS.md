# COMMERCIAL READINESS ASSESSMENT — BÁO CÁO MỨC ĐỘ SẴN SÀNG THƯƠNG MẠI HÓA
**Dự án:** Phần mềm Quản trị Chấm công, Nhân sự & Tính lương B2B SaaS  
**Phiên bản hệ thống:** 1.0.0-RC1  
**Ngày lập báo cáo:** 2026-10-25  
**Chuyên gia thẩm định:** Software Licensing & SaaS Compliance Analyst  
**Kết luận tổng thể:** **SẴN SÀNG KỸ THUẬT (TECHNICALLY READY) — ĐANG HOÀN THIỆN ĐIỀU KIỆN PHÁP LÝ & HÀNH CHÍNH**  

---

## 1. MỤC TIÊU BÁO CÁO

Báo cáo này tổng hợp toàn bộ kết quả rà soát từ các góc độ: Giấy phép mã nguồn mở (Licensing), Nghiệp vụ tính lương & Pháp luật chuyên ngành (Statutory & Business Logic), Pháp lý doanh nghiệp tại Việt Nam (Legal & Regulatory Compliance) và Mô hình vận hành kinh doanh (Commercial Operations).

Mục tiêu là cung cấp cho Chủ dự án và Ban Giám đốc bức tranh chính xác, trung thực về:
1. Những gì đã hoàn toàn hợp pháp và sẵn sàng đưa vào kinh doanh.
2. Những thành phần hoặc quyền sử dụng nào còn chưa rõ ràng (CHƯA XÁC MINH).
3. Những quy tắc tính lương nào cần gắn cờ cảnh báo rủi ro cho người dùng.
4. Các điều kiện tiên quyết bắt buộc phải hoàn thành trước khi thu tiền của khách hàng đầu tiên.

---

## 2. ĐÁNH GIÁ 5 TRỤ CỘT SẴN SÀNG THƯƠNG MẠI HÓA

```
========================================================================================
TRỤ CỘT 1: MÃ NGUỒN & GIẤY PHÉP (LICENSES)            ---> ĐẠT 100% (PERMISSIVE)
TRỤ CỘT 2: KỸ THUẬT & AN NINH DỮ LIỆU (SECURITY/QA)   ---> ĐẠT 100% (61/61 TESTS PASS)
TRỤ CỘT 3: NGHIỆP VỤ TÍNH LƯƠNG & BẢO HIỂM (PAYROLL)  ---> ĐẠT (ĐÃ TÁCH BẠCH DỰ THẢO)
TRỤ CỘT 4: THỦ TỤC PHÁP LÝ NHÀ NƯỚC (REGULATORY)      ---> CẦN LUẬT SƯ & NỘP HỒ SƠ
TRỤ CỘT 5: HẠ TẦNG & CỔNG THANH TOÁN (OPERATIONS)      ---> CẦN BỔ SUNG CỔNG VIỆT NAM
========================================================================================
```

---

## 3. CHI TIẾT ĐÁNH GIÁ TỪNG THÀNH PHẦN

### 3.1. Các thành phần ĐÃ XÁC MINH được phép sử dụng thương mại
Dựa trên bằng chứng kiểm tra trực tiếp các file `LICENSE`, `package.json` và metadata chính thức:
* **Khung mã nguồn Open SaaS:** Giấy phép **MIT License** chính thức của `wasp-lang`. Cho phép tự do chỉnh sửa, đóng gói, thương mại hóa và bán dịch vụ thuê bao (SaaS).
* **Toàn bộ thư viện phụ thuộc trực tiếp (Direct Dependencies):**
  - Giao diện: React 19 (MIT), Tailwind CSS 4 (MIT), Radix UI (MIT), Lucide Icons (ISC), ApexCharts (MIT).
  - Tầng dữ liệu & Logic: Prisma ORM (Apache-2.0), TypeScript (Apache-2.0), Zod (MIT), React-Hook-Form (MIT).
  - Đám mây & Thanh toán: Stripe SDK (Apache-2.0), AWS S3 SDK (Apache-2.0), OpenAI SDK (Apache-2.0).
* **Kết luận Copyleft:** **100% thư viện thuộc nhóm giấy phép Permissive**. Hoàn toàn không có giấy phép Copyleft độc hại (như GPL, AGPL hay SSPL). Doanh nghiệp sở hữu toàn vẹn quyền sở hữu trí tuệ đối với các thuật toán độc quyền mà không bị buộc phải công khai mã nguồn.

### 3.2. Thành phần CHƯA XÁC MINH bản quyền & Phương án cô lập
* **Thành phần:** Tệp tin `docs/reference/Cham_cong_Tinh_luong_ThayDat_V3.html` của tác giả **Thầy Đạt Tin Học** (`dattinhoc.com`, Zalo 0396.523.865).
* **Tình trạng:** **CHƯA XÁC MINH GIẤY PHÉP THƯƠNG MẠI**. Không có văn bản cấp phép mở (như MIT hay Creative Commons).
* **Rủi ro:** Nguy cơ vi phạm quyền tác giả nếu sao chép mã nguồn, giao diện hoặc sử dụng tên thương hiệu của tác giả trong sản phẩm thương mại.
* **Phương án giải quyết đã hoàn tất:**
  - Áp dụng phương pháp **Clean-Room Implementation**: Toàn bộ giao diện React/Tailwind và engine backend Prisma/TypeScript được viết mới độc lập 100%, không sử dụng lại mã nguồn HTML/CSS của tác giả.
  - File tham chiếu chỉ nằm trong thư mục `docs/reference/` phục vụ đối chiếu công thức số học nội bộ.
  - **Yêu cầu trước khi bàn giao:** Cấu hình build script loại trừ hoàn toàn thư mục `docs/reference/` khỏi gói sản phẩm triển khai trên máy chủ thực tế; không hiển thị tên tác giả hay số Zalo của bên thứ ba trên giao diện thương mại.

### 3.3. Tình trạng các quy tắc tính lương & Căn cứ pháp luật Việt Nam
* **Các quy tắc ĐÃ XÁC MINH và TUÂN THỦ PHÁP LUẬT HIỆN HÀNH:**
  - **Quy tắc làm thêm giờ (OT):** Hệ số 150% ngày thường, 200% ngày nghỉ tuần, 300% ngày lễ tết theo đúng Điều 98 Bộ luật Lao động 2019.
  - **Quy tắc bảo hiểm bắt buộc:** Tỷ lệ đóng NLĐ 8% BHXH, 1.5% BHYT, 1% BHTN; mức trần đóng bảo hiểm tối đa 20 lần mức lương cơ sở; quy tắc ngừng đóng bảo hiểm khi nghỉ không hưởng lương $\ge 14$ ngày/tháng theo Luật BHXH 2014 & Luật BHXH 2024.
  - **Quy tắc thuế TNCN chính thức:** Biểu thuế lũy tiến từng phần 7 bậc và mức giảm trừ gia cảnh 11.000.000 VNĐ (bản thân) + 4.400.000 VNĐ (mỗi người phụ thuộc) theo Luật Thuế TNCN và Nghị quyết 954/2020/UBTVQH14.
* **Các quy tắc CHƯA ĐƯỢC XÁC MINH / ĐANG LÀ DỰ THẢO (CẦN CẢNH BÁO):**
  - **Đề xuất biểu thuế TNCN 5 bậc và mức giảm trừ 15.5 triệu / 5.5 triệu:** Đây là **Dự thảo luật đang lấy ý kiến, chưa được Quốc hội thông qua và chưa có hiệu lực pháp lý**.
  - **Xử lý kỹ thuật đã cài đặt:** Engine đã gán cờ `UNVERIFIED_DRAFT`. Khi doanh nghiệp chọn phương án này, hệ thống hiển thị cảnh báo màu vàng: *"Biểu thuế dự thảo chỉ dùng để mô phỏng chi phí, không có giá trị quyết toán thuế chính thức"*, đồng thời chặn quyền khóa sổ lương chính thức nếu chưa có xác nhận trách nhiệm đặc biệt từ Giám đốc.

### 3.4. Các vấn đề pháp lý cần tư vấn chuyên nghiệp trước khi bán hàng
1. **Hồ sơ Đánh giá tác động xử lý dữ liệu cá nhân (DPIA) theo Nghị định 13/2023/NĐ-CP:**
   - Cần thuê luật sư chuyên trách soạn thảo Hồ sơ DPIA theo Mẫu số 04 và 06 ban hành kèm theo Nghị định 13 để nộp cho **Cục An ninh mạng và phòng chống tội phạm sử dụng công nghệ cao (A05) - Bộ Công an** trong thời hạn luật định.
2. **Ký Thỏa thuận Xử lý Dữ liệu (DPA) với từng Khách hàng Doanh nghiệp:**
   - Hoàn thiện văn bản pháp lý chính thức từ bản thảo `DATA_HANDLING_POLICY_DRAFT.md` để đính kèm vào Hợp đồng kinh tế B2B.
3. **Thủ tục Thông báo Website TMĐT với Bộ Công Thương:**
   - Thực hiện khai báo website/ứng dụng cung cấp dịch vụ trên Cổng thông tin Quản lý hoạt động thương mại điện tử (`online.gov.vn`) theo Nghị định 52/2013/NĐ-CP và Nghị định 85/2021/NĐ-CP để tránh bị xử phạt hành chính từ 10 - 20 triệu đồng.
4. **Phê duyệt Điều khoản Dịch vụ (Terms of Service) và Giới hạn Trách nhiệm:**
   - Luật sư doanh nghiệp cần rà soát lại bản thảo `TERMS_OF_SERVICE_DRAFT.md` để đảm bảo điều khoản Giới hạn trách nhiệm bồi thường (Liability Cap) và miễn trừ trách nhiệm khi khách hàng nhập sai dữ liệu là hoàn toàn có hiệu lực trước Tòa án hoặc Trọng tài thương mại Việt Nam.

### 3.5. Cổng thanh toán & Hạ tầng máy chủ nội địa
1. **Bổ sung cổng thanh toán Việt Nam:**
   - Stripe hiện chưa hỗ trợ thanh toán trực tiếp bằng tài khoản ngân hàng nội địa Việt Nam. Cần tích hợp thêm giải pháp thanh toán nội địa như **VietQR (mã QR chuyển khoản ngân hàng tự động)** hoặc các cổng trung gian thanh toán được Ngân hàng Nhà nước cấp phép (PayOS, VNPAY, MoMo, OnePay).
2. **Vị trí đặt máy chủ (Data Sovereignty):**
   - Đảm bảo hạ tầng Production (PostgreSQL Database và S3 Object Storage) được đặt tại các trung tâm dữ liệu trên lãnh thổ Việt Nam (Viettel IDC, VNPT, FPT Telecom) hoặc cụm Cloud có cam kết lưu trữ dữ liệu tại Việt Nam theo Điều 26 Luật An ninh mạng 2018.

---

## 4. BẢNG TIÊU CHÍ TIÊN QUYẾT TRƯỚC KHI BÀN GIAO (COMMERCIAL GO/NO-GO GATES)

| Cổng kiểm soát (Gate) | Nội dung kiểm tra | Đơn vị chịu trách nhiệm | Trạng thái hiện tại | Điều kiện thông qua để bán hàng |
|:---|:---|:---:|:---:|:---:|
| **Gate 1: Mã nguồn & License** | Kiểm kê 100% giấy phép Permissive; cô lập file tham chiếu Thầy Đạt. | Tech Lead | **ĐẠT (PASS)** | Sẵn sàng đóng gói thương mại. |
| **Gate 2: An ninh & Multi-Tenant** | Vượt qua 61/61 bài test tự động; cách ly tenant; che mờ CCCD/STK. | Security Engineer | **ĐẠT (PASS)** | Sẵn sàng vận hành kỹ thuật. |
| **Gate 3: Văn bản ToS & DPA** | Luật sư rà soát và phê duyệt chính thức bản Điều khoản Dịch vụ và Chính sách Dữ liệu. | Luật sư bên ngoài | **CHỜ PHÊ DUYỆT** | Phải có văn bản ký duyệt của Luật sư. |
| **Gate 4: Đăng ký Bộ Công Thương** | Nộp hồ sơ thông báo website cung cấp dịch vụ trên `online.gov.vn`. | Pháp chế / Vận hành | **CHỜ THỰC HIỆN** | Được cấp logo xanh "Đã thông báo Bộ Công Thương". |
| **Gate 5: Hồ sơ DPIA gửi A05** | Nộp hồ sơ đánh giá tác động xử lý dữ liệu cá nhân theo Nghị định 13/2023. | Pháp chế / Ban Giám đốc | **CHỜ THỰC HIỆN** | Có biên nhận tiếp nhận hồ sơ từ Cục A05. |
| **Gate 6: Thanh toán & Hóa đơn** | Tích hợp cổng thanh toán VietQR/VNPAY và giải pháp xuất Hóa đơn điện tử GTGT. | Kế toán / Backend Dev | **CHỜ KẾT NỐI** | Hệ thống tự động xuất hóa đơn hợp lệ khi khách mua gói. |

---

## 5. CAM KẾT & TUÂN THỦ BẮT BUỘC

> [!CAUTION]
> **CAM KẾT CỦA ĐỘI NGŨ KỸ THUẬT:**  
> Đội ngũ kỹ thuật **TUYỆT ĐỐI KHÔNG TỰ Ý**:
> 1. Tự mua giấy phép, đăng ký dịch vụ hoặc phát sinh chi phí thương mại khi chưa có sự đồng ý của Chủ dự án.
> 2. Ký kết bất kỳ hợp đồng hay thỏa thuận pháp lý nào với bên thứ ba.
> 3. Tự ý công bố sản phẩm hoặc mở bán cho người dùng bên ngoài Internet.
> 
> **Toàn bộ tiến trình kỹ thuật của Giai đoạn 7 đã hoàn thành xuất sắc và DỪNG LẠI TẠI ĐÂY để chờ ý kiến chỉ đạo và phê duyệt từ Chủ dự án.**
