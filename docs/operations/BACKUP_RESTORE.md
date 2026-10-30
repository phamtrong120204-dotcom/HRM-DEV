# BACKUP & RESTORE SOP — QUY TRÌNH SAO LƯU & KHÔI PHỤC DỮ LIỆU
**Dự án:** Phần mềm Quản trị Chấm công, Nhân sự & Tính lương B2B SaaS  
**Phiên bản hệ thống:** 1.0.0-RC1  
**Ngày lập tài liệu:** 2026-10-25  
**Mục tiêu:** Đảm bảo tính liên tục trong kinh doanh (Business Continuity) và khôi phục sau thảm họa (Disaster Recovery - DR)  

---

## 1. NGUYÊN TẮC SAO LƯU (BACKUP STRATEGY)

Hệ thống áp dụng nguyên tắc sao lưu tiêu chuẩn **3-2-1**:
* **3 bản sao dữ liệu:** 1 bản đang chạy chính thức (Live Database), 1 bản sao lưu cục bộ (Local Snapshot), 1 bản sao lưu độc lập ngoài vùng (Off-site Cloud Storage).
* **2 loại phương tiện lưu trữ:** Ổ đĩa máy chủ (SSD NVMe) và Dịch vụ lưu trữ tệp tin đám mây mã hóa (Cloud Object Storage S3/R2).
* **1 bản sao ngoài cơ sở:** Bản sao lưu được tự động đẩy sang một vùng địa lý độc lập để phòng ngừa thảm họa trung tâm dữ liệu.

---

## 2. QUY TRÌNH SAO LƯU CƠ SỞ DỮ LIỆU (DATABASE BACKUP)

### 2.1. Sao lưu tự động qua dịch vụ Đám mây (Automated Managed Backup)
* **Tần suất:** Hằng ngày (Daily) vào lúc 02:00 AM (giờ Việt Nam).
* **Lưu giữ (Retention):** Bản sao lưu hằng ngày được lưu giữ trong vòng **30 ngày**. Bản sao lưu cuối tháng (Monthly) được lưu giữ trong vòng **12 tháng**.
* **Cơ chế:** Kích hoạt tính năng Point-in-Time Recovery (PITR) của Supabase hoặc AWS RDS, cho phép khôi phục trạng thái cơ sở dữ liệu về bất kỳ thời điểm nào trong vòng 7 ngày qua với độ lệch chỉ tính bằng giây.

### 2.2. Sao lưu thủ công định kỳ qua dòng lệnh (Manual Cold Backup)
Khi cần bảo trì, nâng cấp lớn hoặc trước khi chạy migration phức tạp, Quản trị viên hệ thống thực hiện lệnh sao lưu nén và mã hóa:

```bash
#!/bin/bash
# Script sao lưu cơ sở dữ liệu PostgreSQL
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="/var/backups/payroll_db"
BACKUP_FILE="${BACKUP_DIR}/payroll_backup_${TIMESTAMP}.sql.gz"

# 1. Tạo thư mục nếu chưa có
mkdir -p ${BACKUP_DIR}

# 2. Xuất dữ liệu với nén gzip mức cao
pg_dump -h ${DB_HOST} -U ${DB_USER} -d ${DB_NAME} -Fc | gzip -9 > ${BACKUP_FILE}

# 3. Tạo mã băm SHA-256 để kiểm tra tính toàn vẹn
sha256sum ${BACKUP_FILE} > "${BACKUP_FILE}.sha256"

# 4. (Tùy chọn) Đồng bộ bản sao sang Cloudflare R2 / AWS S3
aws s3 cp ${BACKUP_FILE} s3://your-backup-bucket/daily/ --storage-class STANDARD_IA
```

---

## 3. KIỂM TRA TÍNH TOÀN VẸN CỦA BẢN SAO LƯU (INTEGRITY VERIFICATION)

> [!WARNING]
> **QUY TẮC AN NINH:** Một bản sao lưu chưa từng được khôi phục thử nghiệm thì không được coi là một bản sao lưu tin cậy!

1. **Kiểm tra mã băm Checksum:**
   Trước khi khôi phục, kiểm tra tính toàn vẹn của tệp sao lưu:
   ```bash
   sha256sum -c payroll_backup_20261025_020000.sql.gz.sha256
   ```
   Kết quả phải trả về: `OK`.
2. **Kiểm tra định kỳ trên môi trường Sandbox (Test Restore Drill):**
   Mỗi quý một lần, đội ngũ DevOps nạp tệp sao lưu vào một máy chủ độc lập (Staging/Sandbox) và chạy bộ kiểm thử `qaRegression.test.ts` để chứng minh toàn bộ dữ liệu nhân sự, kỳ lương và số công được bảo toàn nguyên vẹn.

---

## 4. QUY TRÌNH KHÔI PHỤC DỮ LIỆU (DISASTER RECOVERY RESTORE SOP)

Khi xảy ra sự cố phần cứng, lỗi phần mềm nghiêm trọng hoặc dữ liệu bị phá hủy, thực hiện khôi phục theo các bước chuẩn:

### Bước 1: Kích hoạt chế độ bảo trì (Maintenance Mode)
Tạm thời chặn mọi kết nối ghi vào cơ sở dữ liệu để tránh phát sinh dữ liệu rác trong quá trình phục hồi:
```bash
# Hiển thị trang bảo trì cho người dùng
touch /var/www/payroll/maintenance.flag
```

### Bước 2: Chuẩn bị cơ sở dữ liệu đích sạch
Khởi tạo cơ sở dữ liệu mới hoặc xóa trắng schema bị lỗi:
```bash
# Drop database cũ và tạo database mới
dropdb -h ${DB_HOST} -U ${DB_USER} ${DB_NAME}
createdb -h ${DB_HOST} -U ${DB_USER} -E UTF8 ${DB_NAME}
```

### Bước 3: Nạp dữ liệu từ tệp sao lưu
```bash
# Giải nén và nạp dữ liệu bằng pg_restore
gunzip -c payroll_backup_20261025_020000.sql.gz | pg_restore -h ${DB_HOST} -U ${DB_USER} -d ${DB_NAME} -v
```

### Bước 4: Kiểm tra dữ liệu sau phục hồi (Post-Restore Validation)
```bash
# Kiểm tra số lượng bản ghi nhân sự và bảng lương
psql -h ${DB_HOST} -U ${DB_USER} -d ${DB_NAME} -c "SELECT COUNT(*) FROM \"Tenant\";"
psql -h ${DB_HOST} -U ${DB_USER} -d ${DB_NAME} -c "SELECT COUNT(*) FROM \"Employee\";"
psql -h ${DB_HOST} -U ${DB_USER} -d ${DB_NAME} -c "SELECT COUNT(*) FROM \"PayrollPeriod\";"
```

### Bước 5: Chạy kiểm thử tự động xác nhận & Tắt chế độ bảo trì
Chạy bộ kiểm thử tự động 61 test cases. Khi toàn bộ test pass:
```bash
rm /var/www/payroll/maintenance.flag
# Khởi động lại ứng dụng
systemctl restart payroll-server
```

---

## 5. XUẤT VÀ BÀN GIAO DỮ LIỆU KHI KHÁCH HÀNG DỪNG SỬ DỤNG (OFFBOARDING)

Theo cam kết trong Điều khoản dịch vụ và Nghị định 13/2023/NĐ-CP:
1. **Thời hạn ân hạn (Grace Period):** Khi khách hàng dừng thuê bao, tài khoản chuyển sang trạng thái tạm khóa (`isActive = false`). Khách hàng có **30 ngày** để yêu cầu xuất dữ liệu.
2. **Định dạng bàn giao:** Dữ liệu được trích xuất hoàn chỉnh ra định dạng chuẩn quốc tế:
   - Hồ sơ nhân sự: File Excel `.xlsx` và JSON.
   - Bảng chấm công chi tiết và phiếu lương tổng hợp: File Excel `.xlsx`.
   - File log kiểm toán: File CSV `.csv`.
3. **Tiêu hủy an toàn:** Hết thời hạn 30 ngày, hệ thống sẽ thực hiện lệnh xóa logic (soft delete) và xóa vật lý vĩnh viễn (hard purge) dữ liệu của tenant khỏi database chính thức và các bản sao lưu lưu trữ.

---

## 6. XÁC NHẬN HIỆN TRẠNG KIỂM NGHIỆM

* **Đã kiểm chứng (Verified):** Tính năng xuất dữ liệu (Data Portability via Excel/JSON) và kịch bản nạp dữ liệu mẫu (`seedPayrollDemoData.ts`) đã vượt qua 100% trong bộ kiểm thử hồi quy.
* **Chưa kiểm chứng trên hạ tầng thực tế (Unverified on Production):** Quy trình khôi phục sau thảm họa (Disaster Recovery Drill) từ snapshot PITR trên cụm máy chủ Production thật hiện **CHƯA ĐƯỢC THỰC HIỆN** vì chưa thiết lập máy chủ Production. Việc kiểm thử khôi phục thực tế bắt buộc phải tiến hành trong giai đoạn diễn tập vận hành trước khi ký nghiệm thu chính thức với khách hàng.
