# RELEASE CHECKLIST & READINESS GATE — BẢNG ĐIỀU KIỆN PHÁT HÀNH SẢN PHẨM
**Dự án:** Phần mềm Quản trị Chấm công, Nhân sự & Tính lương B2B SaaS  
**Phiên bản phát hành:** 1.0.0-RC1 (Release Candidate 1)  
**Ngày đánh giá:** 2026-10-25  
**Trưởng ban Đánh giá Phát hành:** Senior Release Engineer & SaaS Operations Lead  

---

## 1. KẾT LUẬN ĐÁNH GIÁ ĐIỀU KIỆN PHÁT HÀNH (RELEASE READINESS CLASSIFICATION)

Căn cứ vào kết quả kiểm thử thực tế và các rà soát đa chiều tại các giai đoạn từ GĐ0 đến GĐ7, Hội đồng kỹ thuật phân loại trạng thái phát hành của hệ thống là:

```
========================================================================================
XẾP HẠNG TRẠNG THÁI PHÁT HÀNH:
              >>> READY WITH CONDITIONS (SẴN SÀNG CÓ ĐIỀU KIỆN) <<<
========================================================================================
```

### Giải trình xếp hạng:
1. **Tại sao ĐỦ ĐIỀU KIỆN KỸ THUẬT (READY ON ENGINEERING):**
   - **Chất lượng mã nguồn:** Toàn bộ 61/61 ca kiểm thử tự động (Frontend, Backend, Multi-tenant Isolation, QA Regression, Security Pentest) đều vượt qua thành công (**100% PASS**).
   - **Cô lập dữ liệu đa doanh nghiệp:** Cơ chế `TenantScopedRepository` bảo vệ tuyệt đối, không có rò rỉ dữ liệu chéo giữa các tổ chức (BOLA/IDOR).
   - **An toàn thông tin:** 5/5 phát hiện an ninh (SEC-01 đến SEC-05) đã được khắc phục triệt để và tự động hóa kiểm chứng.
   - **Giấy phép mã nguồn mở:** 100% thư viện thuộc nhóm giấy phép Permissive (MIT, Apache-2.0, ISC). Không có rủi ro Copyleft.
2. **Các ĐIỀU KIỆN BẮT BUỘC ĐI KÈM (THE REQUIRED CONDITIONS):**
   - **Điều kiện 1 (Bản quyền tệp tham khảo):** Tệp tin `docs/reference/Cham_cong_Tinh_luong_ThayDat_V3.html` của Thầy Đạt Tin Học chỉ được dùng làm tài liệu tham khảo nội bộ, **bắt buộc phải loại trừ hoàn toàn khỏi gói build sản xuất (Production Bundle)**.
   - **Điều kiện 2 (Biểu thuế TNCN dự thảo):** Biểu thuế 5 bậc và giảm trừ 15.5 triệu / 5.5 triệu phải duy trì nhãn `UNVERIFIED_DRAFT` (chỉ dùng mô phỏng, không dùng để nộp thuế kho bạc thực tế).
   - **Điều kiện 3 (Thủ tục pháp lý ngoài hệ thống):** Cần nộp hồ sơ DPIA cho Cục An ninh mạng (A05) - Bộ Công an và đăng ký website thương mại điện tử với Bộ Công Thương trước khi ký hợp đồng thương mại thu tiền.
   - **Điều kiện 4 (Cổng thanh toán nội địa):** Cần tích hợp giải pháp thanh toán Việt Nam (VietQR / PayOS) song song hoặc thay thế Stripe khi phục vụ khách hàng trong nước.

---

## 2. MA TRẬN KIỂM TRA ĐIỀU KIỆN PHÁT HÀNH (RELEASE READINESS MATRIX)

| STT | Hạng mục kiểm tra | Tiêu chuẩn nghiệm thu | Kết quả thực tế | Trạng thái cổng | Bằng chứng kiểm chứng |
|:---:|:---|:---|:---:|:---:|:---|
| **1** | **Biên dịch & Kiểm tra kiểu dữ liệu (Build & Typecheck)** | Mã nguồn TypeScript không có lỗi biên dịch, không lỗi cú pháp. | Không có lỗi biên dịch | **ĐẠT (PASS)** | `npx tsc --noEmit` hoàn thành không lỗi |
| **2** | **Kiểm thử tự động toàn diện (Automated Test Suite)** | 100% bài test pass, không có bài test bị bỏ qua hoặc hủy bỏ. | **61/61 tests pass** | **ĐẠT (PASS)** | Bộ test runner native Node.js chạy trong ~1.1s |
| **3** | **Thuật toán tính lương & Chấm công** | Tính đúng lương thời gian, lương khoán, thâm niên, ăn trưa, OT. | Khớp 100% công thức chuẩn | **ĐẠT (PASS)** | `payrollEngine.test.ts` & `backendEngine.test.ts` |
| **4** | **Tính bất biến của kỳ lương đã chốt** | Kỳ lương `LOCKED` không bị sửa đổi khi cấu hình công ty thay đổi. | Đóng băng 100% số liệu | **ĐẠT (PASS)** | `qaRegression.test.ts: Suite 2` |
| **5** | **Cô lập dữ liệu đa doanh nghiệp (BOLA/IDOR)** | Không thể xem hoặc sửa dữ liệu nhân viên, bảng lương của tenant khác. | Chặn 100% truy cập chéo | **ĐẠT (PASS)** | `multiTenantSecurity.test.ts` (12 tests) |
| **6** | **Bảo vệ dữ liệu cá nhân nhạy cảm (PII)** | Tự động che mờ số CCCD và STK ngân hàng đối với nhân viên thường. | Đã che mờ `001******456` | **ĐẠT (PASS)** | `securityAudit.test.ts: Suite 3` |
| **7** | **An toàn tệp tin tải lên (File Upload & Path Traversal)** | Chặn đứng các tệp chứa `..` và đuôi file thực thi nguy hiểm (`.exe`, `.php`). | Từ chối với lỗi 400 | **ĐẠT (PASS)** | `securityAudit.test.ts: Suite 1` |
| **8** | **Khóa tổ chức ngưng hoạt động (Tenant Suspension)** | Chặn toàn bộ thao tác đọc/ghi khi `Tenant.isActive = false`. | Ném lỗi 403 Forbidden | **ĐẠT (PASS)** | `securityAudit.test.ts: Suite 2` |
| **9** | **Giấy phép thư viện bên thứ ba** | Không chứa mã nguồn Copyleft độc hại (GPL, AGPL, SSPL). | 100% Permissive (MIT, Apache) | **ĐẠT (PASS)** | `THIRD_PARTY_LICENSES.md` |
| **10** | **Cấu hình môi trường an toàn** | Không lưu trữ secret thật trong repository, có file mẫu `.env.example`. | Đã làm sạch toàn bộ secret | **ĐẠT (PASS)** | `.env.server.example` & `.env.client.example` |

---

## 3. CHECKLIST TRƯỚC KHI BẤM NÚT TRIỂN KHAI PRODUCTION (PRE-FLIGHT CHECKLIST)

Bảng kiểm tra bắt buộc trước khi triển khai chính thức ra Internet:

- [ ] **Mã nguồn:** Đã gán nhãn phiên bản Git Tag chính thức (`v1.0.0-RC1`).
- [ ] **Bản build:** Thư mục `docs/reference/` đã được loại trừ khỏi Docker image hoặc tệp zip triển khai.
- [ ] **Database:** Đã tạo cơ sở dữ liệu PostgreSQL Production và chạy `npx prisma migrate deploy` thành công.
- [ ] **Biến môi trường:** Đã cấu hình các secret Production an toàn qua Secret Manager (DATABASE_URL, TENANT_SESSION_SECRET, STORAGE, EMAIL).
- [ ] **Chứng chỉ SSL:** Đã cấu hình HTTPS qua Cloudflare hoặc Let's Encrypt với giao thức TLS 1.3.
- [ ] **Sao lưu:** Đã kích hoạt cơ chế tự động sao lưu hằng ngày (Automated Daily Backup) trên máy chủ cơ sở dữ liệu.
- [ ] **Giám sát:** Đã thiết lập dịch vụ giám sát Uptime tại endpoint `/health`.
- [ ] **Pháp lý:** Đã hoàn thiện hồ sơ DPIA và thủ tục đăng ký Bộ Công Thương.

---

> [!CAUTION]
> **ĐIỀU KHOẢN DỪNG LẠI CHỜ DUYỆT (STOPPING CONDITION):**  
> Bản checklist này xác nhận hệ thống đã hoàn toàn sẵn sàng về mặt kỹ thuật. **Kỹ sư vận hành TUYỆT ĐỐI KHÔNG TỰ Ý chạy bất kỳ lệnh triển khai production nào** cho đến khi có chữ ký phê duyệt chính thức từ Chủ dự án!
