# INSTALLATION GUIDE — HƯỚNG DẪN CÀI ĐẶT & KHỞI CHẠY HỆ THỐNG
**Dự án:** Phần mềm Quản trị Chấm công, Nhân sự & Tính lương B2B SaaS  
**Phiên bản hệ thống:** 1.0.0-RC1  
**Ngày lập tài liệu:** 2026-10-25  
**Môi trường hỗ trợ:** Windows, macOS, Linux (Ubuntu 22.04+)  

---

## 1. YÊU CẦU TIỀN ĐỀ HỆ THỐNG (PREREQUISITES)

Trước khi tiến hành cài đặt, máy chủ hoặc máy tính phát triển cần được trang bị các phần mềm nền tảng sau:

1. **Node.js:** Phiên bản `>= 20.x` (Khuyến nghị sử dụng Node.js LTS v20.x hoặc v22.x/v24.x).
2. **Trình quản lý gói:** `npm` (đi kèm Node.js) hoặc `pnpm`.
3. **Cơ sở dữ liệu:**
   - **Môi trường phát triển cục bộ (Local Development):** Docker Desktop (để Wasp tự quản lý Postgres container) HOẶC PostgreSQL v15+ cài trực tiếp trên máy.
   - **Môi trường Staging / Production:** PostgreSQL v15+ (tự host hoặc dịch vụ Managed DB trên Supabase, AWS RDS, DigitalOcean, Viettel Cloud).
4. **Wasp CLI:** Công cụ điều phối full-stack framework Open SaaS.
   - Cài đặt trên macOS/Linux: `curl -sSL https://get.wasp-lang.dev/installer.sh | sh`
   - Cài đặt trên Windows (PowerShell): `iwr -useb https://get.wasp-lang.dev/installer.ps1 | iex`
5. **Git:** Phiên bản `>= 2.30`.

---

## 2. QUY TRÌNH CÀI ĐẶT MÔI TRƯỜNG PHÁT TRIỂN (LOCAL DEVELOPMENT)

### Bước 1: Sao chép mã nguồn & Truy cập thư mục dự án
```bash
# Clone repository về máy
git clone <URL_REPOSITORY_CUA_BAN>
cd cham-cong-luong
```

### Bước 2: Thiết lập cấu hình biến môi trường
Sao chép các file cấu hình mẫu sang file môi trường làm việc thực tế trong thư mục ứng dụng `template/app`:
```bash
cd template/app

# Sao chép cấu hình server
cp .env.server.example .env.server

# Sao chép cấu hình client
cp .env.client.example .env.client
```

*Lưu ý:* Mở file `.env.server` và cấu hình mật khẩu PostgreSQL cục bộ nếu không dùng Docker mặc định.

### Bước 3: Cài đặt các gói thư viện phụ thuộc
```bash
# Cài đặt toàn bộ dependencies theo package.json
npm install
```

### Bước 4: Khởi tạo Cơ sở dữ liệu & Chạy Migration
Nếu sử dụng Docker cục bộ:
```bash
# Khởi động PostgreSQL container do Wasp quản lý
wasp start db
```

Mở một cửa sổ dòng lệnh thứ hai để áp dụng cấu trúc bảng dữ liệu:
```bash
# Tạo cấu trúc bảng và áp dụng migration
wasp db migrate-dev
```

### Bước 5: Nạp dữ liệu giả lập ban đầu (Seed Mock Data)
Để có sẵn dữ liệu phòng ban, chức vụ, ca làm và nhân viên mẫu phục vụ kiểm thử:
```bash
# Chạy script nạp dữ liệu mẫu đa doanh nghiệp
node --experimental-strip-types src/payroll/server/db/seedPayrollDemoData.ts
```

### Bước 6: Khởi chạy Ứng dụng
```bash
# Khởi động đồng thời Frontend (React/Vite) và Backend (Node.js/Express)
wasp start
```
* **Giao diện Web (Client):** Truy cập tại địa chỉ `http://localhost:3000`
* **Máy chủ API (Server):** Hoạt động tại địa chỉ `http://localhost:3001`
* **Trang quản trị hệ thống (Wasp Admin):** `http://localhost:3000/admin`

---

## 3. KIỂM CHỨNG CÀI ĐẶT THÀNH CÔNG (HEALTH CHECK)

Sau khi khởi chạy ứng dụng, thực hiện các bước kiểm tra nhanh sau:
1. **Kiểm tra giao diện:** Mở trình duyệt tại `http://localhost:3000`, màn hình Đăng nhập / Bảng điều khiển Chấm công & Tính lương xuất hiện đầy đủ, không có lỗi hiển thị.
2. **Kiểm tra API kết nối Database:** Kiểm tra log console của server hiển thị `Server listening on port 3001` và `Database connection established`.
3. **Chạy bộ kiểm thử tự động (Zero-Dependency Test Suite):**
   ```bash
   node --test --experimental-strip-types \
     "src/payroll/payrollEngine.test.ts" \
     "src/payroll/server/backendEngine.test.ts" \
     "src/payroll/server/multiTenantSecurity.test.ts" \
     "src/payroll/server/qaRegression.test.ts" \
     "src/payroll/server/securityAudit.test.ts"
   ```
   **Kết quả kỳ vọng:** Đạt chuẩn **61/61 tests PASS (100%)** trong thời gian $\le 2$ giây.

---

## 4. KHẮC PHỤC SỰ CỐ THƯỜNG GẶP KHI CÀI ĐẶT (TROUBLESHOOTING)

| Lỗi gặp phải | Nguyên nhân | Cách xử lý |
|:---|:---|:---|
| `Port 3000/3001 already in use` | Có tiến trình khác đang chiếm cổng của ứng dụng | Tắt ứng dụng đang chiếm cổng hoặc đổi cổng trong cấu hình Wasp. Trên Windows: `netstat -ano \| findstr 3000` sau đó `taskkill /PID <PID> /F`. |
| `Can't reach database server at localhost:5432` | PostgreSQL chưa khởi động hoặc sai thông tin `DATABASE_URL` | Kiểm tra Docker Desktop đã chạy chưa, hoặc kiểm tra dịch vụ `postgresql` trên máy đã `RUNNING`. |
| `Prisma Client has not been generated` | Chưa sinh client Prisma sau khi sửa schema | Chạy lệnh `wasp db migrate-dev` hoặc `npx prisma generate` trong thư mục `.wasp/out`. |
| `Permission denied on .env.server` | File bị khóa quyền đọc/ghi trên Linux | Phân lại quyền: `chmod 600 .env.server`. |
