# BÁO CÁO AUDIT CODEBASE OPEN SAAS VÀ PHÂN TÍCH NGHIỆP VỤ CHẤM CÔNG - TÍNH LƯƠNG

> **Dự án:** Ứng dụng Quản lý Chấm công, Nhân sự & Tính lương (SaaS B2B)  
> **Thư mục dự án:** `C:\Users\Admin\Desktop\cham-cong-luong`  
> **Tài liệu tham chiếu:** `docs/reference/Cham_cong_Tinh_luong_ThayDat_V3.html`  
> **Mã nguồn nền tảng:** Open SaaS (Wasp Framework v0.26.1)  
> **Người thực hiện:** Principal Software Architect, Full-stack Tech Lead, Business Analyst & QA Lead  
> **Giai đoạn:** GĐ0 — Khảo sát, Đánh giá Kiến trúc và Phân tích Nghiệp vụ  

---

## 1. TỔNG QUAN KIẾN TRÚC HIỆN TẠI CỦA OPEN SAAS

Codebase Open SaaS vừa được tải về tại thư mục `C:\Users\Admin\Desktop\cham-cong-luong`. Đây là một bộ khung (boilerplate) mã nguồn mở hiện đại, được xây dựng trên nền tảng **Wasp Framework** — một framework full-stack mã nguồn mở dành cho React, Node.js và Prisma.

### 1.1. Các công nghệ và phiên bản cốt lõi thực tế trong repo

*Thông tin được trích xuất trực tiếp từ `package.json`, `main.wasp.ts` và `schema.prisma` trong repo, không dựa trên giả định:*

| Thành phần | Công nghệ / Thư viện | Phiên bản chính xác | Vai trò trong hệ thống |
| :--- | :--- | :--- | :--- |
| **Full-stack Framework** | **Wasp** | `^0.26.1` (theo `main.wasp.ts`) | Quản lý định tuyến (routing), cấu hình full-stack bằng TypeScript (`@wasp.sh/spec`), sinh mã nguồn kết nối Frontend - Backend tự động. |
| **Giao diện (Frontend)** | **React** | `^19.2.1` | Thư viện xây dựng giao diện người dùng (UI). |
| **Trình đóng gói Frontend** | **Vite** | `^8.1.0` | Server phát triển siêu tốc và đóng gói build tĩnh phía client. |
| **Định kiểu (Styling)** | **TailwindCSS** | `^4.1.18` (Tailwind v4) | Framework CSS tiện ích mới nhất với `@tailwindcss/vite`. |
| **Thư viện UI chuẩn** | **Shadcn UI (Radix UI)** | Đầy đủ primitives | Button, Dialog, Dropdown, Form, Input, Select, Sheet, Switch, Toast, Toaster, Accordion, Checkbox... |
| **Biểu đồ (Charts)** | **ApexCharts & React-Apexcharts** | `apexcharts: 5.10.1`, `react-apexcharts: 2.1.0` | Vẽ biểu đồ thống kê, xu hướng lương và phân bổ chi phí. |
| **Bộ icon** | **Lucide React** | `^0.525.0` | Hệ thống biểu tượng giao diện người dùng. |
| **Cơ sở dữ liệu & ORM** | **Prisma ORM** | `5.19.1` | Truy vấn cơ sở dữ liệu có kiểm soát kiểu dữ liệu (type-safe). Hệ quản trị mặc định cấu hình là **PostgreSQL**. |
| **Nền tảng chạy Backend** | **Node.js** | Môi trường máy chủ: `v24.14.1` (npm `11.11.0`) | Xử lý logic API, Queries, Actions và tính toán nghiệp vụ. |
| **Tiến trình ngầm (Jobs/Queues)** | **PgBoss** | Tích hợp sẵn trong Wasp | Bộ quản lý hàng đợi và tác vụ định kỳ (Cron Jobs) chạy trực tiếp trên nền PostgreSQL. |
| **Xác thực (Authentication)** | **Wasp Auth** | Tích hợp sẵn trong Wasp | Hỗ trợ xác thực Email/Password, Email Verification, Password Reset và Social Auth (Google, GitHub, Discord). |
| **Lưu trữ tệp (Storage)** | **AWS S3 Client** | `@aws-sdk/client-s3: ^3.523.0`, presigner | Quản lý tải lên tệp tin thông qua Signed URLs an toàn. |
| **Cổng thanh toán SaaS** | **Stripe, LemonSqueezy, Paddle, Polar** | Có sẵn bộ tích hợp | Quản lý gói thuê bao người dùng, thanh toán thẻ quốc tế. |
| **Kiểm thử tự động** | **Playwright & Vitest** | `playwright: ^1.52.0`, `vitest: ^4.1.9` | Kiểm thử E2E (End-to-End) và kiểm thử đơn vị (Unit Test). |

---

## 2. CÂY THƯ MỤC THỰC TẾ VÀ VAI TRÒ CÁC THƯ MỤC QUAN TRỌNG

Cấu trúc thư mục tại `C:\Users\Admin\Desktop\cham-cong-luong`:

```text
C:\Users\Admin\Desktop\cham-cong-luong\
├── docs/                                 <-- Thư mục tài liệu dự án
│   ├── reference/                        <-- Tài liệu nghiệp vụ tham chiếu gốc
│   │   └── Cham_cong_Tinh_luong_ThayDat_V3.html  (File nghiệp vụ 161KB đã đưa vào)
│   └── audit/                            <-- Báo cáo kiểm định kỹ thuật (GĐ0)
│       └── INITIAL_AUDIT.md              (Tài liệu này)
│
├── template/                             <-- BỘ MÃ NGUỒN CỐT LÕI CỦA ỨNG DỤNG SAAS
│   ├── app/                              <-- Ứng dụng chính (Wasp Full-Stack Web App)
│   │   ├── src/                          <-- Toàn bộ mã nguồn nghiệp vụ
│   │   │   ├── admin/                    <-- Trang quản trị hệ thống (Analytics, Users, Messages)
│   │   │   ├── analytics/                <-- Thống kê truy cập, lượt xem, doanh thu (PgBoss cron job)
│   │   │   ├── auth/                     <-- Đăng nhập, đăng ký, quên mật khẩu, xác thực email
│   │   │   ├── client/                   <-- Cấu hình giao diện gốc (App.tsx, Navbar, Shadcn UI components)
│   │   │   │   └── components/ui/        <-- Bộ sưu tập linh kiện Shadcn UI (button, dialog, input...)
│   │   │   ├── demo-ai-app/              <-- Ứng dụng mẫu (CRUD Task, OpenAI) -> Sẽ thay bằng Chấm công & Lương
│   │   │   ├── file-upload/              <-- Xử lý ký URL tải lên / tải xuống tệp (S3 Client)
│   │   │   ├── landing-page/             <-- Trang chủ giới thiệu sản phẩm (Marketing Landing Page)
│   │   │   ├── payment/                  <-- Xử lý cổng thanh toán (Stripe, Lemon Squeezy, Webhook)
│   │   │   ├── server/                   <-- Tiện ích máy chủ (emailSender, validation, dbSeeds)
│   │   │   └── user/                     <-- Quản lý hồ sơ người dùng, phân trang tài khoản
│   │   │
│   │   ├── .env.server.example           <-- Mẫu biến môi trường bảo mật phía máy chủ
│   │   ├── .env.client.example           <-- Mẫu biến môi trường công khai phía trình duyệt
│   │   ├── components.json               <-- Cấu hình của Shadcn UI CLI
│   │   ├── main.wasp.ts                  <-- Tệp điều phối trung tâm của Wasp (Khai báo route, auth, db, jobs)
│   │   ├── package.json                  <-- Khai báo thư viện và script của ứng dụng chính
│   │   ├── schema.prisma                 <-- Định nghĩa bảng cơ sở dữ liệu và quan hệ
│   │   └── vite.config.ts                <-- Cấu hình bộ biên dịch Vite & Tailwind v4
│   │
│   ├── blog/                             <-- Website tài liệu / blog phụ trợ bằng Astro Starlight
│   └── e2e-tests/                        <-- Bộ kịch bản kiểm thử tự động toàn diện bằng Playwright
│
├── opensaas-sh/                          <-- Mã nguồn trang web giới thiệu opensaas.sh và các bản vá diff
├── tools/                                <-- Bộ script hỗ trợ đồng bộ và bảo trì template
└── package.json                          <-- Cấu hình tổng quan của monorepo (quản lý prettier, eslint)
```

### Điểm đặc biệt cần lưu ý về cấu trúc

Toàn bộ ứng dụng web Wasp chạy độc lập nằm trọn vẹn trong thư mục `template/app/`. Tệp cấu hình gốc của Wasp là `template/app/main.wasp.ts` và mô hình dữ liệu nằm tại `template/app/schema.prisma`. 

---

## 3. DANH MỤC CHỨC NĂNG CỦA FILE THAM CHIẾU (`Cham_cong_Tinh_luong_ThayDat_V3.html`)

Tài liệu tham chiếu là một ứng dụng Web đơn trang (Single-Page App) viết bằng HTML/JavaScript thuần, tự nhúng dữ liệu JSON vào thẻ `<script>` hoặc lưu trữ qua File System Access API / IndexedDB. 

Phân tích chi tiết toàn bộ các khối chức năng và nghiệp vụ:

### 3.1. Các màn hình và giao diện

1. **Màn hình Tổng quan (Dashboard):**
   * 4 thẻ chỉ số lớn (KPIs) kèm đường xu hướng nhỏ (sparkline) và % tăng giảm so với tháng trước: Thực lĩnh, Tổng thu nhập (Gross), Thuế TNCN, Tổng bảo hiểm bắt buộc.
   * Biểu đồ diện tích (Area chart): Diễn biến chi phí lương doanh nghiệp 12 tháng gần nhất.
   * Biểu đồ tròn (Donut chart): Cơ cấu chi phí lương của doanh nghiệp (Chi trả NLĐ, Thuế nộp hộ, BH phần NLĐ, BH + Công đoàn phần DN).
   * Biểu đồ cột chồng (Stacked bar chart): Quỹ lương và chi phí theo từng phòng ban.
   * Vòng đo lường tỷ lệ đi làm (Radial gauge): Tỷ lệ công làm thực tế / công chuẩn toàn công ty.
   * Danh sách vinh danh: Top 5 người có thu nhập cao nhất trong tháng.
   * Danh sách cảnh báo: Top nhân viên nghỉ nhiều nhất trong tháng (ốm, phép, không lương).
   * Danh sách nhắc nhở: Danh sách nhân viên có sinh nhật trong tháng hiện tại.
   * Xuất báo cáo quỹ lương phòng ban và xu hướng ra file Excel (.xlsx đa sheet).

2. **Màn hình Bảng Chấm công (Timekeeping Grid):**
   * Lựa chọn kỳ chấm công (Tháng/Năm) và lọc theo phòng ban.
   * Bảng chấm công dạng lưới lịch: Cột nhân viên cố định bên trái, các cột ngày trong tháng (1 đến 28/30/31), tự động tô màu phân biệt ngày Chủ nhật / Thứ 7.
   * Thanh cọ màu (Brush tool) để chấm công trực quan bằng chuột:
     * `X`: Đi làm cả ngày (Tính: 1 ngày làm việc, 1 ngày hưởng lương).
     * `N`: Làm nửa ngày (Tính: 0.5 làm việc, 0.5 hưởng lương, 0.5 không lương).
     * `CT`: Đi công tác (Tính: 1 ngày làm việc, 1 ngày hưởng lương).
     * `P`: Nghỉ phép năm (Tính: 0 làm việc, 1 hưởng lương, 0 không lương).
     * `L`: Nghỉ lễ, Tết (Tính: 0 làm việc, 1 hưởng lương, 0 không lương).
     * `O`: Nghỉ ốm hưởng BHXH (Tính: 0 làm việc, 0 hưởng lương, 1 không lương từ cty).
     * `KP`: Nghỉ không lương (Tính: 0 làm việc, 0 hưởng lương, 1 không lương).
     * `Tẩy`: Xóa dữ liệu ô ngày đã chấm.
   * Cột nhập giờ làm thêm (OT) trong tháng cho từng người.
   * Chức năng tự động điền nhanh ký hiệu `X` vào các ngày làm việc trống (bỏ qua ngày nghỉ tuần và ngày chưa tới).
   * Chức năng xóa trắng toàn bộ dữ liệu chấm công của tháng được chọn.
   * Xuất Bảng chấm công ra Excel (.xlsx giữ cố định tiêu đề cột và có chú thích mã hiệu).
   * In bảng chấm công chuẩn khổ A4 ngang kèm khối chữ ký 3 bên (Người chấm, Phụ trách, Giám đốc).

3. **Màn hình Danh sách Nhân viên (HR Master Data):**
   * Bảng danh sách nhân sự đầy đủ: Mã NV, Họ tên, Phòng ban, Chức vụ, Ngày vào làm, Lương cơ bản, Lương đóng BH, Phụ cấp, Người phụ thuộc, Trạng thái (Đang làm, Thử việc, Nghỉ việc).
   * Tìm kiếm tức thời theo mã, tên, phòng ban; lọc theo bộ phận.
   * Hộp thoại Modal thêm mới / chỉnh sửa hồ sơ nhân viên:
     * *Thông tin cá nhân:* Mã NV, Họ tên, Giới tính, Ngày sinh, SĐT, Email, CCCD, Mã số thuế cá nhân.
     * *Công việc:* Phòng ban, Chức vụ, Ngày vào làm việc, Trạng thái hợp đồng.
     * *Lương & Phụ cấp:* Lương cơ bản tháng, Lương làm căn cứ đóng BHXH, Phụ cấp chịu thuế khác, Phụ cấp không chịu thuế (cơm ca tối đa 730k, công tác phí), Phụ cấp chuyên cần tối đa, Phụ cấp thâm niên (đồng/năm), Phụ cấp xăng xe, Đơn giá lương sản phẩm.
     * *Tài khoản nhận lương:* Số người phụ thuộc (NPT), Tên ngân hàng, Số tài khoản ngân hàng.
   * Chức năng Nhập dữ liệu hàng loạt từ Excel (.xlsx) hoặc dán trực tiếp từ Clipboard: Có thuật toán nhận diện tên cột tự động (auto-mapping), xử lý trùng mã nhân viên (cho phép chọn Ghi đè cập nhật hoặc Bỏ qua).
   * Tải tệp Excel mẫu chuẩn để người dùng điền thông tin.
   * Xuất danh sách nhân viên ra Excel và In ấn.

4. **Màn hình Bảng Lương Tổng hợp (Monthly Payroll):**
   * Bảng tính toán lương tự động đa cột với cơ chế cố định (Freeze / Sticky) 3 cột đầu: STT, Mã NV, Họ tên.
   * Tiêu đề bảng phân nhóm rõ ràng: Nhóm Thu nhập, Nhóm Bảo hiểm phần NLĐ, Nhóm Thuế TNCN, Nhóm Khấu trừ, Cột Thực Lĩnh.
   * Các ô màu vàng cho phép kế toán **nhập trực tiếp số liệu phát sinh** trong tháng:
     * Sản lượng sản phẩm hoàn thành (`slSP`).
     * Đơn giá sản phẩm thay đổi nếu có (`dgSP` - nếu bỏ trống sẽ lấy đơn giá mặc định trong hồ sơ).
     * Tiền thưởng (`thuong`).
     * Tiền tạm ứng trong kỳ (`tamUng`).
     * Các khoản khấu trừ khác (`khauTru`).
   * Cảnh báo tự động đối với nhân viên nghỉ không lương từ 14 ngày trở lên trong tháng: Hiển thị huy hiệu cảnh báo và tự động miễn trừ trích nộp bảo hiểm tháng đó theo Luật BHXH.
   * Xuất file Excel bảng lương hoàn chỉnh gồm 2 Sheet: Sheet 1 là Bảng thanh toán lương chi tiết, Sheet 2 là Bảng trích nộp bảo hiểm bắt buộc theo tỷ lệ chi tiết.
   * In bảng lương tổng hợp A4 ngang có đọc số tiền thực lĩnh thành chữ (`docSo`) và 3 chữ ký.

5. **Mẫu Phiếu Lương Cá nhân (Individual Payslip):**
   * Xem và in phiếu lương chi tiết cho từng người hoặc in hàng loạt toàn bộ công ty (`slipAll`).
   * Bố cục chuyên nghiệp: Logo, thông tin doanh nghiệp, thông tin nhân viên, tóm tắt ngày công chấm trong tháng.
   * **Mục A - Thu nhập:** Lương theo ngày công, PC chuyên cần (tự động kiểm tra điều kiện nghỉ quá ngày quy định), PC thâm niên (tự động nhân số năm công tác), PC xăng xe, PC chịu thuế khác, PC không chịu thuế, Lương sản lượng, Tiền làm thêm giờ (OT), Tiền thưởng -> Tổng thu nhập (Gross).
   * **Mục B - Khấu trừ:** BHXH (8%), BHYT (1.5%), BHTN (1%), Thuế TNCN lũy tiến, Tạm ứng, Khấu trừ khác -> Tổng khấu trừ.
   * **Thực lĩnh (A - B):** Số tiền số và số tiền đọc thành chữ tiếng Việt chính xác.
   * **Hộp minh bạch:**
     * Bảng chi tiết từng bước khấu trừ Thuế TNCN (Thu nhập chịu thuế, Giảm trừ gia cảnh, Thu nhập tính thuế, Thuế phát sinh).
     * Bảng phần chi phí doanh nghiệp gánh vác nộp thay (BHXH 17.5%, BHYT 3%, BHTN 1%, KPCĐ 2%, Tổng chi phí DN thực trả).
   * Hình thức chi trả: Hiển thị số tài khoản ngân hàng hoặc tiền mặt.

6. **Màn hình Thuế TNCN & Bảo hiểm (PIT & Insurance):**
   * Báo cáo tổng hợp số thuế TNCN và bảo hiểm đã nộp theo 12 tháng trong năm.
   * Bảng tạm quyết toán thuế TNCN cả năm theo từng nhân viên (Tổng thu nhập, Thu nhập chịu thuế, BH đã trừ, Giảm trừ gia cảnh đã áp dụng, Thuế đã khấu trừ).
   * Công cụ máy tính quy đổi nhanh Lương Gross ⇄ Lương Net hai chiều: Cho phép nhập số tiền, chọn Gross hoặc Net, nhập lương đóng BH, số NPT; hệ thống dùng thuật toán tìm kiếm nhị phân (binary search) để tính ngược từ Net sang Gross chính xác từng đồng.

7. **Màn hình Cài đặt Tham số Doanh nghiệp (Settings):**
   * Thông tin công ty: Tên, địa chỉ, MST, điện thoại, email, website, tải logo lên.
   * Tham số công & làm thêm: Số ngày công chuẩn trong tháng (mặc định 26 ngày), số giờ/ngày công (8 giờ), hệ số lương OT (1.5 ngày thường, 2.0 nghỉ tuần, 3.0 ngày lễ), số ngày nghỉ tối đa giữ phụ cấp chuyên cần, ngày nghỉ hàng tuần (Chủ nhật hoặc Thứ 7 & CN).
   * Danh mục phòng ban.
   * Tham số Bảo hiểm bắt buộc:
     * Cập nhật theo mốc lương cơ sở: 2.530.000 đ (từ 01/07/2026) và 2.340.000 đ (trước 07/2026) để áp trần BHXH, BHYT (tối đa 20 lần mức cơ sở).
     * Mức lương tối thiểu vùng I: 5.310.000 đ (từ 2026) và 4.960.000 đ (cũ) để áp trần BHTN (tối đa 20 lần mức lương tối thiểu vùng).
     * Tỷ lệ đóng BH: Người lao động (BHXH 8%, BHYT 1.5%, BHTN 1%), Doanh nghiệp (BHXH 17.5%, BHYT 3%, BHTN 1%, Kinh phí công đoàn 2%).
   * Tham số Thuế Thu nhập Cá nhân:
     * Giảm trừ bản thân (mặc định 15.500.000 đ/tháng theo biểu tính 2026).
     * Giảm trừ người phụ thuộc (mặc định 6.200.000 đ/người/tháng).
     * Biểu thuế lũy tiến từng phần 5 bậc:
       * Bậc 1: Đến 10 triệu -> 5%
       * Bậc 2: Trên 10 triệu đến 30 triệu -> 10%
       * Bậc 3: Trên 30 triệu đến 60 triệu -> 20%
       * Bậc 4: Trên 60 triệu đến 100 triệu -> 30%
       * Bậc 5: Trên 100 triệu -> 35%
     * Quy tắc miễn thuế tiền OT: Kể từ 01/01/2026, toàn bộ tiền làm thêm giờ của cá nhân cư trú được miễn thuế TNCN (trước 2026 chỉ miễn phần vượt trên đơn giá ban ngày).

8. **Màn hình Dữ liệu & Sao lưu (Backup & Restore):**
   * Lưu đè vào file hiện hành, xuất file bản sao.
   * Tải bản sao lưu dự phòng dạng `.json`.
   * Khôi phục toàn bộ hệ thống từ file sao lưu `.json`.
   * Xóa trắng dữ liệu thử nghiệm, khôi phục lại dữ liệu mẫu có hạt giống ngẫu nhiên (seeded generator).

---

## 4. BẢNG ĐỐI CHIẾU CHỨC NĂNG

Ma trận đối chiếu giữa tính năng yêu cầu từ tài liệu tham chiếu và khả năng cung cấp của bộ khung Open SaaS hiện có:

| Khối chức năng | Tính năng chi tiết | Phân loại | Giải pháp & Đánh giá kỹ thuật |
| :--- | :--- | :---: | :--- |
| **Xác thực & Người dùng** | Đăng ký, Đăng nhập, Quên mật khẩu, Xác thực Email | **Đã có trong Open SaaS** | Sử dụng nguyên bản Wasp Auth (`src/auth`). Đã có sẵn giao diện đăng nhập, xử lý token, bảo mật cookie/session. |
| | Đăng nhập tài khoản Google / GitHub / Discord | **Đã có trong Open SaaS** | Có sẵn trong `auth.wasp.ts`, chỉ cần cấu hình Client ID & Secret trên trang quản lý. |
| | Quản lý người dùng, đổi mật khẩu, thông tin cá nhân | **Có thể tái sử dụng** | Module `src/user` đã có sẵn trang AccountPage, chỉ cần bổ sung liên kết đến hồ sơ nhân viên nội bộ. |
| **Phân quyền & Khách hàng** | Đa khách hàng (Multi-tenant B2B - mỗi cty là 1 tenant) | **Cần xây mới** | Open SaaS hiện là Single-tenant B2C. Cần tạo bảng `Company` / `Tenant` và liên kết mọi dữ liệu nhân sự, bảng lương theo `companyId`. |
| | Phân quyền chi tiết (Admin cty, Kế toán, Nhân viên xem lương) | **Cần xây mới** | Hiện Open SaaS chỉ có cờ nhị phân `isAdmin: Boolean`. Cần xây mới bảng `Role` hoặc `CompanyUserRole`. |
| **Hồ sơ Nhân sự** | Quản lý nhân viên (CRUD, danh sách, chi tiết, trạng thái) | **Cần xây mới** | Tạo Model `Employee` trong `schema.prisma`, viết Wasp Queries & Actions tương ứng. |
| | Nhập dữ liệu từ Excel (.xlsx) & Clipboard | **Có thể tái sử dụng** | Logic phân tích cú pháp (parser) trong file HTML tham chiếu rất hoàn chỉnh, có thể chuyển đổi thành React hook/utility chuẩn. |
| | Xuất danh sách nhân viên ra Excel & In ấn | **Có thể tái sử dụng** | Tái sử dụng logic xuất file Excel thuần JavaScript hoặc tích hợp thư viện `xlsx/exceljs` phía máy chủ. |
| **Chấm công** | Lưới chấm công tháng (Grid Calendar) | **Cần xây mới** | Chuyển đổi mã HTML render bảng chấm công sang React Component với Shadcn Table / Radix UI. |
| | Công cụ chấm công bằng cọ vẽ (Brush Tool) & điền nhanh | **Có thể tái sử dụng** | Tái sử dụng toàn bộ máy trạng thái (state machine) chấm công trực quan của file tham chiếu, kết nối API Wasp. |
| | Lưu trữ lịch sử chấm công | **Cần xây mới** | Tạo Model `AttendanceRecord` trong Prisma để lưu dữ liệu chấm công theo ngày/tháng của từng nhân viên. |
| **Tính lương & Phiếu lương** | Động cơ tính toán lương (Payroll Calculation Engine) | **Có thể tái sử dụng** | Hàm `calcPay()` trong file tham chiếu rất chuẩn xác. Cần chuẩn hóa thành TypeScript service phía Backend Wasp. |
| | Bảng lương trực quan có ô màu vàng nhập liệu phát sinh | **Cần xây mới** | Xây dựng React component bảng lương có khả năng chỉnh sửa trực tiếp (Inline-editable inputs) và lưu tức thì. |
| | Mẫu in phiếu lương cá nhân & in hàng loạt | **Có thể tái sử dụng** | Tái sử dụng toàn bộ cấu trúc HTML/CSS in ấn chuyên nghiệp của file tham chiếu (`slipHTML`), tích hợp print style. |
| **Thuế & Bảo hiểm** | Báo cáo thuế TNCN 12 tháng & Quyết toán năm | **Cần xây mới** | Xây dựng API tổng hợp (Aggregate Query) trong Wasp Backend từ các bảng lương tháng. |
| | Công cụ tính nhanh Lương Gross ⇄ Net hai chiều | **Có thể tái sử dụng** | Thuật toán Binary Search tính lương hai chiều trong file tham chiếu cực kỳ tối ưu, mang nguyên vẹn lên React. |
| | Kiểm chứng tính pháp lý mức giảm trừ gia cảnh & biểu thuế | **Cần xác minh** | Tài liệu tham chiếu dùng biểu thuế 5 bậc và giảm trừ 15.5M/6.2M (dự kiến áp dụng từ kỳ thuế 2026). Cần làm cơ chế cấu hình linh động cho cả các năm trước đó. |
| **Cài đặt & Dữ liệu** | Cài đặt thông số công ty, công chuẩn, tỷ lệ BH, biểu thuế | **Cần xây mới** | Tạo Model `CompanySetting` trong Prisma để lưu cấu hình theo từng công ty, thay vì lưu local file. |
| | Tải lên logo công ty, tệp đính kèm | **Đã có trong Open SaaS** | Tái sử dụng module `src/file-upload` sử dụng S3-compatible API của Supabase Storage. |
| | Sao lưu & Khôi phục dữ liệu | **Có thể tái sử dụng** | Chuyển đổi logic JSON backup/restore thành tính năng Export/Import dữ liệu doanh nghiệp trong phần cài đặt quản trị. |

---

## 5. ĐỀ XUẤT KIẾN TRÚC MỤC TIÊU VÀ PHƯƠNG ÁN SUPABASE

### 5.1. Mô hình kiến trúc mục tiêu (Target SaaS Architecture)

Nhằm đáp ứng mục tiêu của bạn: **"Xây dựng ứng dụng web quản lý chấm công, nhân sự và tính lương, đồng thời tổ chức code để có thể tái sử dụng bộ khung khi triển khai phần mềm cho khách hàng khác"**, kiến trúc cần được thiết kế theo mô hình **Multi-tenant B2B SaaS**:

```
+-----------------------------------------------------------------------------------+
|                            FRONTEND (React 19 + Shadcn UI)                        |
|   Landing Page  |  Auth (Login/Signup)  |  HR Dashboard  |  Employee Self-Service |
+-----------------------------------------------------------------------------------+
                                         │  (Wasp Operations: Queries & Actions)
                                         ▼
+-----------------------------------------------------------------------------------+
|                          BACKEND ENGINE (Node.js + Wasp)                          |
|   - Multi-tenant Middleware: Tự động gắn và kiểm tra companyId                    |
|   - RBAC Security Guard: Kiểm tra quyền (Admin, Accountant, Timekeeper, Employee) |
|   - Payroll Calculation Service: Động cơ tính công, bảo hiểm, thuế TNCN           |
|   - Excel & Document Service: Xử lý nhập/xuất bảng biểu và phiếu lương            |
+-----------------------------------------------------------------------------------+
                     │                                         │
 (Prisma ORM over Postgres)                     (AWS S3 SDK via S3-Compatible API)
                     ▼                                         ▼
+-----------------------------------------+   +-------------------------------------+
|        SUPABASE POSTGRESQL              |   |          SUPABASE STORAGE           |
|   - Schema: Companies, Roles            |   |   - Bucket: 'company-assets' (Logo) |
|   - Schema: Employees, Attendances      |   |   - Bucket: 'payroll-exports'       |
|   - Schema: PayrollPeriods, PaySlips    |   |                                     |
|   - Schema: CompanySettings             |   |                                     |
+-----------------------------------------+   +-------------------------------------+
```

### 5.2. Đánh giá tính khả thi khi sử dụng Supabase

#### 1. Supabase PostgreSQL làm Cơ sở dữ liệu chính: **RẤT TỐT (HOÀN TOÀN KHẢ THI)**
- Prisma ORM của Wasp tương thích 100% với PostgreSQL của Supabase.
- Chỉ cần cung cấp chuỗi kết nối vào file cấu hình môi trường `.env.server`:
  ```bash
  DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"
  ```
- *Lưu ý quan trọng:* Khi dùng chế độ Connection Pooling (Supavisor port 6543) cho production, Prisma cần chuỗi kết nối có tham số `?pgbouncer=true`, đồng thời cần thêm biến `DIRECT_URL` trỏ vào cổng 5432 để Wasp thực hiện lệnh di chuyển lược đồ (`wasp db migrate-dev`).

#### 2. Supabase Storage làm Lưu trữ tệp: **RẤT TỐT (TÁI SỬ DỤNG 100% MÃ NGUỒN CÓ SẴN)**
- Open SaaS đã xây dựng sẵn module `src/file-upload` bằng thư viện chính thức `@aws-sdk/client-s3`.
- Supabase Storage **cung cấp sẵn giao thức tương thích S3 (S3-Compatible Gateway)**.
- Do đó, chúng ta **KHÔNG CẦN thay đổi cấu trúc mã nguồn của file-upload**, chỉ cần điền cấu hình vào `.env.server`:
  ```bash
  AWS_S3_REGION="ap-southeast-1"  # Hoặc region của project Supabase
  AWS_S3_FILES_BUCKET="cham-cong-assets"
  AWS_S3_IAM_ACCESS_KEY="[SUPABASE_S3_ACCESS_KEY_ID]"
  AWS_S3_IAM_SECRET_KEY="[SUPABASE_S3_SECRET_ACCESS_KEY]"
  ```
  *(Các khóa S3 này được lấy trực tiếp tại Supabase Dashboard -> Project Settings -> Storage -> S3 Access Keys).*

#### 3. Cảnh báo xung đột quan trọng: **Wasp Auth vs Supabase Auth**
- **Vấn đề cốt lõi:** Wasp sở hữu hệ thống xác thực độc lập được gắn chặt vào lõi framework (`context.user`, session cookie, tự động quản lý phiên làm việc). Trong khi đó, Supabase Auth quản lý người dùng trong schema riêng `auth.users` và cấp token JWT của Supabase.
- **Rủi ro xung đột:** Nếu cố gắng đưa thư viện `@supabase/supabase-js` để xử lý đăng nhập phía client, Wasp Server sẽ hoàn toàn không nhận diện được người dùng trong các hàm Query/Action (`context.user` sẽ luôn là `null`), phá vỡ toàn bộ cơ chế bảo mật có sẵn của Open SaaS.
- **Khuyến nghị kiến trúc của Chuyên gia:**
  > **GIỮ NGUYÊN Wasp Auth làm giải pháp quản lý tài khoản & phân quyền.**  
  > Chỉ sử dụng Supabase với 2 vai trò: **Managed PostgreSQL** và **S3-Compatible Storage**.  
  > Điều này đảm bảo hệ thống vận hành ổn định 100%, không xảy ra xung đột thư viện, tận dụng được toàn bộ mã nguồn của Open SaaS mà vẫn khai thác tối đa hạ tầng mạnh mẽ của Supabase.

---

## 6. DANH SÁCH RỦI RO VÀ QUYẾT ĐỊNH CẦN BẠN PHÊ DUYỆT

### 6.1. Đánh giá các rủi ro lớn

1. **Rủi ro Bảo mật dữ liệu Nhân sự (PII & Pháp lý Việt Nam):**
   * *Thực trạng file tham chiếu:* Toàn bộ số CCCD, Mã số thuế, Số tài khoản ngân hàng, Mức lương đều lưu trữ công khai dạng chuỗi ký tự thường.
   * *Rủi ro khi lên SaaS:* Vi phạm **Nghị định 13/2023/NĐ-CP về Bảo vệ dữ liệu cá nhân**. Nếu cơ sở dữ liệu bị lộ, toàn bộ thông tin nhạy cảm của người lao động sẽ bị khai thác.
   * *Giải pháp:* Cần áp dụng mã hóa hoặc che bớt (masking) khi hiển thị trên giao diện đối với người không có thẩm quyền (ví dụ: chỉ hiện 4 số cuối tài khoản/CCCD).

2. **Rủi ro Phân quyền (RBAC) & Rò rỉ Bảng lương:**
   * *Thực trạng:* Open SaaS chỉ có phân quyền cơ bản: `isAdmin: true/false`.
   * *Rủi ro:* Kế toán có thể xem được cấu hình kỹ thuật của hệ thống, hoặc nhân viên chấm công có thể tò mò xem được lương của Giám đốc; nhân viên thông thường nếu không được chặn query có thể xem được phiếu lương của đồng nghiệp.
   * *Giải pháp:* Cần xây dựng phân quyền theo vai trò rõ ràng:
     * `COMPANY_ADMIN`: Toàn quyền quản lý doanh nghiệp.
     * `HR_MANAGER`: Chấm công, quản lý hồ sơ nhân viên, không sửa cấu hình thuế/hệ thống.
     * `ACCOUNTANT`: Nhập số liệu tính lương, duyệt bảng lương, in phiếu lương.
     * `EMPLOYEE`: Chỉ xem được thông tin cá nhân, chấm công và phiếu lương của chính mình.

3. **Rủi ro Cô lập dữ liệu Khách hàng (Data Leak between Tenants):**
   * *Rủi ro:* Trong mô hình SaaS nhiều công ty dùng chung, nếu một câu lệnh truy vấn (Query) vô tình quên điều kiện `where: { companyId }`, nhân viên công ty A có thể nhìn thấy dữ liệu của công ty B.
   * *Giải pháp:* Tạo cơ chế Middleware kiểm tra bắt buộc `companyId` ở tất cả các nghiệp vụ dữ liệu nội bộ.

4. **Rủi ro Sai lệch Công thức Lương & Quy định Thuế 2026:**
   * *Thực trạng file tham chiếu:* File tham chiếu đang áp dụng mức giảm trừ 15.5 triệu / 6.2 triệu và biểu lũy tiến 5 bậc (theo dự thảo/luật mới dự kiến từ 2026) cùng quy định miễn thuế toàn bộ OT. Nếu người dùng muốn tính lương cho các tháng trong năm 2024 - 2025 (khi vẫn áp dụng mức 11 triệu / 4.4 triệu và biểu 7 bậc cũ), kết quả sẽ bị lệch so với cơ quan thuế.
   * *Giải pháp:* Thiết lập bảng tham số thuế theo **Hiệu lực thời gian** (Effective Dating) để hệ thống tự áp dụng đúng biểu thuế theo tháng tính lương.

5. **Rủi ro Sai số Làm tròn số tiền (Floating-Point Precision):**
   * *Thực trạng:* JavaScript dùng kiểu số thực (floating point) đôi khi gây ra sai lệch số thập phân lẻ (ví dụ: `0.1 + 0.2 = 0.30000000000000004`).
   * *Giải pháp:* Tiền tệ VND là số nguyên, nhưng đơn giá ngày công (`luongCB / congChuan`) và đơn giá giờ công là số thập phân. Cần quy định chặt chẽ thứ tự làm tròn (`Math.round`) ở từng bước trung gian khớp với chuẩn kế toán Việt Nam.

---

### 6.2. Các quyết định cần bạn phê duyệt

Trước khi bắt tay vào triển khai mã nguồn ở Giai đoạn 1 (GĐ1), xin ý kiến chỉ đạo của bạn về 4 quyết định then chốt:

* **Quyết định 1 (Mô hình triển khai):**  
  Bạn muốn phần mềm này triển khai theo dạng:
  - *Phương án A (Khuyến nghị):* **Multi-tenant SaaS** — Một website duy nhất, nhiều công ty đăng ký dùng chung, mỗi công ty có dữ liệu độc lập hoàn toàn (phù hợp để kinh doanh phần mềm SaaS thu phí thuê bao tháng/năm).
  - *Phương án B:* **Single-tenant Custom** — Mỗi khi có khách hàng mới, ta bàn giao một bản cài đặt riêng biệt trỏ về cơ sở dữ liệu riêng của họ.

* **Quyết định 2 (Kiến trúc Đăng nhập & Xác thực):**  
  Phê duyệt sử dụng **Wasp Auth** (có sẵn trong Open SaaS) để quản lý phiên đăng nhập và bảo mật người dùng, kết hợp **Supabase PostgreSQL & Supabase Storage** để lưu dữ liệu và tệp tin.

* **Quyết định 3 (Tổ chức thư mục làm việc):**  
  Hiện tại bộ mã nguồn Open SaaS nằm trong `template/app/`. Để thuận tiện nhất khi gõ các lệnh `wasp start`, `wasp db migrate-dev`, bạn có đồng ý ở GĐ1 sẽ đưa thư mục `template/app/` thành trọng tâm dự án không?

* **Quyết định 4 (Chính sách Thuế TNCN & Bảo hiểm):**  
  Đồng ý xây dựng cấu hình Thuế TNCN linh hoạt: Cho phép lựa chọn áp dụng Biểu thuế hiện hành (11M / 4.4M - 7 bậc) hoặc Biểu thuế mới 2026 (15.5M / 6.2M - 5 bậc) tùy theo tháng tính lương.

---

## 7. LỘ TRÌNH CÁC GIAI ĐOẠN TIẾP THEO, TIÊU CHÍ NGHIỆM THU VÀ CÁC LỆNH CHẠY THỰC TẾ

### 7.1. Lộ trình thực hiện dự án (Project Roadmap)

```mermaid
flowchart LR
    GD0["GĐ0: Khảo sát & Audit (Xong)"] --> GD1["GĐ1: Khởi tạo Kiến trúc & DB"]
    GD1 --> GD2["GĐ2: Module Nhân sự (HR)"]
    GD2 --> GD3["GĐ3: Module Chấm công"]
    GD3 --> GD4["GĐ4: Module Tính lương & Phiếu"]
    GD4 --> GD5["GĐ5: Thuế, Bảo hiểm & Phân quyền"]
    GD5 --> GD6["GĐ6: Kiểm thử & Đóng gói SaaS"]
```

* **GĐ1 — Thiết lập môi trường & Kiến trúc Cơ sở dữ liệu:**
  * Cài đặt Wasp CLI trên máy phát triển.
  * Thiết lập dự án, tạo file `.env.server` kết nối Supabase Postgres & Supabase Storage.
  * Mở rộng `schema.prisma` với các bảng: `Company`, `Employee`, `Attendance`, `PayrollPeriod`, `SalarySlip`, `CompanySetting`.
  * Chạy migration cơ sở dữ liệu đầu tiên thành công.
* **GĐ2 — Module Quản lý Doanh nghiệp & Hồ sơ Nhân sự:**
  * Xây dựng giao diện danh sách nhân viên, form thêm/sửa nhân viên bằng Shadcn UI.
  * Tích hợp tính năng Nhập Excel (.xlsx) thông minh và chức năng Xuất Excel danh sách.
* **GĐ3 — Module Bảng Chấm công Trực quan:**
  * Xây dựng lưới chấm công theo tháng (Grid Calendar).
  * Chuyển hóa bộ công cụ Cọ chấm công (Brush Tool), tự động điền `X`, tính toán tổng ngày công và giờ làm thêm.
* **GĐ4 — Module Động cơ Tính Lương & Mẫu In Phiếu Lương:**
  * Chuyển hóa hàm tính lương `calcPay` vào Wasp Backend Action.
  * Bảng lương tổng hợp với các ô màu vàng cho phép nhập trực tiếp số lượng SP, thưởng, tạm ứng.
  * Giao diện in ấn A4 phiếu lương cá nhân và bảng lương công ty có đọc số tiền thành chữ.
* **GĐ5 — Module Thuế TNCN, Bảo hiểm, Báo cáo & Phân quyền (RBAC):**
  * Tích hợp công cụ tính Gross ⇄ Net hai chiều.
  * Báo cáo quỹ lương, biểu đồ chi phí doanh nghiệp bằng ApexCharts.
  * Phân quyền chặt chẽ theo vai trò (Admin, Kế toán, Nhân sự, Nhân viên).
* **GĐ6 — Kiểm thử tự động (E2E), Tối ưu & Chuẩn bị Bàn giao:**
  * Viết kịch bản Playwright kiểm thử quy trình: Thêm NV -> Chấm công -> Tính lương -> Xuất phiếu lương.
  * Đóng gói hướng dẫn triển khai Docker / Railway / Fly.io cho khách hàng.

---

### 7.2. Các lệnh thực tế để chạy và kiểm thử dự án

Dưới đây là các câu lệnh chuẩn xác được xác minh từ tài liệu Wasp và Open SaaS:

#### 1. Cài đặt Wasp CLI (chỉ cần chạy 1 lần trên máy):
```powershell
# Cài đặt Wasp CLI thông qua npm toàn cục
npm install -g @wasp.sh/wasp-cli
```
*(Kiểm tra phiên bản sau khi cài: `wasp version`)*

#### 2. Khởi chạy ứng dụng trong môi trường phát triển (Development):
```powershell
# Chuyển vào thư mục ứng dụng chính
cd C:\Users\Admin\Desktop\cham-cong-luong\template\app

# Bước 1: Khởi động cơ sở dữ liệu PostgreSQL cục bộ qua Docker (nếu chưa dùng Supabase)
wasp start db

# Bước 2: Thực thi di chuyển lược đồ database (Prisma migrations)
wasp db migrate-dev

# Bước 3: Nạp dữ liệu mẫu ban đầu (seeding)
wasp db seed

# Bước 4: Khởi động toàn bộ ứng dụng (cả Client React và Server Node.js)
wasp start
```
*Sau khi chạy `wasp start`, ứng dụng sẽ tự động mở tại địa chỉ: `http://localhost:3000` (Client) và `http://localhost:3001` (Server API).*

#### 3. Chạy kiểm thử tự động (Testing):
```powershell
# Kiểm tra định dạng code (Code Style)
npm run prettier:check

# Kiểm tra lỗi cú pháp và chuẩn mã nguồn (Linting)
npm run lint

# Chạy kiểm thử tự động E2E (Playwright)
cd C:\Users\Admin\Desktop\cham-cong-luong\template\e2e-tests
npm test
```

#### 4. Đóng gói triển khai sản phẩm (Production Build):
```powershell
# Đóng gói toàn bộ ứng dụng thành mã nguồn chuẩn production
cd C:\Users\Admin\Desktop\cham-cong-luong\template\app
wasp build
```
*(Kết quả build sẽ nằm tại thư mục `.wasp/build/`, bao gồm Dockerfile đã tạo sẵn để triển khai lên bất kỳ đám mây nào).*

---

## 8. KẾT LUẬN & TRẠNG THÁI HIỆN TẠI

- Thư mục dự án đã được khởi tạo chuẩn xác tại: `C:\Users\Admin\Desktop\cham-cong-luong`.
- File nghiệp vụ tham chiếu đã được đưa vào an toàn tại: `docs/reference/Cham_cong_Tinh_luong_ThayDat_V3.html`.
- Toàn bộ codebase Open SaaS và tài liệu nghiệp vụ đã được đọc, rà soát và đối chiếu kỹ lưỡng không thiếu sót.
- Báo cáo kiểm định GĐ0 đã được thiết lập tại: `docs/audit/INITIAL_AUDIT.md`.
- Tuyệt đối tuân thủ quy tắc an toàn: Không can thiệp, không sửa đổi hay xóa bỏ mã nguồn ứng dụng trong giai đoạn này.

---
