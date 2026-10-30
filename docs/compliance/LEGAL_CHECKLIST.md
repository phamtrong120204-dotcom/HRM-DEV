# LEGAL CHECKLIST — DANH MỤC RÀ SOÁT PHÁP LÝ & ĐIỀU KIỆN KINH DOANH SAAS TẠI VIỆT NAM
**Dự án:** Phần mềm Quản trị Chấm công, Nhân sự & Tính lương B2B SaaS  
**Phiên bản tài liệu:** 1.0.0  
**Ngày lập:** 2026-10-25  
**Phạm vi áp dụng:** Triển khai thương mại hóa dịch vụ phần mềm B2B SaaS tại thị trường Việt Nam  
**Lưu ý quan trọng:** Tài liệu này được lập bởi Chuyên gia Phân tích Tuân thủ Kỹ thuật (SaaS Compliance Analyst) nhằm mục đích rà soát kỹ thuật và chuẩn bị điều kiện kinh doanh; **không thay thế văn bản tư vấn pháp lý chính thức từ Luật sư hoặc Công ty Luật có thẩm quyền**.

---

## 1. CĂN CỨ PHÁP LÝ HIỆN HÀNH TẠI VIỆT NAM (TÍNH ĐẾN 2026)

Hệ thống B2B SaaS Chấm công & Tính lương vận hành tại Việt Nam chịu sự điều chỉnh trực tiếp của các văn bản quy phạm pháp luật sau:

1. **Bảo vệ dữ liệu cá nhân:**
   - **Nghị định số 13/2023/NĐ-CP** ngày 17/04/2023 của Chính phủ về bảo vệ dữ liệu cá nhân (có hiệu lực từ 01/07/2023).
2. **An ninh mạng & Lưu trữ dữ liệu:**
   - **Luật An ninh mạng số 24/2018/QH14** ngày 12/06/2018.
   - **Nghị định số 53/2022/NĐ-CP** ngày 15/08/2022 của Chính phủ quy định chi tiết một số điều của Luật An ninh mạng (Quy định về lưu trữ dữ liệu tại Việt Nam).
3. **Lao động & Tiền lương:**
   - **Bộ luật Lao động số 45/2019/QH14** ngày 20/11/2019 (có hiệu lực từ 01/01/2021).
   - **Nghị định số 145/2020/NĐ-CP** ngày 14/12/2020 quy định chi tiết thi hành Bộ luật Lao động về điều kiện lao động và quan hệ lao động.
4. **Bảo hiểm xã hội bắt buộc:**
   - **Luật Bảo hiểm xã hội số 58/2014/QH13** và **Luật Bảo hiểm xã hội số 41/2024/QH15** (được Quốc hội thông qua ngày 29/06/2024, có hiệu lực từ 01/07/2025).
   - **Luật Việc làm số 38/2013/QH13** và **Luật An toàn, vệ sinh lao động số 84/2015/QH13**.
5. **Thuế thu nhập cá nhân:**
   - **Luật Thuế thu nhập cá nhân số 04/2007/QH12** (sửa đổi, bổ sung qua các năm).
   - **Nghị quyết số 954/2020/UBTVQH14** ngày 02/06/2020 về điều chỉnh mức giảm trừ gia cảnh thuế TNCN (11 triệu đồng/tháng cho bản thân và 4.4 triệu đồng/tháng cho mỗi người phụ thuộc).
   - *Lưu ý dự thảo:* Đề xuất sửa đổi Luật Thuế TNCN (biểu thuế 5 bậc và điều chỉnh mức giảm trừ gia cảnh) hiện tại **vẫn đang ở dạng dự thảo lấy ý kiến, chưa có hiệu lực thi hành**.
6. **Thương mại điện tử & Giao dịch điện tử:**
   - **Nghị định số 52/2013/NĐ-CP** và **Nghị định số 85/2021/NĐ-CP** về thương mại điện tử (Nghĩa vụ thông báo/đăng ký website/ứng dụng cung cấp dịch vụ).
   - **Luật Giao dịch điện tử số 20/2023/QH15** (có hiệu lực từ 01/07/2024) về giá trị pháp lý của chứng từ và dữ liệu điện tử.

---

## 2. BẢNG THEO DÕI TUÂN THỦ PHÁP LÝ (LEGAL COMPLIANCE CHECKLIST)

| STT | Nhóm vấn đề | Nội dung yêu cầu cụ thể | Căn cứ pháp lý | Tình trạng kỹ thuật | Trạng thái pháp lý | Hành động bắt buộc cần thực hiện |
|:---:|:---|:---|:---|:---:|:---:|:---|
| **1** | **Bảo vệ dữ liệu cá nhân (PDPD)** | Phân định rõ vai trò Bên Kiểm soát (Data Controller) và Bên Xử lý (Data Processor). | Điều 2, Điều 39 NĐ 13/2023/NĐ-CP | **Đã hoàn thành** (Thiết kế kiến trúc) | Cần ký DPA | Ký Thỏa thuận xử lý dữ liệu (DPA) với từng doanh nghiệp khách hàng. |
| **2** | **Bảo vệ dữ liệu cá nhân (PDPD)** | Người lao động phải đồng ý (Consent) cho doanh nghiệp đưa thông tin lên phần mềm. | Điều 9, Điều 11 NĐ 13/2023/NĐ-CP | **Đã hỗ trợ** (Cung cấp mẫu) | Khách hàng chịu trách nhiệm | Yêu cầu khách hàng thu thập chữ ký/sự đồng ý của nhân viên trước khi import dữ liệu. |
| **3** | **Bảo vệ dữ liệu cá nhân (PDPD)** | Lập Hồ sơ đánh giá tác động xử lý dữ liệu cá nhân (DPIA) gửi Bộ Công an. | Điều 24 NĐ 13/2023/NĐ-CP | Chưa áp dụng | **Bắt buộc gửi Cục A05** | Thuê luật sư tư vấn soạn thảo và nộp hồ sơ DPIA cho Cục An ninh mạng (A05) trong 60 ngày kể từ khi bắt đầu xử lý dữ liệu. |
| **4** | **Bảo vệ dữ liệu cá nhân (PDPD)** | Thông báo vi phạm dữ liệu cá nhân (Data Breach) cho Cục A05 trong 72 giờ. | Điều 23 NĐ 13/2023/NĐ-CP | **Đã có quy trình kỹ thuật** | Cần phê duyệt | Ban hành quy trình nội bộ về ứng phó sự cố an ninh thông tin và đầu mối liên hệ A05. |
| **5** | **Che mờ & Bảo vệ dữ liệu nhạy cảm** | Che mờ số CCCD và Số tài khoản ngân hàng đối với nhân sự không có thẩm quyền. | Điều 26 NĐ 13/2023/NĐ-CP | **Đã hoàn thành 100%** (`securitySanitizer.ts`) | **Đạt chuẩn** | Duy trì kiểm thử hồi quy tự động. |
| **6** | **Chủ quyền & Lưu trữ dữ liệu** | Dữ liệu cá nhân của công dân Việt Nam phải được lưu trữ trên lãnh thổ Việt Nam. | Điều 26 Luật ANM 2018; Điều 26 NĐ 53/2022/NĐ-CP | Cần chọn Region máy chủ | **Bắt buộc tuân thủ** | Khi đưa lên Production, thuê máy chủ đám mây đặt tại Việt Nam (Viettel IDC, VNPT, FPT Cloud) hoặc chọn Datacenter VN. |
| **7** | **Quy tắc làm thêm giờ & Phép năm** | Tính tiền làm thêm giờ (150% ngày thường, 200% ngày nghỉ tuần, 300% ngày lễ tết); quản lý ngày phép năm. | Điều 98, Điều 113 BLLĐ 2019 | **Đã hoàn thành 100%** (Payroll Engine) | **Đạt chuẩn** | Cung cấp tài liệu hướng dẫn công thức tính cho doanh nghiệp. |
| **8** | **Quy tắc Bảo hiểm xã hội** | Tỷ lệ trích đóng NLĐ (8% BHXH, 1.5% BHYT, 1% BHTN); giới hạn trần đóng 20 lần mức lương cơ sở; quy tắc nghỉ $\ge 14$ ngày không lương thì không đóng bảo hiểm. | Luật BHXH 2014 & Luật BHXH 2024 (từ 01/07/2025) | **Đã hoàn thành 100%** (Payroll Engine) | **Đạt chuẩn** | Cung cấp bảng cấu hình tham số lương cơ sở linh hoạt trong cài đặt để thích ứng khi Nhà nước đổi mức lương. |
| **9** | **Quy tắc Thuế TNCN hiện hành** | Áp dụng Biểu thuế lũy tiến từng phần 7 bậc và mức giảm trừ 11 triệu (bản thân) + 4.4 triệu (người phụ thuộc). | Luật Thuế TNCN & NQ 954/2020/UBTVQH14 | **Đã hoàn thành 100%** (Mặc định chính thức) | **Đạt chuẩn** | Đặt làm cấu hình mặc định (Production Default). |
| **10** | **Quy tắc Thuế TNCN thử nghiệm** | Biểu thuế 5 bậc và giảm trừ 15.5 triệu / 5.5 triệu theo đề xuất dự thảo. | Dự thảo Luật Thuế TNCN (Chưa có hiệu lực) | **Đã có cờ cảnh báo** (`UNVERIFIED_DRAFT`) | **Không dùng cho chốt lương chính thức** | Bắt buộc hiển thị nhãn cảnh báo "Mô phỏng dự thảo — Không sử dụng cho quyết toán thuế thực tế" và chặn khóa sổ nếu chưa có phê duyệt đặc biệt. |
| **11** | **Đăng ký Website/Dịch vụ với Bộ Công Thương** | Đăng ký hoặc thông báo website/ứng dụng cung cấp dịch vụ trực tuyến với Bộ Công Thương. | NĐ 52/2013/NĐ-CP & NĐ 85/2021/NĐ-CP | Chưa đăng ký | **Bắt buộc trước khi bán hàng** | Nộp hồ sơ thông báo website TMĐT bán hàng hoặc sàn giao dịch TMĐT tại Cổng thông tin Quản lý hoạt động TMĐT (`online.gov.vn`). |
| **12** | **Cổng thanh toán & Hóa đơn điện tử** | Cung cấp hóa đơn điện tử hợp pháp cho khách hàng mua gói dịch vụ SaaS; tích hợp thanh toán nội địa. | Nghị định 123/2020/NĐ-CP & Thông tư 78/2021/TT-BTC | Cần bổ sung cổng VN | **Bắt buộc** | Kết nối cổng thanh toán Việt Nam (VietQR, PayOS, VNPAY) và tích hợp giải pháp xuất hóa đơn điện tử (VNPT, Viettel, MISA meInvoice). |
| **13** | **Điều khoản dịch vụ & Giới hạn trách nhiệm** | Giới hạn trách nhiệm pháp lý trong trường hợp khách hàng cấu hình sai hoặc tranh chấp lao động nội bộ. | Bộ luật Dân sự 2015 | **Đã có bản thảo** (`TERMS_OF_SERVICE_DRAFT.md`) | **Cần Luật sư duyệt** | Gửi bản thảo ToS cho đơn vị tư vấn luật hiệu chỉnh và phê chuẩn. |
| **14** | **Bàn giao & Xóa dữ liệu** | Cho phép khách hàng xuất toàn bộ dữ liệu (Excel/JSON) và cam kết xóa sạch sau khi hủy dịch vụ. | Quyền của Chủ thể dữ liệu (NĐ 13/2023) | **Đã hoàn thành** (Tính năng Export & Backup) | **Đạt chuẩn** | Quy định rõ thời gian lưu trữ tối đa (30 ngày) sau khi kết thúc hợp đồng trước khi hủy vĩnh viễn. |

---

## 3. CÁC NỘI DUNG CẦN TƯ VẤN CHUYÊN SÂU TỪ LUẬT SƯ & CHUYÊN GIA

Trước khi chính thức mở bán hoặc ký hợp đồng dịch vụ đầu tiên với khách hàng, Chủ dự án cần chủ động thực hiện 4 bước làm việc chuyên nghiệp sau:

1. **Tư vấn Luật sư chuyên ngành Công nghệ & An ninh mạng (Tech & Cyber Law Firm):**
   - Rà soát bản thảo **Điều khoản Dịch vụ (Terms of Service)** và **Thỏa thuận Xử lý Dữ liệu (Data Processing Agreement - DPA)**.
   - Hoàn thiện hồ sơ Đánh giá tác động xử lý dữ liệu cá nhân (DPIA) theo Mẫu số 04 và 06 ban hành kèm theo Nghị định 13/2023/NĐ-CP để gửi Cục An ninh mạng và phòng, chống tội phạm sử dụng công nghệ cao (A05) - Bộ Công an.
2. **Tư vấn Chuyên gia Kế toán - Thuế & Lao động (CPA / Labor Legal Advisor):**
   - Kiểm tra chéo quy trình khấu trừ phụ cấp ăn trưa (mức 730.000 VNĐ theo Thông tư 26/2015/TT-BTC), phụ cấp điện thoại, xăng xe để đảm bảo không bị cơ quan Thuế xuất toán khi doanh nghiệp khách hàng quyết toán thuế.
   - Thẩm định lại tính hợp lệ của việc lưu trữ phiếu lương điện tử theo Luật Giao dịch điện tử 2023 thay thế cho phiếu lương giấy truyền thống.
3. **Thực hiện thủ tục Hành chính với Bộ Công Thương:**
   - Thực hiện thủ tục thông báo website thương mại điện tử với Bộ Công Thương tại địa chỉ `http://online.gov.vn` để được gắn logo xanh (Đã thông báo Bộ Công Thương), tránh mức xử phạt vi phạm hành chính từ 10.000.000 đến 20.000.000 VNĐ theo Nghị định 98/2020/NĐ-CP.
4. **Hợp tác với Đơn vị cung cấp Hạ tầng Máy chủ trong nước:**
   - Lựa chọn nhà cung cấp dịch vụ Cloud có chứng nhận ISO 27001 và đặt cụm máy chủ tại Hà Nội hoặc TP. Hồ Chí Minh để đảm bảo 100% tuân thủ yêu cầu về lưu trữ dữ liệu người dùng Việt Nam theo Luật An ninh mạng.

---

## 4. KẾT LUẬN

Hệ thống đã đạt sự sẵn sàng kỹ thuật cao đối với các yêu cầu cốt lõi của pháp luật lao động, bảo hiểm và an toàn dữ liệu. Tuy nhiên, các thủ tục hành chính nhà nước (A05, Bộ Công Thương, Thuế) và văn bản pháp lý hợp đồng cần có sự tham gia của chuyên gia pháp chế độc lập trước khi sản phẩm chính thức xuất hóa đơn thương mại.
