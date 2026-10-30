# CLIENT HANDOVER PACKAGE — HỒ SƠ BÀN GIAO SẢN PHẨM CHO KHÁCH HÀNG
**Dự án:** Phần mềm Quản trị Chấm công, Nhân sự & Tính lương B2B SaaS  
**Phiên bản bàn giao:** 1.0.0-RC1  
**Ngày lập hồ sơ:** 2026-10-25  
**Bên bàn giao:** Đội ngũ Kỹ thuật & Triển khai Nền tảng SaaS  
**Bên tiếp nhận:** Đại diện Ban Giám đốc & Phòng Nhân sự / Kế toán Khách hàng  

---

## 1. DANH MỤC THÀNH PHẦN BÀN GIAO (DELIVERABLES INVENTORY)

| STT | Thành phần bàn giao | Định dạng / Phương thức | Mô tả chi tiết |
|:---:|:---|:---:|:---|
| **1** | **Hệ thống phần mềm SaaS** | Ứng dụng Web trực tuyến | Đường dẫn truy cập chính thức: `https://app.yourdomain.com` |
| **2** | **Tài khoản Quản trị viên cấp cao** | Email kích hoạt an toàn | Tài khoản có quyền `ORG_OWNER` dành riêng cho người đại diện pháp luật của khách hàng. |
| **3** | **Bộ tài liệu hướng dẫn sử dụng** | Tệp tin điện tử PDF / Web | - Hướng dẫn thiết lập nhanh 12 bước ([CUSTOMER_ONBOARDING.md](file:///C:/Users/Admin/Desktop/cham-cong-luong/docs/product/CUSTOMER_ONBOARDING.md))<br>- Cẩm nang cài đặt nghiệp vụ Nhóm A ([SETTINGS_USER_GUIDE.md](file:///C:/Users/Admin/Desktop/cham-cong-luong/docs/product/SETTINGS_USER_GUIDE.md)) |
| **4** | **Mẫu bảng tính nhập liệu chuẩn** | Tệp tin Excel `.xlsx` | Mẫu danh sách nhân viên, mẫu bảng chấm công theo ca chuẩn hóa có công thức kiểm tra dữ liệu đầu vào. |
| **5** | **Biên bản nghiệm thu kỹ thuật** | Văn bản có chữ ký số | Kết quả kiểm thử tự động 61/61 ca kiểm thử chứng minh thuật toán tính lương và tính cô lập dữ liệu. |

---

## 2. QUY TRÌNH BÀN GIAO THÔNG TIN XÁC THỰC AN TOÀN (CREDENTIALS HANDOVER)

> [!CAUTION]
> **QUY TẮC BẢO MẬT TUYỆT ĐỐI:**  
> Nghiêm cấm gửi mật khẩu đăng nhập, khóa bí mật hoặc thông tin tài khoản qua tin nhắn Zalo, Facebook, SMS hoặc email thông thường dưới dạng văn bản thô (Plain Text)!

### Quy trình bàn giao mật khẩu chuẩn mực:
1. **Khởi tạo liên kết an toàn dùng 1 lần (One-Time Secret Link):**
   - Đội ngũ kỹ thuật sử dụng công cụ mã hóa端-to-端 (ví dụ: *Bitwarden Send* hoặc *1Password*) để tạo liên kết chỉ mở được 1 lần duy nhất trong vòng 24 giờ.
2. **Kích hoạt tài khoản:**
   - Người đại diện khách hàng mở liên kết an toàn để nhận mật khẩu khởi tạo ban đầu.
   - Khi đăng nhập lần đầu tiên, hệ thống **bắt buộc người dùng phải đổi mật khẩu mới** đáp ứng tiêu chuẩn an toàn (tối thiểu 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt).
   - Khuyến nghị kích hoạt ngay tính năng Xác thực 2 yếu tố (2FA).

---

## 3. CAM KẾT CHẤT LƯỢNG DỊCH VỤ (SERVICE LEVEL AGREEMENT - SLA)

Nhà cung cấp cam kết mức độ dịch vụ ổn định và thời gian phản hồi sự cố cho Khách hàng:

### 3.1. Cam kết tính khả dụng của hệ thống (Uptime SLA):
* Cam kết thời gian hoạt động tối thiểu: **99.5% mỗi tháng** (tương đương tổng thời gian gián đoạn tối đa không quá 3.6 giờ/tháng).
* Thời gian bảo trì định kỳ: Được thông báo trước tối thiểu **24 giờ** và chỉ thực hiện trong khung giờ thấp điểm (từ 23:00 đến 04:00 sáng ngày Chủ nhật).

### 3.2. Ma trận mức độ ưu tiên & Thời gian phản hồi sự cố:

| Mức độ ưu tiên | Định nghĩa sự cố | Thời gian phản hồi ban đầu | Thời gian cam kết khắc phục tạm thời |
|:---:|:---|:---:|:---:|
| **Khẩn cấp (P1 - Critical)** | Toàn bộ hệ thống không thể truy cập, hoặc cơ sở dữ liệu bị tê liệt vào ngày chốt lương. | $\le$ **30 phút** | $\le$ **4 giờ** |
| **Cao (P2 - High)** | Chức năng tính lương hoặc xuất file Excel gặp lỗi, ảnh hưởng đến tiến độ phát lương. | $\le$ **2 giờ** | $\le$ **8 giờ** |
| **Trung bình (P3 - Medium)** | Một chức năng phụ bị lỗi (ví dụ: không hiển thị biểu đồ, lỗi giao diện nhỏ). | $\le$ **4 giờ** | $\le$ **24 giờ** |
| **Thấp (P4 - Low)** | Yêu cầu tư vấn nghiệp vụ, hướng dẫn sử dụng hoặc đề xuất tính năng mới. | $\le$ **8 giờ** | $\le$ **48 giờ** |

---

## 4. KÊNH TIẾP NHẬN HỖ TRỢ KỸ THUẬT (SUPPORT CHANNELS)

Khách hàng có thể liên hệ với Đội ngũ Hỗ trợ Kỹ thuật chuyên trách qua các kênh sau:
* **Hệ thống gửi phiếu yêu cầu (Helpdesk Portal):** `https://support.yourdomain.com`
* **Email tiếp nhận sự cố kỹ thuật:** `support@yourdomain.com`
* **Hotline hỗ trợ khẩn cấp 24/7:** `1900 xxxx` (Ưu tiên khách hàng gói Enterprise)
* **Nhóm Zalo hỗ trợ khách hàng ưu tiên:** Nhóm riêng dành cho Ban Giám đốc và Kế toán trưởng của từng doanh nghiệp.

---

## 5. CHÍNH SÁCH BÀN GIAO & XÓA DỮ LIỆU KHI CHẤM DỨT HỢP ĐỒNG (OFFBOARDING)

* Khi khách hàng dừng sử dụng dịch vụ, hệ thống chuyển sang trạng thái tạm khóa.
* Khách hàng được cung cấp quyền xuất toàn bộ dữ liệu nhân sự, lịch sử chấm công và bảng lương ra tệp tin tiêu chuẩn (Excel, JSON) trong thời hạn **30 ngày**.
* Hết thời hạn 30 ngày, hệ thống sẽ thực hiện tiêu hủy vĩnh viễn toàn bộ dữ liệu của khách hàng khỏi máy chủ theo đúng cam kết trong Nghị định 13/2023/NĐ-CP và Thỏa thuận xử lý dữ liệu (DPA).
