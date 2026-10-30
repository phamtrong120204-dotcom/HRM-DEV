# HƯỚNG DẪN THIẾT LẬP CƠ SỞ DỮ LIỆU, MIGRATION & SAO LƯU PHỤC HỒI (DATABASE SETUP & DISASTER RECOVERY)

---

## 1. SO SÁNH VÀ ĐÁNH GIÁ CÔNG NGHỆ CƠ SỞ DỮ LIỆU

Hệ thống chấm công và tính lương đa doanh nghiệp yêu cầu một hệ quản trị cơ sở dữ liệu quan hệ mạnh mẽ, hỗ trợ chuẩn giao dịch ACID tuyệt đối và tính toán số liệu chính xác. Dưới đây là phân tích chi tiết 3 phương án công nghệ:

### 1.1. Bảng so sánh 3 phương án triển khai cơ sở dữ liệu

| Tiêu chí | Phương án 1: PostgreSQL Local (Docker / Wasp start db) | Phương án 2: PostgreSQL Tự quản trị (Self-hosted VPS) | Phương án 3 (Khuyến nghị): Supabase Managed PostgreSQL |
| :--- | :--- | :--- | :--- |
| **Mục đích sử dụng** | Phục vụ lập trình cục bộ (Local Development) & Kiểm thử tự động. | Doanh nghiệp muốn tự kiểm soát 100% dữ liệu trên máy chủ riêng (On-premise / Private Cloud). | Triển khai SaaS thương mại trên đám mây (Cloud Staging & Production). |
| **Chi phí hạ tầng** | **0 VNĐ** (Chạy trực tiếp trên máy lập trình viên). | Chi phí thuê VPS (khoảng 200.000 - 500.000 VNĐ / tháng). | Gói **Free** (đủ cho 500MB DB, 1GB Storage) hoặc gói **Pro 25 USD/tháng** (8GB DB, 100GB Storage, Daily Backup). |
| **Công việc cấu hình** | **Cực kỳ đơn giản**: Chỉ cần cài Docker và chạy lệnh `wasp start db`. | Cần tự cài đặt PostgreSQL, cấu hình tường lửa, sao lưu tự động và SSL. | Đăng ký tài khoản, bấm tạo Project trong 2 phút là có ngay Connection String. |
| **Tính tương thích Wasp & Prisma** | **100% hoàn hảo**. Wasp tự động quản lý vòng đời container Docker. | **100% tương thích** qua chuẩn kết nối `postgresql://`. | **100% tương thích** khi cấu hình đúng Connection Pooler (Supavisor). |
| **Sao lưu tự động (Backup)** | Thủ công (phải tự export dữ liệu nếu cần). | Phải tự viết script cron job chạy `pg_dump` hàng ngày. | **Tự động hóa hoàn toàn**: Supabase tự động backup hàng ngày và hỗ trợ Point-in-time Recovery (PITR). |
| **Lưu trữ tệp tin (Storage)** | Lưu trên đĩa cứng cục bộ (Local storage). | Phải cấu hình thêm MinIO hoặc lưu file tĩnh trên VPS. | **Tích hợp sẵn Supabase Storage** (tương thích chuẩn S3, bảo mật bằng Presigned URL). |

---

## 2. VAI TRÒ CỦA SUPABASE TRONG KIẾN TRÚC SẢN PHẨM

Một trong những vấn đề kiến trúc quan trọng nhất là **phân định ranh giới giữa Wasp và Supabase**:

> [!IMPORTANT]
> **QUYẾT ĐỊNH KIẾN TRÚC CỐT LÕI:**
> - **Supabase CHỈ cung cấp 2 dịch vụ:**
>   1. **Managed PostgreSQL Database:** Lưu trữ toàn bộ bảng dữ liệu của hệ thống.
>   2. **Supabase Storage:** Lưu trữ logo công ty, hợp đồng lao động và các tệp Excel xuất bảng lương.
> - **TUYỆT ĐỐI KHÔNG SỬ DỤNG SUPABASE AUTH:**
>   - Wasp đã có sẵn hệ thống xác thực người dùng tích hợp hoàn chỉnh (Wasp Auth) liên kết chặt chẽ với cơ chế session, cookie và bảng `User`.
>   - Nếu kích hoạt thêm Supabase Auth sẽ tạo ra **hai hệ thống xác thực độc lập**, dẫn đến xung đột session, mất đồng bộ trạng thái đăng nhập và gây phức tạp hóa quy trình phân quyền Multi-tenant.

---

## 3. PHƯƠNG ÁN KHUYẾN NGHỊ & PHƯƠNG ÁN DỰ PHÒNG

### 3.1. Phương án khuyến nghị (Recommended Strategy)
- **Môi trường Phát triển (Local Dev):** Sử dụng PostgreSQL tích hợp của Wasp (`wasp start db`) qua Docker.
- **Môi trường Triển khai (Staging & Production):** Sử dụng **Supabase PostgreSQL** làm cơ sở dữ liệu chính + **Supabase Storage** làm kho lưu trữ tệp tin.

### 3.2. Phương án dự phòng (Fallback Strategy)
- Nếu doanh nghiệp khách hàng yêu cầu dữ liệu phải đặt hoàn toàn tại Việt Nam vì lý do tuân thủ an toàn thông tin:
  - Chuyển sang thuê máy chủ Cloud/VPS tại Việt Nam (Viettel IDC, FPT Cloud, VNPT).
  - Cài đặt PostgreSQL 16 + MinIO (tương thích chuẩn AWS S3).
  - Do hệ thống sử dụng Prisma ORM chuẩn, **không cần thay đổi bất kỳ dòng mã nguồn nào**, chỉ cần thay đổi biến môi trường `DATABASE_URL` là ứng dụng hoạt động ngay lập tức.

---

## 4. CHECKLIST QUYẾT ĐỊNH CẦN CHỦ SẢN PHẨM (PRODUCT OWNER) PHÊ DUYỆT

Trước khi kết nối với bất kỳ dịch vụ đám mây bên ngoài nào hoặc chạy migration lên môi trường chính thức, Chủ sản phẩm cần xem xét và phê duyệt danh mục sau:

- [ ] **Quyết định 1:** Phê duyệt lựa chọn nhà cung cấp Database (Supabase Cloud hay Tự host trên VPS Việt Nam).
- [ ] **Quyết định 2:** Phê duyệt ngân sách hạ tầng (Gói Free thử nghiệm hay Gói Pro $25/tháng để bật Daily Backup tự động).
- [ ] **Quyết định 3:** Phê duyệt vị trí đặt dữ liệu (Data Residency: Singapore `ap-southeast-1` hay Việt Nam).
- [ ] **Quyết định 4:** Phê duyệt danh sách quản trị viên có quyền truy cập vào bảng điều khiển (Dashboard) của cơ sở dữ liệu.
- [ ] **Quyết định 5:** Xác nhận kế hoạch bảo trì định kỳ và cửa sổ thời gian chạy migration (thường vào đêm cuối tuần).

---

## 5. HƯỚNG DẪN CẤU HÌNH KẾT NỐI SUPABASE POSTGRESQL

Khi kết nối ứng dụng Wasp/Prisma với Supabase, cần chú ý cơ chế **Connection Pooling (Supavisor)** của Supabase để tránh cạn kiệt số lượng kết nối tối đa:

### 5.1. Hai loại Connection String trong Supabase

1. **Direct Connection (Cổng 5432) — Dùng cho chạy Migration:**
   - Dùng khi thực hiện lệnh `wasp db migrate-dev` hoặc `prisma migrate deploy`.
   - Cú pháp:
     ```env
     DIRECT_URL="postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres"
     ```
2. **Pooled Connection (Cổng 6543, Transaction Mode) — Dùng cho Ứng dụng Web chạy thường nhật:**
   - Sử dụng bộ gom kết nối Supavisor để phục vụ đồng thời hàng nghìn kết nối từ máy chủ web mà không làm quá tải cơ sở dữ liệu.
   - Cú pháp:
     ```env
     DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=10"
     ```

---

## 6. QUY TRÌNH CHẠY MIGRATION VÀ NÂNG CẤP LƯỢC ĐỒ AN TOÀN

### 6.1. Nguyên tắc an toàn
- **Môi trường Dev:** Chạy `wasp db migrate-dev` để sinh file migration mới trong thư mục `migrations/`.
- **Môi trường Production:** Tuyệt đối không chạy `migrate-dev` hay `db push`. Chỉ chạy lệnh chính thức:
  ```bash
  npx prisma migrate deploy
  # hoặc
  wasp db migrate-deploy
  ```
- **Không bao giờ chạy lệnh hủy diệt:** Tuyệt đối không chạy `prisma migrate reset` trên môi trường có dữ liệu, vì lệnh này sẽ xóa sạch toàn bộ cơ sở dữ liệu!

### 6.2. Các bước nâng cấp lược đồ khi có thay đổi

```mermaid
sequenceDiagram
    autonumber
    actor Dev as Lập trình viên
    participant LocalDB as Local Database
    participant Git as Git Version Control
    participant StagingDB as Staging Database
    participant ProdDB as Production Database

    Dev->>LocalDB: Chỉnh sửa schema.prisma & chạy wasp db migrate-dev
    LocalDB-->>Dev: Tạo file migration có đánh số thứ tự (timestamp_name)
    Dev->>Git: Commit và tạo Pull Request (PR)
    Dev->>StagingDB: Kiểm tra migrate deploy trên môi trường Staging
    critical Phê duyệt Production
        Dev->>ProdDB: Tạo bản sao lưu đầy đủ (pg_dump) trước khi migrate
        Dev->>ProdDB: Chạy npx prisma migrate deploy
    end
    ProdDB-->>Dev: Nâng cấp thành công, không mất dữ liệu
```

---

## 7. QUY TRÌNH SAO LƯU VÀ PHỤC HỒI THẢM HỌA (DISASTER RECOVERY SOP)

### 7.1. Sao lưu dự phòng cơ sở dữ liệu (Logical Backup với `pg_dump`)

Để đảm bảo an toàn tuyệt đối, hệ thống cần cấu hình lệnh sao lưu tự động định kỳ vào 02:00 sáng hàng ngày:

```bash
# Lệnh sao lưu toàn bộ cơ sở dữ liệu dưới dạng nén
pg_dump -h [DB_HOST] -p 5432 -U postgres -d postgres -F c -b -v -f "backup_payroll_$(date +%Y%m%d_%H%M%S).dump"
```

### 7.2. Quy trình phục hồi dữ liệu từ bản sao lưu (Restore)

Khi xảy ra sự cố phần cứng hoặc lỗi con người làm mất mát dữ liệu:

1. **Bước 1 — Tạm ngừng ứng dụng web:** Chuyển hệ thống sang trang thông báo bảo trì để tránh người dùng tiếp tục ghi thêm dữ liệu mới.
2. **Bước 2 — Khởi tạo Database sạch:** Tạo một database mới hoặc xóa schema cũ.
3. **Bước 3 — Chạy lệnh phục hồi:**
   ```bash
   pg_restore -h [DB_HOST] -p 5432 -U postgres -d postgres -v "backup_payroll_20260315.dump"
   ```
4. **Bước 4 — Kiểm toán tính toàn vẹn:** Kiểm tra số lượng bản ghi trong các bảng `Tenant`, `Employee`, `PayrollPeriod` để đảm bảo không bị thiếu sót.
5. **Bước 5 — Mở lại dịch vụ:** Bật lại ứng dụng web và thông báo hoàn tất.

### 7.3. Kịch bản xử lý khi Migration thất bại (Rollback SOP)

Nếu trong quá trình nâng cấp production, một câu lệnh SQL trong file migration bị lỗi:

1. Prisma sẽ tự động dừng lại và đánh dấu migration ở trạng thái `failed` trong bảng `_prisma_migrations`.
2. **Khắc phục lỗi:**
   - Đọc thông báo lỗi chính xác trong log.
   - Viết migration đảo ngược (Revert script) để đưa cấu trúc bảng về trạng thái trước đó.
   - Đánh dấu bản ghi migration là đã xử lý xong:
     ```bash
     npx prisma migrate resolve --rolled-back "[TÊN_MIGRATION_BỊ_LỖI]"
     ```
3. Sau khi sửa xong file migration, thực hiện lại lệnh `npx prisma migrate deploy`.
