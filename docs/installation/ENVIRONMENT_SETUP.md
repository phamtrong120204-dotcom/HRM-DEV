# ENVIRONMENT SETUP — CẤU HÌNH BIẾN MÔI TRƯỜNG & QUẢN TRỊ BÍ MẬT
**Dự án:** Phần mềm Quản trị Chấm công, Nhân sự & Tính lương B2B SaaS  
**Phiên bản hệ thống:** 1.0.0-RC1  
**Ngày lập tài liệu:** 2026-10-25  
**Nguyên tắc bảo mật:** Không lưu thông tin nhạy cảm vào Git (Zero Secret In Repo)  

---

## 1. PHÂN BIỆT CÁC MÔI TRƯỜNG VẬN HÀNH

Hệ thống được thiết kế hỗ trợ 4 môi trường hoạt động độc lập:

1. **Development (Local):** Dành cho lập trình viên phát triển tính năng, kiểm thử trên máy cá nhân với database PostgreSQL cục bộ hoặc Docker.
2. **Test / CI (Tự động hóa):** Dành cho quy trình kiểm thử tự động (Unit test, Integration test, Security Pentest).
3. **Staging (Kiểm thử tiền phát hành):** Môi trường bản sao giống hệt Production, kết nối cơ sở dữ liệu thử nghiệm, dùng để khách hàng chạy thử nghiệm (UAT) và đối chiếu nghiệp vụ trước khi phát hành.
4. **Production (Vận hành thực tế):** Môi trường thương mại phục vụ khách hàng trả phí, đòi hỏi hạ tầng bảo mật tối đa, mã hóa dữ liệu tại chỗ và sao lưu định kỳ.

---

## 2. DANH MỤC BIẾN MÔI TRƯỜNG MÁY CHỦ (SERVER ENVIRONMENT - `.env.server`)

### 2.1. Cấu hình Cơ sở dữ liệu PostgreSQL / Supabase
```env
# Kết nối trực tiếp (Direct Connection) hoặc Connection Pooler (PGBouncer):
# - Local Development:
DATABASE_URL=postgresql://postgres:your_dev_password@localhost:5432/opensaas_payroll_dev

# - Staging / Production (Supabase Connection Pooling qua Supavisor port 6543):
# DATABASE_URL=postgresql://postgres.[REF]:[PASS]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
# DIRECT_URL=postgresql://postgres.[REF]:[PASS]@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres
```

### 2.2. Bảo mật Đa doanh nghiệp & Phiên làm việc (Multi-Tenant Security)
```env
# Khóa bí mật dùng để ký và mã hóa phiên làm việc đa doanh nghiệp (tối thiểu 32 ký tự ngẫu nhiên):
TENANT_SESSION_SECRET=a_very_long_and_random_cryptographic_key_32_chars_min

# Giới hạn kích thước file upload Excel chấm công (Megabytes):
MAX_UPLOAD_FILE_SIZE_MB=15

# Khai báo môi trường vận hành: 'development' | 'test' | 'staging' | 'production'
APP_ENV=development

# Danh sách email nhận quyền Quản trị viên nền tảng (cách nhau bởi dấu phẩy):
ADMIN_EMAILS=superadmin@yourcompany.com
```

### 2.3. Cấu hình Cổng thanh toán (Payment Gateways)
```env
# Cổng thanh toán quốc tế Stripe (chế độ Test):
STRIPE_API_KEY=sk_test_51...
STRIPE_WEBHOOK_SECRET=whsec_...

# Cổng thanh toán Việt Nam (Dự kiến kết nối VietQR / PayOS cho thị trường trong nước):
VIETQR_CLIENT_ID=vqr_client_...
VIETQR_API_KEY=vqr_api_key_...
PAYOS_CLIENT_ID=payos_id_...
PAYOS_API_KEY=payos_key_...
PAYOS_CHECKSUM_KEY=payos_checksum_...
```

### 2.4. Cấu hình Lưu trữ tệp tin đám mây (Cloud Object Storage)
```env
# Nhà cung cấp lưu trữ: 'supabase' hoặc 's3' (AWS S3 / Cloudflare R2)
STORAGE_PROVIDER=supabase

# Nếu dùng Supabase Storage:
SUPABASE_URL=https://[YOUR_PROJECT_REF].supabase.co
SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi... # Tuyệt đối KHÔNG đưa vào frontend
SUPABASE_BUCKET_COMPANY_ASSETS=company-assets
SUPABASE_BUCKET_PAYROLL_EXPORTS=payroll-exports

# Nếu dùng AWS S3 / Cloudflare R2:
# AWS_S3_IAM_ACCESS_KEY=AKIA...
# AWS_S3_IAM_SECRET_KEY=wJalr...
# AWS_S3_FILES_BUCKET=company-payroll-storage
# AWS_S3_REGION=ap-southeast-1
```

### 2.5. Cấu hình Dịch vụ Email thông báo (Transactional Email)
```env
# Nhà cung cấp gửi email giao dịch (SendGrid / Resend):
SENDGRID_API_KEY=SG.your_api_key_here
# RESEND_API_KEY=re_your_api_key_here
EMAIL_FROM_ADDRESS="Hệ thống Chấm công & Tính lương <no-reply@yourdomain.com>"
```

---

## 3. DANH MỤC BIẾN MÔI TRƯỜNG GIAO DIỆN (CLIENT ENVIRONMENT - `.env.client`)

Toàn bộ các biến môi trường client trong Wasp bắt buộc phải có tiền tố `REACT_APP_`:

```env
# Mã theo dõi Google Analytics (nếu sử dụng):
REACT_APP_GOOGLE_ANALYTICS_ID=G-XXXXXXXXXX

# Cấu hình cổng thanh toán client-side:
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_...

# URL máy chủ API (nếu triển khai tách biệt domain):
# REACT_APP_API_URL=https://api.yourdomain.com
```

---

## 4. QUY TRÌNH QUẢN TRỊ BÍ MẬT & LUÂN CHUYỂN KHÓA (SECRET ROTATION)

### 4.1. Quy tắc an toàn bắt buộc:
1. **Không bao giờ commit file `.env` thật vào Git:** File `.gitignore` đã cấu hình chặn toàn bộ `.env`, `.env.server`, `.env.client`, `.env.local`.
2. **Sử dụng Secret Manager trên môi trường Production:** Trên các nền tảng đám mây (Fly.io, Railway, AWS ECS, Google Cloud Run), cấu hình bí mật thông qua CLI bảo mật hoặc Dashboard mã hóa của nhà cung cấp hạ tầng (ví dụ: `fly secrets set DATABASE_URL=...`).
3. **Phân quyền đặc quyền tối thiểu (Least Privilege):** Chỉ Lead DevOps/System Admin mới có quyền truy cập vào các khóa Production. Lập trình viên thông thường chỉ sử dụng khóa Development và Mock.

### 4.2. Quy trình luân chuyển khóa khi phát hiện nguy cơ rò rỉ (Key Rotation SOP):
1. **Khóa `DATABASE_URL`:**
   - Đổi mật khẩu database người dùng trong bảng điều khiển PostgreSQL/Supabase.
   - Cập nhật chuỗi kết nối mới vào biến môi trường máy chủ.
   - Khởi động lại ứng dụng để áp dụng kết nối mới.
2. **Khóa `TENANT_SESSION_SECRET`:**
   - Sinh chuỗi ngẫu nhiên mới: `openssl rand -hex 32`.
   - Cập nhật biến `TENANT_SESSION_SECRET` và khởi động lại server.
   - *Hệ quả:* Toàn bộ người dùng sẽ bị đăng xuất tự động và cần đăng nhập lại nhằm vô hiệu hóa các cookie cũ bị lộ.
3. **Khóa `STRIPE_WEBHOOK_SECRET` / `PAYOS_CHECKSUM_KEY`:**
   - Đăng nhập vào trang quản trị cổng thanh toán, tạo khóa Webhook mới.
   - Cập nhật song song và vô hiệu hóa khóa cũ sau 24 giờ.
