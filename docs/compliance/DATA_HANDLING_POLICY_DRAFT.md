# DATA HANDLING POLICY (DRAFT) — CHÍNH SÁCH XỬ LÝ & BẢO VỆ DỮ LIỆU
**Dự án:** Phần mềm Quản trị Chấm công, Nhân sự & Tính lương B2B SaaS  
**Phiên bản:** 1.0.0-DRAFT  
**Ngày lập bản thảo:** 2026-10-25  
**Căn cứ pháp lý:** Nghị định số 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân  

---

> [!WARNING]
> **THÔNG BÁO QUAN TRỌNG: ĐÂY LÀ BẢN NHÁP KỸ THUẬT CHỜ XEM XÉT (DRAFT PENDING LEGAL REVIEW)**  
> Bản thảo này do chuyên viên phân tích an ninh & tuân thủ kỹ thuật lập nhằm mục đích chuẩn bị quy trình xử lý dữ liệu theo thiết kế hệ thống. Tài liệu **chưa có giá trị pháp lý chính thức** và bắt buộc phải được Luật sư hoặc Chuyên gia pháp chế doanh nghiệp rà soát, hiệu chỉnh và ký duyệt trước khi ban hành áp dụng chính thức cho khách hàng.

---

## 1. MỤC ĐÍCH & PHẠM VI ÁP DỤNG

Chính sách này quy định các nguyên tắc, biện pháp kỹ thuật và quy trình xử lý dữ liệu cá nhân của người lao động được thu thập, lưu trữ và tính toán trên nền tảng phần mềm Quản trị Chấm công & Tính lương đa doanh nghiệp (sau đây gọi tắt là "Hệ thống" hoặc "Phần mềm").

Chính sách này áp dụng đối với:
* **Đơn vị cung cấp nền tảng SaaS:** Đơn vị sở hữu và vận hành hạ tầng phần mềm.
* **Doanh nghiệp khách hàng:** Các tổ chức, công ty thuê bao dịch vụ phần mềm để quản lý nhân sự.
* **Người dùng hệ thống:** Người quản trị, kế toán, nhân viên nhân sự và người lao động của doanh nghiệp khách hàng.

---

## 2. XÁC ĐỊNH VAI TRÒ THEO NGHỊ ĐỊNH 13/2023/NĐ-CP

Nhằm đảm bảo tuân thủ nghiêm ngặt quy định tại Điều 2 và Điều 39 Nghị định 13/2023/NĐ-CP, vai trò của các bên được phân định rõ ràng như sau:

### 2.1. Doanh nghiệp khách hàng — Bên Kiểm soát dữ liệu cá nhân (Data Controller)
* Doanh nghiệp khách hàng là bên trực tiếp ký kết hợp đồng lao động với người lao động và quyết định mục đích, phương thức xử lý thông tin nhân sự.
* **Trách nhiệm của khách hàng:**
  - Thu thập sự đồng ý hợp lệ (Consent) của người lao động trước khi tải thông tin cá nhân lên Phần mềm.
  - Đảm bảo tính chính xác, hợp pháp của dữ liệu nhân sự, mức lương và ngày công.
  - Chịu trách nhiệm trực tiếp đối với các yêu cầu, khiếu nại của người lao động liên quan đến việc xử lý dữ liệu cá nhân theo quan hệ lao động.

### 2.2. Nhà cung cấp nền tảng SaaS — Bên Xử lý dữ liệu cá nhân (Data Processor)
* Nhà cung cấp nền tảng SaaS chỉ thực hiện việc lưu trữ, tính toán, kết xuất và xử lý dữ liệu cá nhân **theo đúng thỏa thuận dịch vụ và chỉ thị kỹ thuật của Doanh nghiệp khách hàng**.
* **Cam kết của nhà cung cấp:**
  - Không tự ý sử dụng dữ liệu của khách hàng cho bất kỳ mục đích nào khác (không bán dữ liệu, không chia sẻ cho bên thứ ba vì mục đích quảng cáo/thương mại).
  - Triển khai các biện pháp bảo vệ kỹ thuật và an ninh mạng ở mức tối đa để ngăn ngừa lộ lọt, mất mát hoặc truy cập trái phép.
  - Phối hợp với Doanh nghiệp khách hàng để đáp ứng các quyền của chủ thể dữ liệu (người lao động).

---

## 3. PHÂN LOẠI DỮ LIỆU CÁ NHÂN ĐƯỢC XỬ LÝ TRÊN HỆ THỐNG

### 3.1. Dữ liệu cá nhân cơ bản (Basic Personal Data)
1. **Thông tin định danh:** Họ và tên, giới tính, ngày tháng năm sinh, ảnh đại diện.
2. **Thông tin liên lạc:** Số điện thoại, địa chỉ email, địa chỉ thường trú/tạm trú.
3. **Thông tin công việc:** Mã nhân viên, phòng ban, chức vụ, ngày bắt đầu làm việc, trạng thái làm việc (Đang làm, Thử việc, Đã nghỉ việc), loại hợp đồng lao động.

### 3.2. Dữ liệu cá nhân nhạy cảm (Sensitive Personal Data)
1. **Số định danh cá nhân:** Số Căn cước công dân (CCCD), Chứng minh nhân dân (CMND), Hộ chiếu.
2. **Thông tin tài chính:** Số tài khoản ngân hàng, tên ngân hàng chi nhánh, Mã số thuế cá nhân.
3. **Dữ liệu thu nhập & Tiền lương:** Lương cơ bản, hệ số lương, các khoản phụ cấp, tiền thưởng, các khoản khấu trừ bảo hiểm và thuế TNCN, phiếu lương chi tiết từng tháng.
4. **Dữ liệu vận hành & Giám sát:** Lịch sử chấm công (giờ vào/ra), đơn từ xin nghỉ ốm/nghỉ thai sản/nghỉ phép, dữ liệu địa điểm chấm công (nếu bật định vị GPS).

---

## 4. BIỆN PHÁP BẢO VỆ DỮ LIỆU KỸ THUẬT ĐÃ TRIỂN KHAI

Hệ thống được thiết kế theo nguyên tắc "Bảo vệ dữ liệu ngay từ khâu thiết kế" (Privacy by Design) với các tầng kiểm soát kỹ thuật nghiêm ngặt:

1. **Cô lập dữ liệu đa doanh nghiệp (Multi-Tenant Isolation):**
   - Áp dụng tầng truy cập dữ liệu tập trung `TenantScopedRepository`. Mọi truy vấn đọc/ghi đều bị ép buộc điều kiện `tenantId`.
   - Ngăn chặn tuyệt đối tình trạng rò rỉ dữ liệu giữa các công ty khách hàng (chống tấn công BOLA/IDOR).
2. **Tự động che mờ dữ liệu định danh nhạy cảm (Automated PII Masking):**
   - Tích hợp module `securitySanitizer.ts`: Tự động che mờ số CCCD (`001******456`) và Số tài khoản ngân hàng (`**********6778`) đối với người dùng có vai trò nhân viên thông thường (`EMPLOYEE`).
   - Chỉ có các vai trò có thẩm quyền được ủy quyền hợp pháp (Giám đốc `ORG_OWNER`, Quản trị viên `ORG_ADMIN`, Kế toán lương `ACCOUNTANT`) mới có thể xem số đầy đủ để phục vụ thanh toán lương và báo cáo thuế.
3. **Mã hóa dữ liệu (Encryption):**
   - **Mã hóa khi truyền tải (In-Transit):** Toàn bộ lưu lượng truyền tải giữa trình duyệt người dùng và máy chủ đều được mã hóa bằng giao thức TLS 1.3 / HTTPS với chứng chỉ bảo mật cao cấp.
   - **Mã hóa khi lưu trữ (At-Rest):** Cơ sở dữ liệu và hệ thống lưu trữ tệp tin đám mây được kích hoạt mã hóa tiêu chuẩn công nghiệp (AES-256).
4. **Phân quyền truy cập theo vai trò (Role-Based Access Control - RBAC):**
   - Kiểm soát nghiêm ngặt thẩm quyền đọc, thêm, sửa, xóa, duyệt và khóa sổ lương theo 5 cấp độ vai trò: `ORG_OWNER`, `ORG_ADMIN`, `HR_MANAGER`, `ACCOUNTANT`, `EMPLOYEE`.
5. **Nhật ký kiểm toán an ninh (Audit Trail):**
   - Mọi hành vi nhạy cảm (Duyệt bảng lương, khóa sổ kỳ lương, xuất báo cáo nhân sự, thay đổi cấu hình bảo mật) đều được ghi nhận vĩnh viễn vào bảng `AuditLog` với đầy đủ thông tin: Mã người thực hiện, thời gian chính xác, địa chỉ IP và nội dung thay đổi.
6. **Kiểm soát tải lên tệp tin & Phòng chống Path Traversal:**
   - Bộ lọc `validateUploadedFileName` đảm bảo chỉ các định dạng bảng tính an toàn (`.xlsx`, `.xls`, `.csv`) mới được chấp nhận; ngăn chặn hoàn toàn việc chèn mã độc hoặc ghi đè file hệ thống.

---

## 5. VÒNG ĐỜI DỮ LIỆU (DATA LIFECYCLE & RETENTION)

```
[ Thu thập dữ liệu ] ---> [ Lưu trữ an toàn ] ---> [ Tính toán & Kê khai ]
                                                           |
[ Xóa vĩnh viễn ]   <--- [ Lưu trữ tạm thời ] <--- [ Bàn giao & Xuất file ]
  (Sau 30 ngày hủy dịch vụ)  (Thời hạn cam kết)     (Excel / JSON)
```

1. **Thu thập (Collection):** Dữ liệu được nạp vào hệ thống thông qua giao diện nhập liệu hoặc file Excel mẫu do Doanh nghiệp khách hàng tự tải lên.
2. **Lưu trữ & Sao lưu (Storage & Backup):** Dữ liệu được lưu trữ trên hạ tầng máy chủ đạt tiêu chuẩn bảo mật. Hệ thống tự động tạo các bản sao lưu (Backup snapshot) định kỳ để phòng ngừa sự cố thảm họa.
3. **Quyền mang theo dữ liệu (Data Portability):** Doanh nghiệp khách hàng có toàn quyền xuất (Export) toàn bộ dữ liệu nhân sự, lịch sử chấm công và bảng lương ra định dạng tệp tin tiêu chuẩn (Excel, CSV, JSON) vào bất kỳ thời điểm nào trong thời gian thuê bao.
4. **Hủy dịch vụ & Xóa dữ liệu (Right to Erasure & Deletion):**
   - Khi Doanh nghiệp khách hàng chấm dứt hợp đồng dịch vụ, hệ thống chuyển sang trạng thái tạm khóa (`isActive = false`).
   - Doanh nghiệp có thời hạn **30 ngày** để tải về toàn bộ dữ liệu lưu trữ.
   - Hết thời hạn 30 ngày, Nhà cung cấp sẽ tiến hành xóa vĩnh viễn dữ liệu của tổ chức khỏi cơ sở dữ liệu chính và các bản sao lưu theo đúng quy trình tiêu hủy an toàn.

---

## 6. QUY TRÌNH ỨNG PHÓ & THÔNG BÁO SỰ CỐ DỮ LIỆU (DATA BREACH NOTIFICATION)

Nhà cung cấp thiết lập quy trình phản ứng khẩn cấp đối với các sự cố an toàn thông tin theo Điều 23 Nghị định 13/2023/NĐ-CP:

1. **Phát hiện & Cô lập (Giờ 0 - Giờ 4):**
   - Khi hệ thống giám sát phát hiện dấu hiệu rò rỉ hoặc truy cập trái phép, đội ngũ kỹ thuật lập tức kích hoạt biện pháp cô lập phân vùng bị ảnh hưởng, thu hồi các phiên làm việc và đóng các cổng API liên quan.
2. **Thông báo cho Doanh nghiệp khách hàng (Trong vòng 24 giờ):**
   - Nhà cung cấp gửi văn bản và email thông báo chính thức cho người đại diện của Doanh nghiệp khách hàng bị ảnh hưởng, nêu rõ phạm vi dữ liệu bị tác động, nguyên nhân sơ bộ và biện pháp khắc phục đang triển khai.
3. **Phối hợp báo cáo cơ quan nhà nước có thẩm quyền (Trong vòng 72 giờ):**
   - Phối hợp cùng Doanh nghiệp khách hàng lập biên bản và gửi văn bản thông báo sự cố vi phạm quy định về bảo vệ dữ liệu cá nhân tới **Cục An ninh mạng và phòng, chống tội phạm sử dụng công nghệ cao (A05) - Bộ Công an** theo Mẫu quy định tại Nghị định 13/2023/NĐ-CP.
4. **Khắc phục & Đánh giá sau sự cố:**
   - Thực hiện vá lỗi bảo mật, cập nhật chữ ký rà quét, nâng cấp hệ thống phòng thủ và công bố Báo cáo tổng kết sự cố cho các bên liên quan.

---

## 7. ĐẦU MỐI LIÊN HỆ VỀ AN TOÀN DỮ LIỆU

Mọi yêu cầu hỗ trợ, phản ánh nguy cơ bảo mật hoặc thực thi quyền của chủ thể dữ liệu xin vui lòng gửi về:
* **Bộ phận An toàn thông tin & Tuân thủ dữ liệu (DPO / Security Team):**
* **Email tiếp nhận sự cố:** `dpo@yourdomain.com` / `security@yourdomain.com`
* **Hotline hỗ trợ kỹ thuật 24/7:** `1900 xxxx`
