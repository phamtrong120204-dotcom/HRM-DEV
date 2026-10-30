# DEPLOYMENT GUIDE — HƯỚNG DẪN TRIỂN KHAI HẠ TẦNG PRODUCTION
**Dự án:** Phần mềm Quản trị Chấm công, Nhân sự & Tính lương B2B SaaS  
**Phiên bản hệ thống:** 1.0.0-RC1  
**Ngày lập tài liệu:** 2026-10-25  
**Mục tiêu:** Hướng dẫn chuẩn hóa quy trình đóng gói và triển khai ứng dụng lên môi trường Production  

---

> [!CAUTION]
> **LƯU Ý NGHIÊM NGẶT:**  
> Tài liệu này cung cấp hướng dẫn kỹ thuật phục vụ giai đoạn bàn giao. **Đội ngũ kỹ thuật TUYỆT ĐỐI KHÔNG TỰ Ý kích hoạt triển khai máy chủ Production hoặc kết nối tên miền thật khi chưa có văn bản phê duyệt từ Chủ dự án**.

---

## 1. MÔ HÌNH KIẾN TRÚC TRIỂN KHAI PRODUCTION

Hệ thống được thiết kế theo kiến trúc micro-modular hiện đại, hỗ trợ 2 phương án triển khai chính:

```
[ Người dùng cuối (Web Browser) ]
              | (HTTPS / TLS 1.3)
              v
[ Cloudflare CDN & WAF (Chặn DDoS, Rate Limit, SSL Termination) ]
              |
              v
[ Nginx Reverse Proxy / Load Balancer ]
              |
    +---------+---------+
    |                   |
    v                   v
[ Frontend Client ]   [ Backend API Server ]
(Vite SPA / Static)   (Node.js / Express Container)
                        |
                        v
              [ Connection Pooler (PGBouncer) ]
                        |
                        v
              [ PostgreSQL Managed Database ]
              (Supabase / AWS RDS / Viettel IDC)
```

### Phương án A: Triển khai trên Nền tảng Đám mây PaaS (Fly.io / Railway) — Khuyến nghị giai đoạn đầu
* **Ưu điểm:** Khởi tạo nhanh chóng, tự động cấu hình HTTPS, hỗ trợ CI/CD liền mạch, quản lý secrets tập trung, chi phí khởi điểm thấp (Pay-as-you-go).
* **Thành phần:**
  - Client & Server được đóng gói thành Docker container và deploy lên Fly.io / Railway.
  - Database sử dụng Supabase PostgreSQL (Singapore Region hoặc Việt Nam).

### Phương án B: Triển khai trên Máy chủ Riêng VPS / Cloud Server (Ubuntu 22.04 LTS + Docker)
* **Ưu điểm:** Kiểm soát hoàn toàn dữ liệu tại Việt Nam (tuân thủ 100% Luật An ninh mạng), tiết kiệm chi phí khi quy mô doanh nghiệp lớn.
* **Nhà cung cấp hạ tầng trong nước:** Viettel IDC, VNPT Cloud, FPT Telecom, CMC Telecom.
* **Thành phần:** Nginx Reverse Proxy, Certbot SSL, Docker Compose điều phối Frontend + Backend + Database.

---

## 2. QUY TRÌNH ĐÓNG GÓI & BUILD SẢN PHẨM (BUILD PIPELINE)

### Bước 1: Kiểm tra tính sẵn sàng của mã nguồn trước khi build
```bash
# 1. Chạy toàn bộ bộ kiểm thử tự động
npm test

# 2. Kiểm tra lỗi kiểu dữ liệu tĩnh (Typecheck)
npx tsc --noEmit
```

### Bước 2: Biên dịch ứng dụng qua Wasp CLI
```bash
cd template/app

# Sinh mã nguồn đóng gói sản xuất (Production Build)
wasp build
```
Lệnh trên sẽ sinh ra thư mục `.wasp/build` chứa toàn bộ mã nguồn Frontend được tối ưu hóa (minified assets) và Backend Node.js sẵn sàng chạy độc lập.

### Bước 3: Đóng gói Docker Image (Tùy chọn)
Trong thư mục `.wasp/build`:
```bash
# Đóng gói image cho backend server
docker build -t your-org/payroll-server:1.0.0 -f Dockerfile .
```

---

## 3. THIẾT LẬP TÊN MIỀN, DNS & CHỨNG CHỈ BẢO MẬT (SSL/TLS)

1. **Cấu hình DNS (Ví dụ với Cloudflare):**
   - Bản ghi A: `@` $\rightarrow$ Địa chỉ IP máy chủ Production (ví dụ: `103.xxx.xxx.xxx`).
   - Bản ghi CNAME: `app` $\rightarrow$ `yourdomain.com` (Dành cho ứng dụng SaaS).
   - Bản ghi CNAME: `api` $\rightarrow$ `yourdomain.com` (Dành cho máy chủ API nếu tách biệt).
2. **Kích hoạt SSL/TLS:**
   - Trên Cloudflare: Bật chế độ mã hóa `Full (Strict)` để đảm bảo mã hóa từ Client đến Máy chủ đích.
   - Trên Nginx độc lập: Cài đặt chứng chỉ Let's Encrypt qua Certbot:
     ```bash
     sudo apt update && sudo apt install -y certbot python3-certbot-nginx
     sudo certbot --nginx -d app.yourdomain.com -d api.yourdomain.com
     ```
3. **Cấu hình Security Headers trên Nginx (`/etc/nginx/sites-available/payroll`):**
   ```nginx
   add_header X-Frame-Options "SAMEORIGIN" always;
   add_header X-Content-Type-Options "nosniff" always;
   add_header X-XSS-Protection "1; mode=block" always;
   add_header Referrer-Policy "strict-origin-when-cross-origin" always;
   add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:;" always;
   ```

---

## 4. CHẠY MIGRATION CƠ SỞ DỮ LIỆU AN TOÀN TRÊN PRODUCTION

> [!IMPORTANT]
> **QUY TẮC SỐNG CÒN:** Tuyệt đối **KHÔNG BAO GIỜ** chạy `wasp db migrate-dev` hoặc `prisma db push` trên môi trường Production vì các lệnh này có thể gây mất dữ liệu hoặc xung đột schema!

Chỉ sử dụng lệnh migration an toàn có kiểm soát:
```bash
# Di chuyển vào thư mục build máy chủ
cd .wasp/build

# Áp dụng các file migration đã được kiểm chứng
npx prisma migrate deploy
```

---

## 5. ĐIỂM GIÁM SÁT SỨC KHỎE HỆ THỐNG (HEALTH CHECK & MONITORING)

Máy chủ cung cấp endpoint kiểm tra tình trạng dịch vụ phục vụ cho Load Balancer và hệ thống giám sát tự động (UptimeRobot, BetterUptime):
* **Endpoint kiểm tra tổng thể:** `GET https://app.yourdomain.com/health`
  - Mã phản hồi: `200 OK`
  - Nội dung phản hồi: `{"status": "healthy", "timestamp": "2026-10-25T...", "database": "connected"}`
* **Cảnh báo sự cố:** Cấu hình thông báo tức thì qua Telegram Bot / Zalo / Email khi tỷ lệ lỗi `5xx` vượt quá 1% hoặc CPU máy chủ vượt ngưỡng 85% liên tục trong 5 phút.

---

## 6. CHECKLIST KIỂM CHỨNG SAU KHI TRIỂN KHAI (POST-DEPLOYMENT SMOKE TEST)

Ngay sau khi triển khai lên môi trường Production, thực hiện rà soát 6 bước:
- [ ] Truy cập trang đăng nhập qua HTTPS (kiểm tra ổ khóa xanh, TLS 1.3).
- [ ] Đăng nhập bằng tài khoản Quản trị viên thử nghiệm.
- [ ] Kiểm tra tính năng tải bảng lương mẫu và xem trước số liệu.
- [ ] Thử nghiệm một thao tác ghi: Tạo mới phòng ban hoặc ca làm thử nghiệm và xóa đi.
- [ ] Kiểm tra bảng `AuditLog` để chắc chắn hành động ghi nhận nhật ký hoạt động bình thường.
- [ ] Xác nhận không có lỗi hiển thị trong Console của trình duyệt (F12) và trong log máy chủ (`docker logs`).
