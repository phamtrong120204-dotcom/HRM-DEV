# DANH MỤC CÁC QUY TẮC NGHIỆP VỤ CẦN XÁC MINH VÀ CẢNH BÁO PHÁP LÝ (UNVERIFIED BUSINESS RULES & RISKS)

---

## 1. MỤC ĐÍCH TÀI LIỆU

Tài liệu này bóc tách toàn bộ các **giả định ngầm, công thức tính toán và căn cứ pháp lý** được tác giả Thầy Đạt Tin Học cài cắm trong file tham chiếu `Cham_cong_Tinh_luong_ThayDat_V3.html`. 

Là một kiến trúc sư hệ thống SaaS chuyên nghiệp, chúng ta **tuyệt đối không xem file mẫu là chân lý pháp lý tối hậu**. Mọi quy tắc ảnh hưởng đến nghĩa vụ thuế và bảo hiểm của doanh nghiệp phải được phân loại rõ: **điều đã xác minh, điều suy luận kỹ thuật và điều bắt buộc phải xác minh nghiệp vụ/pháp lý**.

---

## 2. MA TRẬN PHÂN TÍCH QUY TẮC NGHIỆP VỤ TỪ FILE THAM CHIẾU

| STT | Quy tắc nghiệp vụ trong file tham chiếu | Đoạn mã trong file HTML | Hiện trạng pháp lý tại Việt Nam | Rủi ro nếu áp dụng cứng | Đề xuất giải pháp kiến trúc |
| :---: | :--- | :--- | :--- | :--- | :--- |
| **1** | **Biểu thuế TNCN 5 bậc & Giảm trừ 15.5M / 6.2M** | Dòng 879-880, 1445-1447 | Đây là **Dự thảo Luật Thuế TNCN sửa đổi** dự kiến áp dụng từ kỳ thuế 2026. Luật hiện hành (Nghị quyết 954/2020/UBTVQH14) vẫn áp dụng mức **11.000.000 đ** (bản thân), **4.400.000 đ** (NPT) và biểu lũy tiến **7 bậc**. | **RẤT CAO:** Nếu khách hàng tính lương cho năm 2024 - 2025 hoặc luật chưa bấm thông qua, doanh nghiệp sẽ bị truy thu thuế và phạt chậm nộp thuế rất nặng! | **Kiến trúc Versioning:** Cung cấp sẵn cả 2 bộ biểu thuế trong cơ sở dữ liệu. Hệ thống tự động căn cứ vào tháng tính lương (`yearMonth`) để kích hoạt đúng biểu thuế tương ứng, cho phép khách hàng tự chuyển đổi. |
| **2** | **Quy tắc miễn trừ bảo hiểm khi nghỉ không lương từ 14 ngày (`kl >= 14`)** | Dòng 963: `const noBH = a.kl >= 14 \|\| !e.luongBH;` | Căn cứ **Khoản 3 Điều 85 Luật BHXH** và **Điều 42 Quyết định 595/QĐ-BHXH**: *"Người lao động không làm việc và không hưởng tiền lương từ 14 ngày làm việc trở lên trong tháng thì không đóng BHXH tháng đó."* | **TRUNG BÌNH:** Trong file mẫu, tác giả đếm tổng số ngày nghỉ theo lịch (`kl = KP + O + 0.5*N`), chứ không phân biệt chính xác là "14 ngày làm việc" hay "14 ngày lịch". | **Chuẩn hóa:** Hệ thống đếm chính xác số ngày làm việc bị nghỉ không lương (không tính ngày Chủ nhật/ngày nghỉ tuần trùng vào khoảng nghỉ) để so sánh với ngưỡng 14 ngày. |
| **3** | **Miễn thuế toàn bộ tiền làm thêm giờ (OT) từ 01/01/2026** | Dòng 960: `otMien = ym >= '2026-01' ? tienOT : round(luongGio * ot * (heSoOT - 1))` | Theo quy định hiện hành (**Thông tư 111/2013/TT-BTC**), **chỉ miễn phần tiền chênh lệch** cao hơn so với đơn giá ban ngày (tức là phần `heSoOT - 1`). Việc miễn 100% tiền OT là đề xuất trong dự thảo luật mới. | **CAO:** Doanh nghiệp sẽ kê khai thiếu thuế TNCN nếu cơ quan thuế địa phương chưa có hướng dẫn áp dụng miễn toàn bộ tiền OT. | Cung cấp tùy chọn cấu hình trong mục Cài đặt: `[x] Miễn thuế toàn bộ tiền OT` hoặc `[ ] Chỉ miễn phần chênh lệch vượt giờ theo Thông tư 111`. |
| **4** | **Phụ cấp thâm niên tự động nhân số năm công tác (`pcThamNien * namLam`)** | Dòng 948-951, 957: `const nam = namLam(e.ngayVao, ym); pcTN = nam * e.pcThamNien;` | Đây là quy chế nội bộ của doanh nghiệp, không phải luật định bắt buộc. | **THẤP:** Một số doanh nghiệp áp dụng phụ cấp thâm niên theo bậc (ví dụ: đủ 3 năm mới tăng, hoặc tối đa 5 năm thì dừng), chứ không nhân tuyến tính vô hạn. | Cho phép chọn hình thức tính thâm niên trong Cài đặt: Tuyến tính theo năm hoặc Bảng bậc thâm niên cố định. |
| **5** | **Điều kiện phụ cấp chuyên cần (`ccNghiToiDa`)** | Dòng 956-957: `duCC = a.has && nghi <= s.ccNghiToiDa;` | Quy chế thưởng nội bộ nhằm khuyến khích đi làm đầy đủ. File mẫu quy định nghỉ phép (`P`) và lễ (`L`) không bị tính là nghỉ, chỉ có nghỉ không lương (`KP`) và nghỉ ốm (`O`) mới bị tính. | **THẤP:** Mỗi doanh nghiệp có quy định khác nhau (ví dụ: có nơi nghỉ phép năm quá 1 ngày cũng trừ 50% chuyên cần). | Giữ nguyên trong Cài đặt nhóm A để khách hàng tự quyết định số ngày nghỉ tối đa được phép. |
| **6** | **Trần đóng BHXH, BHYT và BHTN** | Dòng 942-946: Trần 20 lần lương cơ sở (2.530.000 đ) và 20 lần lương tối thiểu vùng I (5.310.000 đ). | Phù hợp với **Nghị định 73/2024/NĐ-CP** và **Nghị định 74/2024/NĐ-CP** áp dụng tại vùng I (Hà Nội, TP.HCM...). | **TRUNG BÌNH:** Doanh nghiệp ở các tỉnh thuộc Vùng II, III, IV có mức lương tối thiểu vùng thấp hơn (Vùng II: 4.410.000 đ, Vùng III: 3.860.000 đ, Vùng IV: 3.450.000 đ). | Cho phép khách hàng chọn Vùng lương tối thiểu (Vùng I, II, III, IV) trong Cài đặt để tự động áp trần BHTN chính xác theo địa bàn. |
| **7** | **Làm tròn tiền tệ và số đọc thành chữ (`docSo`)** | Dòng 356, 392-410: `round = n => Math.round(+n \|\| 0)` | Hoàn toàn chính xác theo nguyên tắc kế toán Việt Nam: Tiền đồng (VND) không sử dụng số thập phân lẻ (xu, hào). | **KHÔNG CÓ RỦI RO:** Thuật toán đọc số thành chữ tiếng Việt trong file mẫu xử lý rất hoàn hảo các trường hợp "lẻ", "mươi", "mốt", "lăm", "tư". | Tái sử dụng nguyên vẹn thuật toán `docSo` cho phiếu lương và bảng in. |

---

## 3. CÁC CÂU HỎI QUYẾT ĐỊNH CẦN CHỦ DỰ ÁN XÁC NHẬN (DECISION POINTS)

Để đảm bảo hệ thống khi thương mại hóa vừa tuân thủ pháp luật vừa linh hoạt kinh doanh, Chủ dự án cần cho ý kiến định hướng về 3 vấn đề:

1. **Cơ chế chọn vùng lương tối thiểu:**  
   * *Đề xuất:* Thêm ô chọn Vùng hoạt động của doanh nghiệp (`Vùng I`, `Vùng II`, `Vùng III`, `Vùng IV`) trong phần Cài đặt Doanh nghiệp để tự động tính trần BHTN chính xác cho các công ty tại các tỉnh thành ngoài Hà Nội / TP.HCM.
2. **Xử lý thời điểm chuyển giao luật Thuế TNCN:**  
   * *Đề xuất:* Thiết lập mặc định hệ thống tự nhận diện: Nếu kỳ lương trước năm 2026 $\rightarrow$ Áp dụng biểu 7 bậc cũ (11M / 4.4M); Nếu kỳ lương từ tháng 01/2026 trở đi $\rightarrow$ Áp dụng biểu 5 bậc mới (15.5M / 6.2M) và cho phép người dùng bật/tắt thủ công trong Cài đặt nếu lộ trình áp dụng luật của Nhà nước thay đổi.
3. **Mô hình triển khai cho khách hàng lớn (On-Premise / Private Cloud):**  
   * *Đề xuất:* Nhờ kiến trúc Modular Monolith đóng gói bằng Docker, khi bán cho khách hàng yêu cầu dữ liệu riêng biệt không dùng chung đám mây SaaS, ta chỉ cần xuất một Docker Container độc lập bàn giao cho họ với giá bán bản quyền (Enterprise License).

---

## 4. HIỆN TRẠNG TRIỂN KHAI VÀ CƠ CHẾ BẢO VỆ PHÍA BACKEND (GIAI ĐOẠN 3)

Trong Giai đoạn 3, hệ thống backend đã thiết lập hàng rào kỹ thuật nghiêm ngặt (`Compliance Guards`) để bảo vệ an toàn cho doanh nghiệp:

1. **Phân tách trạng thái pháp lý (`StatutoryRuleStatus`):**
   * `STATUTORY_TAX_RULE_LEGACY_7_TIER`: Trạng thái `VERIFIED_ACTIVE` (Đã xác minh theo Nghị quyết 954/2020/UBTVQH14 & Thông tư 111/2013/TT-BTC). Giảm trừ bản thân: 11.000.000đ, NPT: 4.400.000đ, Miễn thuế OT: chỉ miễn phần chênh lệch vượt giờ (`PREMIUM_ONLY`).
   * `STATUTORY_TAX_RULE_PROPOSED_2026_5_TIER`: Trạng thái `UNVERIFIED_DRAFT` (Dự thảo chưa ban hành). Chỉ được sử dụng trong chế độ mô phỏng dự báo thu nhập.
2. **Cơ chế chốt chặn khóa sổ bảng lương (`assertRuleReadyForFinalLock`):**
   * Nếu người dùng cố tình chuyển trạng thái kỳ lương sang `LOCKED` (Khóa sổ) mà đang cấu hình áp dụng bộ quy tắc mang trạng thái `UNVERIFIED_DRAFT`, hệ thống backend **từ chối thực thi và trả về mã lỗi 400 kèm thông điệp cảnh báo tuân thủ pháp luật**.
   * Chỉ cho phép khóa sổ khi chuyển về bộ quy tắc `VERIFIED_ACTIVE` hoặc bật cờ `allowSimulation: true` (chế độ thử nghiệm).
3. **Chuẩn hóa thông số bảo hiểm xã hội theo văn bản pháp luật hiện hành:**
   * Mức lương cơ sở: Cập nhật chính thức **2.340.000 đ** theo Nghị định 73/2024/NĐ-CP (thay cho số liệu giả định 2.530.000 đ của file HTML tham chiếu). Trần đóng BHXH/BHYT = $20 \times 2.340.000 = 46.800.000$ đ.
   * Lương tối thiểu vùng I: Cập nhật chính thức **4.960.000 đ** theo Nghị định 74/2024/NĐ-CP (thay cho số liệu giả định 5.310.000 đ của file HTML tham chiếu). Trần đóng BHTN = $20 \times 4.960.000 = 99.200.000$ đ.
4. **Kiểm tra biên chính xác quy tắc 14 ngày nghỉ không lương (Luật BHXH):**
   * Nghỉ không lương 13 ngày $\rightarrow$ Vẫn trích đóng BHXH/BHYT/BHTN bình thường.
   * Nghỉ không lương từ 14 ngày làm việc trở lên $\rightarrow$ Tự động chuyển toàn bộ nghĩa vụ đóng bảo hiểm của cả Người lao động (10.5%) và Doanh nghiệp (23.5%) về 0 đ.

