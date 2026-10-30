# TERMS OF SERVICE (DRAFT) — ĐIỀU KHOẢN DỊCH VỤ B2B SAAS
**Dự án:** Phần mềm Quản trị Chấm công, Nhân sự & Tính lương B2B SaaS  
**Phiên bản:** 1.0.0-DRAFT  
**Ngày lập bản thảo:** 2026-10-25  
**Áp dụng:** Hợp đồng dịch vụ phần mềm trực tuyến giữa Nhà cung cấp và Khách hàng doanh nghiệp  

---

> [!WARNING]
> **THÔNG BÁO QUAN TRỌNG: ĐÂY LÀ BẢN NHÁP KỸ THUẬT CHỜ XEM XÉT (DRAFT PENDING LEGAL REVIEW)**  
> Bản thảo Điều khoản Dịch vụ này được xây dựng bởi Chuyên gia Phân tích Tuân thủ Kỹ thuật nhằm xác định phạm vi dịch vụ, quyền và nghĩa vụ kỹ thuật giữa hai bên. Văn bản này **chưa có hiệu lực pháp lý ràng buộc** và bắt buộc phải được Luật sư có thẩm quyền rà soát, bổ sung các điều khoản thương mại phù hợp với pháp luật Việt Nam trước khi ký kết chính thức với khách hàng.

---

## 1. ĐỊNH NGHĨA & PHẠM VI ÁP DỤNG

1. **"Nhà cung cấp":** Đơn vị sở hữu bản quyền, vận hành hạ tầng công nghệ và cung cấp giải pháp phần mềm B2B SaaS Chấm công & Tính lương.
2. **"Khách hàng":** Tổ chức, doanh nghiệp, hộ kinh doanh hoặc thể nhân đăng ký tài khoản và trả cước phí thuê bao để sử dụng Phần mềm phục vụ công tác quản lý nội bộ.
3. **"Dịch vụ Phần mềm (SaaS)":** Ứng dụng web trực tuyến được cung cấp qua mạng Internet, bao gồm các tính năng quản lý hồ sơ nhân sự, phân ca làm việc, chấm công, bảng tính lương, xuất báo cáo và các tiện ích liên quan.
4. **"Tài khoản Tổ chức (Tenant)":** Phân vùng dữ liệu logic riêng biệt được cấp phát độc quyền cho Khách hàng trên hạ tầng dùng chung của Nhà cung cấp.

---

## 2. CẤP QUYỀN SỬ DỤNG DỊCH VỤ (LICENSE GRANT)

1. **Phạm vi cấp quyền:** Nhà cung cấp cấp cho Khách hàng quyền sử dụng dịch vụ phần mềm có thời hạn, không độc quyền, không được chuyển nhượng và có thể hủy bỏ theo các điều khoản của Hợp đồng dịch vụ.
2. **Hạn chế sử dụng:** Khách hàng không được phép:
   - Dịch ngược (Reverse Engineer), can thiệp mã nguồn, giải mã hoặc cố ý phá vỡ cơ chế an ninh, cơ chế cô lập dữ liệu đa khách hàng của Phần mềm.
   - Bán lại, cho thuê lại (Sublicense / Resell) quyền truy cập dịch vụ cho bên thứ ba ngoài phạm vi tổ chức của mình khi chưa có sự đồng ý bằng văn bản của Nhà cung cấp.
   - Sử dụng Phần mềm để lưu trữ, truyền tải các nội dung vi phạm pháp luật, mã độc hoặc thực hiện các cuộc tấn công an ninh mạng.

---

## 3. PHÂN ĐỊNH TRÁCH NHIỆM GIỮA HAI BÊN (SHARED RESPONSIBILITY MODEL)

Nhằm đảm bảo tính minh bạch và công bằng, trách nhiệm giữa Nhà cung cấp phần mềm và Doanh nghiệp khách hàng được phân định rõ ràng như sau:

```
+-----------------------------------------------------------------------------+
| TRÁCH NHIỆM CỦA KHÁCH HÀNG (DOANH NGHIỆP)                                   |
| - Tính đúng đắn của dữ liệu nhân viên, ngày công, số giờ làm thêm (OT)      |
| - Quyết định và cài đặt chính sách lương, phụ cấp, thưởng nội bộ            |
| - Thu thập sự đồng ý (Consent) của người lao động theo Nghị định 13/2023    |
| - Phê duyệt, kiểm tra và chốt sổ kỳ lương (Phê duyệt kết quả cuối cùng)     |
| - Quản lý tài khoản, mật khẩu và phân quyền vai trò nội bộ                  |
+-----------------------------------------------------------------------------+
| TRÁCH NHIỆM CỦA NHÀ CUNG CẤP (SAAS PROVIDER)                                |
| - Tính toán chính xác theo đúng công thức & cấu hình mà khách hàng đã chọn  |
| - Đảm bảo tính sẵn sàng của hạ tầng (Cam kết SLA 99.5% Uptime)              |
| - Cô lập dữ liệu tuyệt đối giữa các tổ chức (Multi-Tenant Isolation)        |
| - Bảo vệ dữ liệu cá nhân (Che mờ CCCD, mã hóa đường truyền, chống tấn công) |
| - Hỗ trợ kỹ thuật, sao lưu dữ liệu và khắc phục sự cố hệ thống              |
+-----------------------------------------------------------------------------+
```

### 3.1. Trách nhiệm cụ thể của Khách hàng:
* **Dữ liệu đầu vào:** Khách hàng chịu trách nhiệm toàn bộ về tính chính xác, hợp pháp của thông tin nhân sự, số ngày công, giờ check-in/out, mức lương thỏa thuận và số lượng người phụ thuộc.
* **Căn cứ pháp lý nội bộ:** Khách hàng tự xác định và chịu trách nhiệm về thang bảng lương, nội quy lao động, quy chế thưởng và thỏa ước lao động tập thể của đơn vị mình.
* **Quy trình duyệt lương:** Phần mềm là công cụ hỗ trợ tính toán tự động. **Người có thẩm quyền của Khách hàng (Giám đốc, Kế toán trưởng) có trách nhiệm kiểm tra lại bảng tính chi tiết trước khi bấm "Phê duyệt" hoặc "Khóa sổ" để chi trả tiền cho người lao động.**
* **Tuân thủ Nghị định 13/2023/NĐ-CP:** Khách hàng phải có sự chấp thuận bằng văn bản của người lao động trước khi tải thông tin cá nhân (CCCD, STK, mức lương) lên hệ thống.

### 3.2. Trách nhiệm cụ thể của Nhà cung cấp:
* **Độ chính xác của thuật toán:** Đảm bảo hệ số, tỷ lệ phần trăm bảo hiểm, biểu thuế lũy tiến và các phép tính số học được thực thi chính xác, nhất quán theo đúng các quy tắc mà Khách hàng đã cấu hình trong trang Cài đặt.
* **An toàn hạ tầng & Bảo mật:** Áp dụng các tiêu chuẩn an ninh cao cấp (chống tấn công Path Traversal, tự động che mờ CCCD/STK, chặn truy cập trái phép chéo tổ chức).
* **Cam kết mức độ dịch vụ (SLA):** Đảm bảo hệ thống hoạt động ổn định với thời gian khả dụng (Uptime) tối thiểu **99.5%** mỗi tháng, ngoại trừ các đợt bảo trì định kỳ có thông báo trước ít nhất 24 giờ.

---

## 4. GIỚI HẠN TRÁCH NHIỆM PHÁP LÝ (LIMITATION OF LIABILITY)

1. **Miễn trừ đối với tranh chấp lao động nội bộ:** Nhà cung cấp không phải là một bên trong quan hệ lao động giữa Khách hàng và nhân viên của Khách hàng. Nhà cung cấp không chịu trách nhiệm đối với bất kỳ khiếu nại, tranh chấp lao động, khiếu kiện tiền lương hoặc đình công nào phát sinh giữa Khách hàng và người lao động.
2. **Miễn trừ đối với tiền phạt thuế & xử phạt hành chính:** Nhà cung cấp không chịu trách nhiệm đối với bất kỳ khoản tiền phạt vi phạm hành chính, tiền truy thu thuế hoặc tiền phạt chậm đóng bảo hiểm nào phát sinh từ việc Khách hàng nhập sai dữ liệu, cấu hình sai tỷ lệ đóng hoặc tự ý áp dụng các quy tắc thuế đang ở dạng **Mô phỏng dự thảo (`UNVERIFIED_DRAFT`)** thay cho quy định pháp luật chính thức.
3. **Mức bồi thường thiệt hại tối đa (Liability Cap):** Trong mọi trường hợp xảy ra sự cố kỹ thuật hoặc vi phạm nghĩa vụ hợp đồng do lỗi trực tiếp của Nhà cung cấp, tổng mức bồi thường thiệt hại thực tế tối đa mà Nhà cung cấp phải chi trả cho Khách hàng **sẽ không vượt quá tổng số tiền cước dịch vụ mà Khách hàng đã thực tế thanh toán cho Nhà cung cấp trong vòng ba (03) tháng gần nhất** tính đến thời điểm phát sinh sự kiện gây thiệt hại.
4. **Loại trừ thiệt hại gián tiếp:** Nhà cung cấp không chịu trách nhiệm đối với các thiệt hại gián tiếp, thiệt hại do mất cơ hội kinh doanh, mất uy tín, mất lợi nhuận hoặc thiệt hại vô hình phát sinh từ việc gián đoạn dịch vụ.

---

## 5. CƯỚC PHÍ, GIA HẠN & TẠM ĐÌNH CHỈ DỊCH VỤ (SUSPENSION)

1. **Thanh toán cước:** Khách hàng thanh toán phí thuê bao theo tháng hoặc theo năm theo biểu giá niêm yết tại thời điểm đăng ký hoặc gia hạn.
2. **Tạm đình chỉ dịch vụ (Suspension):** Nhà cung cấp có quyền tạm khóa quyền truy cập vào tài khoản tổ chức (`isActive = false`) trong các trường hợp sau:
   - Khách hàng quá hạn thanh toán cước phí quá 07 ngày làm việc kể từ ngày đến hạn.
   - Phát hiện dấu hiệu tài khoản bị chiếm đoạt hoặc có hành vi phát tán mã độc, tấn công hệ thống an ninh.
   - Có yêu cầu bằng văn bản của cơ quan nhà nước có thẩm quyền tại Việt Nam.
3. **Chấm dứt dịch vụ & Bàn giao dữ liệu:**
   - Khi hợp đồng chấm dứt, Khách hàng được quyền tải về toàn bộ dữ liệu (Excel/JSON) trong thời hạn **30 ngày**.
   - Hết thời hạn 30 ngày, Nhà cung cấp sẽ thực hiện xóa vĩnh viễn dữ liệu của Khách hàng để giải phóng tài nguyên và bảo vệ quyền riêng tư theo đúng quy định pháp luật.

---

## 6. LUẬT ÁP DỤNG & GIẢI QUYẾT TRANH CHẤP

1. **Luật áp dụng:** Các Điều khoản Dịch vụ này được điều chỉnh và giải thích hoàn toàn theo quy định của pháp luật nước Cộng hòa Xã hội Chủ nghĩa Việt Nam.
2. **Phương thức giải quyết tranh chấp:**
   - Mọi tranh chấp, bất đồng phát sinh từ hoặc liên quan đến Hợp đồng này trước hết sẽ được giải quyết thông qua thương lượng, hòa giải trên tinh thần thiện chí và hợp tác giữa hai bên.
   - Nếu tranh chấp không thể giải quyết bằng thương lượng trong vòng ba mươi (30) ngày kể từ ngày phát sinh, một trong hai bên có quyền đưa vụ việc ra giải quyết tại **Tòa án nhân dân có thẩm quyền tại Việt Nam** hoặc **Trung tâm Trọng tài Quốc tế Việt Nam (VIAC)** theo sự lựa chọn trong hợp đồng chính thức.
