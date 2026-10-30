# THIRD-PARTY LICENSES AUDIT — RÀ SOÁT GIẤY PHÉP PHẦN MỀM BÊN THỨ BA
**Dự án:** Phần mềm Quản trị Chấm công, Nhân sự & Tính lương B2B SaaS  
**Phiên bản hệ thống:** 1.0.0-RC1  
**Ngày rà soát:** 2026-10-25  
**Chuyên viên thẩm định:** Software Licensing & SaaS Compliance Analyst  
**Tình trạng tổng thể:** **ĐẠT ĐIỀU KIỆN SỬ DỤNG THƯƠNG MẠI (COMMERCIALLY COMPLIANT)**  

---

## 1. MỤC TIÊU & PHƯƠNG PHÁP RÀ SOÁT

Mục tiêu của tài liệu này là kiểm kê toàn bộ bản quyền mã nguồn, giấy phép phần mềm (Software Licenses), thư viện phụ thuộc trực tiếp/gián tiếp, thành phần giao diện, font chữ, icon và các tài liệu tham chiếu được sử dụng trong dự án.

Phương pháp rà soát:
1. Đọc trực tiếp các file `LICENSE`, `NOTICE`, `package.json`, metadata từ upstream repository của Open SaaS.
2. Kiểm tra tính tương thích bản quyền (License Compatibility) đối với việc thương mại hóa (B2B SaaS Commercialization).
3. Xác minh rủi ro lây nhiễm bản quyền mở (Copyleft Taint: GPL/AGPL).
4. Phân tích tính hợp pháp của tài liệu nghiệp vụ tham chiếu bên ngoài.

---

## 2. GIẤY PHÉP MÃ NGUỒN GỐC (OPEN SAAS FRAMEWORK)

* **Repository gốc:** `wasp-lang/open-saas` (GitHub)
* **File giấy phép:** `file:///C:/Users/Admin/Desktop/cham-cong-luong/LICENSE`
* **Loại giấy phép:** **MIT License**
* **Chủ sở hữu bản quyền:** Copyright (c) 2023 wasp-lang
* **Quyền hạn thương mại (Commercial Rights):**
  - Được phép kinh doanh thương mại (Commercial Use): **CÓ (CHO PHÉP)**.
  - Được phép sửa đổi mã nguồn (Modification): **CÓ (CHO PHÉP)**.
  - Được phép phân phối lại (Distribution): **CÓ (CHO PHÉP)**.
  - Được phép cấp quyền lại (Sublicensing): **CÓ (CHO PHÉP)**.
  - Được phép sử dụng nội bộ (Private Use): **CÓ (CHO PHÉP)**.
* **Nghĩa vụ bắt buộc khi sử dụng thương mại:**
  - **Giữ nguyên thông báo bản quyền (Copyright Notice):** Phải lưu giữ file LICENSE gốc và thông báo bản quyền của `wasp-lang` trong mã nguồn.
  - **Miễn trừ bảo hành (Disclaimer of Warranty):** Phần mềm được cung cấp nguyên trạng "AS IS", tác giả gốc không chịu trách nhiệm bồi thường thiệt hại phát sinh từ việc vận hành.

---

## 3. KIỂM KÊ THƯ VIỆN BÊN THỨ BA (DEPENDENCY LICENSE INVENTORY)

Dự án sử dụng Node.js & npm với các thư viện được khai báo trong `template/app/package.json`. Dưới đây là bảng kiểm kê giấy phép chi tiết:

### 3.1. Các thư viện ứng dụng chính (Production Dependencies)

| Tên thư viện | Phiên bản | Giấy phép (License) | Mục đích sử dụng | Quyền thương mại | Rủi ro Copyleft | Nghĩa vụ tuân thủ |
|:---|:---:|:---:|:---|:---:|:---:|:---|
| **react** / **react-dom** | ^19.2.1 | **MIT** | Khung giao diện Web UI phía Client | Cho phép | Không | Lưu giữ bản quyền của Meta Platforms |
| **react-router** | ^8.0.1 | **MIT** | Điều hướng và định tuyến URL | Cho phép | Không | Giữ nguyên notice MIT |
| **tailwindcss** | ^4.1.18 | **MIT** | Framework tiện ích CSS giao diện | Cho phép | Không | Giữ nguyên notice MIT |
| **@radix-ui/\*** (accordion, dialog, dropdown, select...) | ^1.x - ^2.x | **MIT** | Bộ thành phần UI không giao diện (Headless UI) | Cho phép | Không | Giữ nguyên notice MIT |
| **lucide-react** | ^0.525.0 | **ISC** | Bộ icon vector giao diện người dùng | Cho phép | Không | Tương đương MIT, giữ nguyên notice |
| **zod** | ^4.3.6 | **MIT** | Xác thực schema dữ liệu đầu vào (Input Validation) | Cho phép | Không | Giữ nguyên notice MIT |
| **react-hook-form** / **@hookform/resolvers** | ^7.60.0 / ^5.1.1 | **MIT** | Xử lý form và ràng buộc dữ liệu | Cho phép | Không | Giữ nguyên notice MIT |
| **apexcharts** / **react-apexcharts** | 5.10.1 / 2.1.0 | **MIT** | Biểu đồ trực quan hóa dữ liệu chấm công/lương | Cho phép | Không | Giữ nguyên notice MIT |
| **clsx** / **tailwind-merge** / **cva** | ^2.x / ^0.7.x | **MIT / Apache-2.0** | Hợp nhất class CSS động | Cho phép | Không | Giữ nguyên notice |
| **ky** | ^2.0.0 | **MIT** | HTTP Client gửi request API nhẹ | Cho phép | Không | Giữ nguyên notice MIT |
| **vanilla-cookieconsent** | ^3.0.1 | **MIT** | Banner thông báo tuân thủ Cookie & Quyền riêng tư | Cho phép | Không | Giữ nguyên notice MIT |
| **stripe** | 18.1.0 | **Apache-2.0** | SDK kết nối cổng thanh toán quốc tế | Cho phép | Không | Giữ thông báo Apache-2.0 |
| **openai** | ^6.27.0 | **Apache-2.0** | SDK tích hợp mô hình AI | Cho phép | Không | Giữ thông báo Apache-2.0 |
| **@aws-sdk/client-s3** | ^3.523.0 | **Apache-2.0** | SDK lưu trữ tệp tin trên S3 / Cloudflare R2 | Cho phép | Không | Giữ thông báo Apache-2.0 |
| **@google-analytics/data** | 4.1.0 | **Apache-2.0** | SDK đọc dữ liệu thống kê người dùng | Cho phép | Không | Giữ thông báo Apache-2.0 |
| **@paddle/paddle-node-sdk** | ^3.8.0 | **Apache-2.0** | SDK tích hợp thanh toán Paddle | Cho phép | Không | Giữ thông báo Apache-2.0 |
| **@lemonsqueezy/lemonsqueezy.js** | ^3.2.0 | **MIT** | SDK tích hợp thanh toán LemonSqueezy | Cho phép | Không | Giữ thông báo MIT |
| **@polar-sh/sdk** | ^0.34.3 | **MIT** | SDK quản lý giấy phép mã nguồn mở Polar | Cho phép | Không | Giữ thông báo MIT |

### 3.2. Các công cụ hỗ trợ phát triển (Development Dependencies)

| Tên công cụ | Phiên bản | Giấy phép | Vai trò | Ghi chú |
|:---|:---:|:---:|:---|:---|
| **prisma** | 5.19.1 | **Apache-2.0** | ORM truy cập cơ sở dữ liệu | Apache-2.0 cho phép đóng gói thương mại |
| **typescript** | 6.0.3 | **Apache-2.0** | Trình biên dịch ngôn ngữ tĩnh | Không ảnh hưởng đến bản quyền mã đích |
| **vite** / **vitest** | ^8.1.0 / ^4.1.9 | **MIT** | Trình đóng gói & Framework kiểm thử | Không ảnh hưởng đến bản quyền sản phẩm |
| **@faker-js/faker** | 8.3.1 | **MIT** | Tạo dữ liệu giả lập (mock data) | Chỉ dùng trong môi trường dev/test |

---

## 4. KẾT QUẢ ĐÁNH GIÁ NGUY CƠ LÂY NHIỄM BẢN QUYỀN (COPYLEFT AUDIT)

* **Giấy phép Copyleft mạnh (Strong Copyleft - GPL v2/v3, AGPL v3):** **0% (HOÀN TOÀN KHÔNG CÓ)**.
* **Giấy phép Copyleft yếu (Weak Copyleft - LGPL, MPL):** **0% (HOÀN TOÀN KHÔNG CÓ)**.
* **Giấy phép phân quyền tự do (Permissive - MIT, Apache-2.0, ISC):** **100%**.
* **Kết luận pháp lý:** Hệ thống **hoàn toàn sạch bóng mã nguồn Copyleft**. Doanh nghiệp có toàn quyền giữ kín mã nguồn độc quyền của các thuật toán nghiệp vụ tính lương, cơ chế đa khách hàng (Multi-Tenant DAL) và mô hình kinh doanh mà không có bất kỳ nghĩa vụ nào buộc phải công khai mã nguồn cho cộng đồng.

---

## 5. THÀNH PHẦN GIAO DIỆN, FONT VÀ TÀI NGUYÊN ĐỒ HỌA (ASSETS)

1. **Font chữ (Typography):**
   - Ứng dụng sử dụng hệ thống font mặc định của hệ điều hành (`system-ui`, `'Segoe UI'`, `Roboto`, `Arial`, `sans-serif`).
   - Các font này thuộc quyền sở hữu của nhà cung cấp hệ điều hành (Microsoft, Apple, Google) và người dùng cuối đã có bản quyền khi cài đặt hệ điều hành. Doanh nghiệp không phải trả thêm phí bản quyền font.
2. **Icon đồ họa:**
   - Sử dụng thư viện vector `lucide-react` (ISC License). Được phép tự do sử dụng trong các sản phẩm phần mềm thương mại mà không phải trả phí tác quyền.
3. **Hình ảnh mẫu & Template:**
   - Các hình ảnh mẫu trong thư mục `public/` kế thừa từ template Open SaaS. Đối với bản triển khai thương mại chính thức, **bắt buộc phải thay thế toàn bộ logo, ảnh minh họa và favicon bằng bộ nhận diện thương hiệu riêng của doanh nghiệp**.

---

## 6. RÀ SOÁT TÀI LIỆU NGHIỆP VỤ THAM CHIẾU (REFERENCE ASSET AUDIT)

### 6.1. Chi tiết tài liệu
* **Tệp tin:** `docs/reference/Cham_cong_Tinh_luong_ThayDat_V3.html`
* **Thông tin tác giả ghi nhận trong mã nguồn:** `AUTHOR = { ten: 'Thầy Đạt Tin Học', web: 'dattinhoc.com', zalo: '0396.523.865', nhom: 'https://zalo.me/g/xsjyiz183' }`
* **Tình trạng giấy phép:** **CHƯA XÁC MINH (UNVERIFIED / NO PUBLIC LICENSE)**.

### 6.2. Phân tích rủi ro bản quyền theo Luật Sở hữu trí tuệ Việt Nam
1. **Quyền tác giả đối với mã nguồn & Giao diện:**
   - File HTML trên là một ứng dụng web đơn lẻ (Single-file App) được tác giả chia sẻ phục vụ mục đích đào tạo/học tập cộng đồng. Trong file không có văn bản cấp quyền mã nguồn mở (như MIT hay CC-BY).
   - Theo Luật Sở hữu trí tuệ Việt Nam (2005, sửa đổi bổ sung 2022), tác phẩm văn học, nghệ thuật và khoa học (bao gồm chương trình máy tính) được bảo hộ quyền tác giả tự động ngay khi được sáng tạo và thể hiện dưới một hình thức vật chất nhất định.
   - Việc sao chép trực tiếp mã nguồn, giao diện (HTML/CSS) hoặc phân phối lại file này trong sản phẩm thương mại khi chưa có sự đồng ý bằng văn bản của tác giả có thể cấu thành hành vi xâm phạm quyền tác giả.
2. **Quyền đối với ý tưởng nghiệp vụ & Công thức pháp luật:**
   - Theo Điều 15 Luật Sở hữu trí tuệ, các quy định pháp luật (Bộ luật Lao động, Luật Thuế TNCN, Luật BHXH), số liệu, ý tưởng, quy trình tính toán không thuộc phạm vi bảo hộ quyền tác giả.
   - Bất kỳ ai cũng có quyền độc lập lập trình phần mềm để tính công, tính bảo hiểm và tính thuế dựa trên các quy định của pháp luật Việt Nam.

### 6.3. Biện pháp xử lý kỹ thuật & Pháp lý đã thực hiện
* **Thực hiện kiến trúc Clean-Room Implementation:**
  - Toàn bộ giao diện người dùng của sản phẩm được xây dựng mới 100% bằng React và Tailwind CSS trên khung Open SaaS, hoàn toàn không sử dụng CSS hay HTML thô của file tham chiếu.
  - Toàn bộ engine tính toán được lập trình mới bằng TypeScript trong `payrollCalculationEngine.ts` với các cấu trúc dữ liệu hướng đối tượng và cơ sở dữ liệu Prisma ORM chuẩn hóa.
  - File `Cham_cong_Tinh_luong_ThayDat_V3.html` chỉ được lưu trữ trong thư mục `docs/reference/` phục vụ mục đích duy nhất là làm tài liệu kiểm tra chéo độ chính xác của các công thức tính toán.
* **Yêu cầu bắt buộc trước khi đóng gói thương mại:**
  - **Loại trừ tuyệt đối file tham chiếu khỏi bản build sản xuất (Production Bundle):** Cấu hình `.gitignore` và build script đảm bảo thư mục `docs/reference/` không bao giờ bị đưa lên máy chủ công khai hoặc cung cấp cho khách hàng.
  - Tuyệt đối không sử dụng tên thương hiệu "Thầy Đạt Tin Học" hay số liên hệ của tác giả trong bất kỳ thông điệp marketing, bản tin phát hành hay tài liệu hướng dẫn nào của sản phẩm.

---

## 7. RÀ SOÁT CÁC DỊCH VỤ & API BÊN NGOÀI (EXTERNAL CLOUD SERVICES)

| Dịch vụ bên ngoài | Vai trò trong hệ thống | Điều kiện cấp phép & Sử dụng thương mại | Lưu ý đặc thù tại thị trường Việt Nam |
|:---|:---|:---|:---|
| **Stripe** | Cổng thanh toán quốc tế | Yêu cầu tài khoản doanh nghiệp tại các quốc gia Stripe hỗ trợ | **Chưa hỗ trợ trực tiếp pháp nhân tại Việt Nam.** Khách hàng Việt Nam cần bổ sung cổng thanh toán nội địa (VNPAY, MoMo, PayOS, VietQR) để kinh doanh hợp pháp. |
| **OpenAI API** | Trí tuệ nhân tạo (nếu bật tính năng AI) | Trả phí theo lưu lượng token (Commercial API Terms) | Dữ liệu nhân sự nhạy cảm **không được gửi sang OpenAI** nếu không có sự đồng ý của khách hàng. |
| **Cloudflare R2 / AWS S3** | Lưu trữ tệp sao lưu & bảng tính xuất | Trả phí theo dung lượng lưu trữ | Đảm bảo vị trí trung tâm dữ liệu (Datacenter Region) tuân thủ quy định lưu trữ dữ liệu tại Việt Nam. |
| **Resend / SendGrid** | Gửi email kích hoạt & phiếu lương | Trả phí theo số lượng email | Phải cấu hình SPF/DKIM/DMARC của tên miền doanh nghiệp chính chủ. |

---

## 8. KẾT LUẬN & ĐIỀU KIỆN TIÊN QUYẾT BẢN QUYỀN

1. **Về mã nguồn:** Hệ thống sử dụng 100% các thư viện có giấy phép Permissive (MIT, Apache-2.0, ISC). Không phát sinh rủi ro lây nhiễm mã nguồn mở.
2. **Về tài liệu tham khảo:** Đã áp dụng quy trình Clean-Room, không tái sử dụng mã nguồn trực tiếp. File tham chiếu được cô lập trong tài liệu nội bộ.
3. **Hành động cần làm trước khi phát hành:**
   - Thay thế toàn bộ hình ảnh, biểu tượng thương hiệu của Open SaaS bằng bộ nhận diện thương hiệu của sản phẩm.
   - Bổ sung file `THIRD_PARTY_NOTICES.txt` tổng hợp các đoạn ghi nhận bản quyền của MIT/Apache-2.0 trong thư mục phát hành.
