# UPGRADE & ROLLBACK SOP — QUY TRÌNH NÂNG CẤP & HOÀN NGUYÊN HỆ THỐNG
**Dự án:** Phần mềm Quản trị Chấm công, Nhân sự & Tính lương B2B SaaS  
**Phiên bản hệ thống:** 1.0.0-RC1  
**Ngày lập tài liệu:** 2026-10-25  
**Mục tiêu:** Đảm bảo quá trình cập nhật phiên bản diễn ra an toàn, không gián đoạn dịch vụ (Zero-Downtime) và có phương án hoàn nguyên tức thì khi phát sinh lỗi  

---

## 1. NGUYÊN TẮC NÂNG CẤP HỆ THỐNG (UPGRADE PRINCIPLES)

1. **Mô hình Mở rộng & Thu hẹp (Expand and Contract Pattern):** Mọi thay đổi về cấu trúc cơ sở dữ liệu (Database Schema) phải tương thích ngược (Backward-Compatible).
   - *Giai đoạn 1 (Expand):* Thêm bảng mới, thêm cột mới (cho phép `NULL` hoặc có giá trị mặc định). Mã nguồn cũ và mới đều có thể chạy song song.
   - *Giai đoạn 2 (Deploy Code):* Triển khai phiên bản mã nguồn mới sử dụng cấu trúc mới.
   - *Giai đoạn 3 (Contract):* Sau khi hệ thống vận hành ổn định tối thiểu 1 kỳ lương, mới tiến hành xóa bỏ các cột/bảng cũ không còn sử dụng.
2. **Không khóa bảng lớn trong giờ cao điểm:** Toàn bộ lệnh migration thay đổi schema chỉ được chạy ngoài giờ hành chính (khuyến nghị từ 22:00 đến 05:00 sáng).
3. **Bắt buộc sao lưu trước khi nâng cấp:** Luôn tạo bản snapshot cơ sở dữ liệu trước khi thực thi bất kỳ lệnh migration nào.

---

## 2. QUY TRÌNH NÂNG CẤP CHUẨN (STANDARD UPGRADE SOP)

```
[ Bước 1: Sao lưu Snapshot DB ]
               |
               v
[ Bước 2: Chạy Prisma Migrate Deploy ]
               | (Thành công)
               v
[ Bước 3: Triển khai Container phiên bản mới ]
               |
               v
[ Bước 4: Chạy Post-Deployment Smoke Test ]
    |                                   |
    v (Đạt)                             v (Thất bại)
[ Hoàn tất nâng cấp ]       [ Kích hoạt ROLLBACK khẩn cấp ]
```

### Bước 1: Tạo bản snapshot cơ sở dữ liệu
```bash
# Tạo bản sao lưu điểm phục hồi khẩn cấp
pg_dump -h ${DB_HOST} -U ${DB_USER} -d ${DB_NAME} -Fc > "/var/backups/pre_upgrade_snapshot_$(date +%s).dump"
```

### Bước 2: Áp dụng migration cơ sở dữ liệu
```bash
# Áp dụng migration phiên bản mới
npx prisma migrate deploy
```

### Bước 3: Triển khai phiên bản ứng dụng mới
Nếu dùng Docker / Docker Compose:
```bash
# Kéo image phiên bản mới (ví dụ v1.1.0)
docker pull your-org/payroll-server:1.1.0

# Khởi động container mới và tắt container cũ
docker-compose up -d --no-deps --build payroll-server
```

### Bước 4: Kiểm tra xác nhận sau nâng cấp (Smoke Test)
* Kiểm tra endpoint `/health` trả về `200 OK`.
* Đăng nhập thử bằng tài khoản kiểm thử và kiểm tra tính năng tính lương của tháng hiện tại.
* Rà soát log lỗi máy chủ: `docker logs -f --tail 100 payroll-server`.

---

## 3. KẾ HOẠCH XỬ LÝ MIGRATION THẤT BẠI (MIGRATION FAILURE HANDLING)

Nếu lệnh `prisma migrate deploy` bị lỗi giữa chừng (do timeout, mất kết nối mạng hoặc xung đột khóa dữ liệu):

1. **Kiểm tra trạng thái migration trong bảng `_prisma_migrations`:**
   ```sql
   SELECT migration_name, finished_at, rolled_back_at FROM "_prisma_migrations" ORDER BY started_at DESC LIMIT 5;
   ```
2. **Xử lý nếu migration bị đánh dấu `failed`:**
   Sử dụng lệnh chính thức của Prisma để đánh dấu hoàn nguyên migration bị lỗi:
   ```bash
   npx prisma migrate resolve --rolled-back "20261025_add_new_tax_field"
   ```
3. **Khắc phục lỗi:** Phân tích log lỗi, sửa lại file SQL migration trong môi trường development, kiểm thử lại cục bộ trước khi thử lại trên server.

---

## 4. KẾ HOẠCH HOÀN NGUYÊN ỨNG DỤNG KHẨN CẤP (APPLICATION ROLLBACK SOP)

Khi phiên bản mới được triển khai nhưng phát sinh lỗi nghiêm trọng ảnh hưởng đến tính toán tiền lương hoặc gây gián đoạn dịch vụ:

### Bước 1: Hoàn nguyên mã nguồn máy chủ (Rollback Container Image)
Chuyển ngay lập tức về tag image ổn định trước đó:
```bash
# Đổi tag image về phiên bản trước (ví dụ v1.0.0)
docker-compose stop payroll-server
sed -i 's/payroll-server:1.1.0/payroll-server:1.0.0/g' docker-compose.yml
docker-compose up -d payroll-server
```

### Bước 2: Đánh giá tác động đến cơ sở dữ liệu
* **Trường hợp thay đổi Schema là tương thích ngược (Additive):** Không cần rollback database! Mã nguồn cũ vẫn đọc/ghi bình thường vì các cột mới đều có giá trị mặc định hoặc cho phép `NULL`.
* **Trường hợp Schema bị thay đổi không thể tương thích:** Khôi phục lại bản snapshot cơ sở dữ liệu đã tạo ở Bước 1.

### Bước 3: Thông báo & Kiểm tra lại
* Thông báo cho bộ phận Hỗ trợ khách hàng về tình trạng hệ thống đã trở lại bình thường.
* Chạy bộ kiểm thử tự động 61 test cases để xác nhận tính toàn vẹn của logic nghiệp vụ sau hoàn nguyên.
