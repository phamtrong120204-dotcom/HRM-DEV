# BÁO CÁO KIỂM THỬ GIAO DIỆN & ĐÁNH GIÁ CHẤT LƯỢNG FRONTEND (GĐ2)
## Phân Hệ Quản Lý Chấm Công, Tính Lương & Cài Đặt Doanh Nghiệp (Multi-Tenant B2B SaaS)

> **Mã tài liệu:** `FRONTEND_TEST_REPORT.md`  
> **Phiên bản:** `1.0.0`  
> **Ngày lập:** 25/10/2026  
> **Người thực hiện:** Senior Frontend Engineer, SaaS UI/UX Designer & Accessibility Specialist  
> **Môi trường thử nghiệm:** Node.js v24.14.1 · Wasp v0.26.1 · React 19 · Tailwind CSS v4 · TypeScript  

---

## 1. TỔNG QUAN & PHẠM VI KIỂM THỬ

Giai đoạn 2 (Prompt 2) tập trung hiện thực hóa toàn bộ giao diện người dùng, luồng tương tác và công cụ tính toán nghiệp vụ cho phần mềm SaaS Chấm công & Tính lương đa doanh nghiệp, kế thừa và mở rộng trên nền tảng **Open SaaS** và tài liệu tham chiếu nghiệp vụ `Cham_cong_Tinh_luong_ThayDat_V3.html`.

### Phạm vi bao phủ:
1. **Toàn bộ 6 màn hình chức năng chính:**
   - `PayrollDashboardPage.tsx`: Dashboard điều hành tiền lương & nhân sự.
   - `EmployeeManagementPage.tsx`: Quản lý hồ sơ nhân viên, phòng ban, lương hợp đồng & bảo hiểm.
   - `TimekeepingPage.tsx`: Bảng chấm công chi tiết 31 ngày với công cụ cọ chấm và điền nhanh.
   - `PayrollSpreadsheetPage.tsx`: Bảng thanh toán lương tổng hợp với ô vàng chỉnh sửa trực tiếp và tính lại theo thời gian thực.
   - `TaxInsuranceReportsPage.tsx`: Báo cáo trích nộp BHXH/BHYT/BHTN/KPCĐ, tờ khai quyết toán thuế năm và công cụ quy đổi Gross ⇄ Net 2 chiều.
   - `CompanySettingsPage.tsx`: Trung tâm cài đặt 8 tab đa doanh nghiệp với quy chế làm việc, thuế, mẫu biểu và nhật ký thay đổi.
2. **6 Thành phần dùng chung (Shared Components):**
   - `DemoBanner.tsx`: Huy hiệu & cảnh báo Chế độ Demo Mode minh bạch.
   - `TenantSwitcher.tsx`: Bộ chuyển đổi doanh nghiệp và hiển thị vai trò người dùng (Owner/Admin/HR/Accountant).
   - `PayrollStatusBadge.tsx`: Huy hiệu trạng thái kỳ lương (`DRAFT`, `REVIEWING`, `LOCKED`, `PAID`).
   - `SalarySlipModal.tsx`: Phiếu lương cá nhân chi tiết chuẩn in ấn (A4) có giải trình thuế TNCN và chữ ký 3 bên.
   - `ExcelImportModal.tsx`: Hộp thoại kéo thả file Excel / dán dữ liệu từ bảng tính với cơ chế xử lý trùng mã.
   - `OnboardingWizardModal.tsx`: Trình hướng dẫn thiết lập 4 bước cho doanh nghiệp mới thành lập.
3. **Engine tính toán & tiện ích định dạng:**
   - `docSo.ts`: Bộ chuyển đổi số tiền thành chữ tiếng Việt chuẩn ngân hàng / kế toán và định dạng tiền tệ.
   - `payrollEngine.ts`: Động cơ tính toán lương thời gian, lương sản phẩm, thâm niên, chuyên cần, OT miễn thuế, bảo hiểm bắt buộc và thuế TNCN lũy tiến.

---

## 2. DANH MỤC THÀNH PHẦN & KIỂM TRA TÍNH NĂNG (FEATURE CHECKLIST)

| STT | Tên Thành Phần / Trang | Đường dẫn tệp tin | Trạng thái | Đánh giá chức năng |
| :---: | :--- | :--- | :---: | :--- |
| 1 | **Dashboard Điều Hành** | `src/payroll/pages/PayrollDashboardPage.tsx` | **ĐẠT** | 4 thẻ KPI động, cơ cấu chi phí doanh nghiệp, tỷ lệ chuyên cần, top thu nhập, cảnh báo nhân sự nghỉ dài ngày và sinh nhật trong tháng. |
| 2 | **Quản Lý Nhân Sự** | `src/payroll/pages/EmployeeManagementPage.tsx` | **ĐẠT** | Tìm kiếm đa năng (mã, tên, CCCD, SĐT), lọc phòng ban & trạng thái, thống kê quỹ lương, Modal thêm/sửa nhân viên 4 tab, xuất CSV và tích hợp nhập Excel. |
| 3 | **Bảng Chấm Công 31 Ngày** | `src/payroll/pages/TimekeepingPage.tsx` | **ĐẠT** | Lưới 31 ngày có cố định cột nhân viên, nhận diện Chủ Nhật/ngày lễ, bảng cọ chấm công (X, X/2, P, L, CT, N, O, KP), thao tác điền nhanh, nhập giờ OT, khóa bảng công, in ấn. |
| 4 | **Bảng Thanh Toán Lương** | `src/payroll/pages/PayrollSpreadsheetPage.tsx` | **ĐẠT** | Bảng tính mở rộng 22 cột chuẩn Thông tư, cuộn ngang mượt mà, **các ô vàng tương tác trực tiếp** (SL sản phẩm, thưởng, tạm ứng, giờ OT) tự động kích hoạt engine tính lại toàn bộ Gross, Net, Thuế, BHXH ngay lập tức. |
| 5 | **Phiếu Lương Chi Tiết** | `src/payroll/components/SalarySlipModal.tsx` | **ĐẠT** | Mẫu phiếu lương A4 chuẩn hóa, hiển thị số tiền bằng chữ, hộp giải trình bậc thuế TNCN, hộp chi phí NSDLĐ đóng thêm, 3 khu vực ký tên và nút in ấn tối ưu CSS print. |
| 6 | **Báo Cáo Thuế & Bảo Hiểm** | `src/payroll/pages/TaxInsuranceReportsPage.tsx` | **ĐẠT** | 3 tab chuyên sâu: (1) Bảng nghĩa vụ trích nộp tháng (NLĐ 10.5% vs NSDLĐ 23.5%), (2) Bảng kê quyết toán năm 05-1/BK-TNCN, (3) Máy tính Gross ⇄ Net 2 chiều trực quan. |
| 7 | **Trung Tâm Cài Đặt Doanh Nghiệp** | `src/payroll/pages/CompanySettingsPage.tsx` | **ĐẠT** | 8 tab đầy đủ theo đặc tả Prompt 1: Hồ sơ công ty, Phòng ban/Chức danh, Ca làm & Chấm công, Phụ cấp & Lương, Thuế & BHXH (Nhóm B có kiểm soát), Thành viên & Phân quyền, Mẫu biểu & Chữ ký, Nhật ký thay đổi (Audit trail). |
| 8 | **Định Tuyến & Điều Hướng** | `src/payroll/payroll.wasp.ts` & `NavBar` | **ĐẠT** | Đã khai báo 6 routes Wasp có kiểm tra xác thực (`authRequired: true`), tích hợp sẵn vào thanh điều hướng chính (`NavBar/constants.ts`). |

---

## 3. KẾT QUẢ KIỂM THỬ ĐỘNG CƠ TÍNH TOÁN NGHIỆP VỤ (UNIT TEST RESULTS)

Chúng tôi đã thiết kế và thực thi bộ kiểm thử tự động toàn diện tại `src/payroll/payrollEngine.test.ts` thông qua Node.js Test Runner nguyên bản (`node --test --experimental-strip-types`) tuân thủ nghiêm ngặt nguyên tắc **không cài đặt thêm package tùy tiện**.

### Kết quả chạy kiểm thử thực tế:

```text
▶ Vietnamese Number to Words Converter (docSo)
  ✔ converts 0 correctly (5.26ms)
  ✔ converts round millions (4.52ms)
  ✔ converts compound amounts (0.90ms)
  ✔ formats currency with symbol (153.64ms)
  ✔ formats plain number with dots (1.92ms)
✔ Vietnamese Number to Words Converter (docSo) (171.08ms)

▶ Seniority Calculation (calculateSeniorityYears)
  ✔ computes 0 years for start dates after or in same year (6.01ms)
  ✔ computes multiple seniority years accurately (0.69ms)
✔ Seniority Calculation (calculateSeniorityYears) (7.20ms)

▶ Personal Income Tax (calculateTax)
  ✔ returns 0 tax when taxable income <= 0 (0.83ms)
  ✔ computes Tier 1 under 2026 5-tier proposal (5% up to 10M) (0.44ms)
  ✔ computes Tier 2 under 2026 5-tier proposal (up to 30M) (0.40ms)
  ✔ computes legacy 7-tier tax (5% up to 5M, 10% next 5M) (0.28ms)
✔ Personal Income Tax (calculateTax) (2.57ms)

▶ Full Employee Payroll Engine (calcEmployeePayroll)
  ✔ calculates full month payroll for time-based standard employee (1.49ms)
  ✔ exempts statutory insurance when employee takes >= 14 unpaid leave days (Luật BHXH) (0.49ms)
  ✔ correctly calculates piece-rate employee (0.39ms)
  ✔ disqualifies attendance bonus if unpaid leave days exceed allowance threshold (0.35ms)
  ✔ enforces insurance ceiling on high base salaries (20x base salary) (0.27ms)
✔ Full Employee Payroll Engine (calcEmployeePayroll) (3.58ms)

============================================================
ℹ tests: 16
ℹ suites: 4
ℹ pass: 16 (100%)
ℹ fail: 0 (0%)
ℹ cancelled: 0
ℹ skipped: 0
ℹ total duration: 719.05 ms
============================================================
```

### Chi tiết các quy tắc nghiệp vụ đã được xác minh bằng kiểm thử:
1. **Đọc số tiền tiếng Việt (`docSo`):**
   - Đọc chính xác các mức tiền lẻ, chẵn triệu, hàng chục triệu có gắn hậu tố *"đồng"*.
   - Định dạng hiển thị dấu chấm phân cách hàng nghìn (`15.000.000 đ`) quen thuộc với người dùng Việt Nam.
2. **Quy tắc 14 ngày nghỉ không lương (Luật BHXH):**
   - Khi nhân viên có số ngày nghỉ không lương trong tháng $\ge 14$ ngày (như ca nhân viên NV006), hệ thống tự động thiết lập mức trích đóng BHXH, BHYT, BHTN của cả Người lao động và Doanh nghiệp về $0$ đ.
3. **Mức trần bảo hiểm bắt buộc:**
   - BHXH và BHYT được khống chế tối đa bằng 20 lần mức lương cơ sở ($20 \times 2.340.000 = 46.800.000$ đ hoặc $20 \times 2.530.000 = 50.600.000$ đ tùy cài đặt doanh nghiệp).
   - BHTN được khống chế tối đa bằng 20 lần mức lương tối thiểu Vùng I ($20 \times 4.960.000 = 99.200.000$ đ).
   - Các nhân viên thu nhập cao (như NV001 lương 45tr, đóng BH 80tr) không bị tính vượt trần trái pháp luật.
4. **Miễn thuế tiền làm thêm giờ (OT):**
   - Phần tiền làm thêm giờ vượt trội so với đơn giá ngày thường được tự động bóc tách vào mục thu nhập miễn thuế TNCN.
5. **Thuế TNCN lũy tiến:**
   - Hỗ trợ song song cả Biểu thuế 5 bậc (Dự thảo Luật Thuế TNCN mới) và Biểu thuế 7 bậc truyền thống.
6. **Thưởng chuyên cần & Phụ cấp thâm niên:**
   - Tự động hủy thưởng chuyên cần nếu số ngày nghỉ việc riêng vượt quá quy định của công ty.
   - Thâm niên tính chính xác theo khoảng cách từ ngày bắt đầu làm việc đến kỳ tính lương.

---

## 4. ĐÁNH GIÁ TRẢI NGHIỆM NGƯỜI DÙNG & KHẢ NĂNG TRUY CẬP (UI/UX & A11Y AUDIT)

### 4.1. Ngôn ngữ & Độ thân thiện với người không chuyên kỹ thuật
- **100% Tiếng Việt:** Tất cả các tiêu đề cột, chú giải, nhãn trường nhập liệu, thông báo lỗi và tooltip đều được viết bằng tiếng Việt phổ thông, chuẩn văn bản kế toán hành chính (không dùng tiếng Anh lai tạp như "payroll record", "deduction list").
- **Gợi ý trực quan:** Các trường nhạy cảm đều có dòng hướng dẫn giải thích rõ lý do pháp lý (ví dụ: *"Miễn thuế ăn trưa tối đa 730.000đ theo TT 26/2015"*, *"Giảm trừ bản thân 11.000.000đ/tháng"*).

### 4.2. Khả năng làm việc trên màn hình Desktop (Heavy Spreadsheets)
- Bảng tính Chấm công và Bảng lương được thiết kế với kỹ thuật **Sticky Headers** (cố định hàng tiêu đề khi cuộn dọc) và **Sticky Columns** (cố định cột STT, Mã NV, Họ tên khi cuộn ngang).
- Người dùng kế toán có thể cuộn ngang để kiểm tra cột Thực Lĩnh hoặc Chi Phí Doanh Nghiệp mà không bao giờ bị mất dấu nhân viên đang theo dõi.
- Các ô màu vàng (`bg-amber-50`) được nhận diện trực quan là ô cho phép nhập liệu nhanh mà không cần mở hộp thoại popup phức tạp.

### 4.3. Tối ưu hóa In ấn (Print Stylesheet)
- Toàn bộ các thanh điều hướng (NavBar, TenantSwitcher, nút bấm, bộ lọc) đều được gắn class `no-print` và ẩn hoàn toàn khi người dùng bấm In hoặc ấn `Ctrl + P`.
- Phiếu lương cá nhân (`SalarySlipModal`) và Bảng lương xuất bản trang in sạch đẹp, căn chỉnh vừa vặn khổ giấy A4/A3, có đầy đủ chỗ ký tên và đóng dấu.

### 4.4. Khả năng truy cập (Accessibility - A11y)
- Tất cả các trường nhập liệu độc lập và nút bấm đều được gắn nhãn `aria-label` hoặc thẻ `<label>` tương ứng.
- Các modal đều có thuộc tính `role="dialog"` và `aria-modal="true"`.
- Bảng biểu sử dụng thẻ `<table>`, `<thead>`, `<tbody>`, `<tfoot>`, `<th scope="col">` đúng chuẩn ngữ nghĩa semantic HTML.
- Độ tương phản màu sắc đáp ứng tiêu chuẩn WCAG 2.1 AA (màu chữ đen/xám đậm trên nền trắng, màu cảnh báo có viền rõ ràng).

---

## 5. BẢO MẬT DỮ LIỆU & CÔ LẬP ĐA DOANH NGHIỆP (SECURITY & MULTI-TENANCY)

1. **Phân quyền vai trò (Role-Based Access Control):**
   - Đã thiết lập 5 vai trò rõ rệt: `OWNER`, `ADMIN`, `HR_MANAGER`, `ACCOUNTANT`, `EMPLOYEE`.
   - Các nghiệp vụ Nhóm B (sửa trần bảo hiểm, thuế, mức giảm trừ) chỉ hiển thị huy hiệu và cho phép chỉnh sửa với quyền Owner/Admin.
2. **Bảo vệ dữ liệu định danh cá nhân (PII Protection):**
   - Toàn bộ dữ liệu số CCCD/CMND hiển thị trên giao diện được che giấu một phần (ví dụ: `001085***123`).
   - Số tài khoản ngân hàng được mã hóa dạng `1903******`.
   - Dữ liệu demo hoàn toàn là dữ liệu giả định hư cấu, không sử dụng thông tin của bất kỳ cá nhân hay tổ chức thật nào ngoài đời thực.
3. **Minh bạch Chế độ Thử Nghiệm (Demo Mode Transparency):**
   - Banner cảnh báo màu hổ phách luôn hiện hữu ở đầu tất cả các trang, nêu rõ hệ thống đang chạy ở chế độ trải nghiệm UI/UX độc lập, không ghi đè dữ liệu sản xuất.
   - Tenant Switcher cho phép xem trước mô hình chuyển đổi không gian làm việc giữa các công ty thành viên.

---

## 6. DANH MỤC TỆP NGUỒN ĐÃ TẠO VÀ CHỈNH SỬA

```text
template/app/
├── main.wasp.ts                                 [Cập nhật - Đăng ký payrollSpec]
├── src/
│   ├── client/
│   │   └── components/NavBar/constants.ts      [Cập nhật - Thêm menu điều hướng phân hệ lương]
│   └── payroll/
│       ├── types.ts                             [Mới - Toàn bộ TypeScript interfaces & models]
│       ├── mockData.ts                          [Mới - Dữ liệu thử nghiệm an toàn, che PII]
│       ├── payroll.wasp.ts                      [Mới - Khai báo định tuyến 6 màn hình Wasp]
│       ├── payrollEngine.test.ts                [Mới - Bộ kiểm thử 16 ca test Node.js]
│       ├── components/
│       │   ├── DemoBanner.tsx                   [Mới - Banner cảnh báo demo]
│       │   ├── TenantSwitcher.tsx               [Mới - Bộ chuyển đổi tổ chức & vai trò]
│       │   ├── PayrollStatusBadge.tsx           [Mới - Huy hiệu trạng thái kỳ lương]
│       │   ├── SalarySlipModal.tsx              [Mới - Phiếu lương A4 in ấn]
│       │   ├── ExcelImportModal.tsx             [Mới - Hộp thoại nhập bảng tính Excel]
│       │   └── OnboardingWizardModal.tsx        [Mới - Trình hướng dẫn thiết lập 4 bước]
│       ├── pages/
│       │   ├── PayrollDashboardPage.tsx         [Mới - Dashboard điều hành tiền lương]
│       │   ├── EmployeeManagementPage.tsx       [Mới - Quản lý nhân sự & hợp đồng]
│       │   ├── TimekeepingPage.tsx              [Mới - Bảng chấm công 31 ngày]
│       │   ├── PayrollSpreadsheetPage.tsx       [Mới - Bảng thanh toán lương tổng hợp]
│       │   ├── TaxInsuranceReportsPage.tsx      [Mới - Báo cáo thuế, BHXH & Gross-Net]
│       │   └── CompanySettingsPage.tsx          [Mới - Trung tâm cài đặt 8 tab]
│       └── utils/
│           ├── docSo.ts                         [Mới - Đọc số thành chữ & định dạng tiền]
│           └── payrollEngine.ts                 [Mới - Động cơ tính toán lương & thuế]
```

---

## 7. KẾ HOẠCH BÀN GIAO & KẾT NỐI BACKEND (GIAI ĐOẠN TIẾP THEO)

Sau khi hoàn thành và nghiệm thu giao diện Giai đoạn 2, các bước tiếp theo để đưa hệ thống vào vận hành thương mại:

1. **Giai đoạn 3 (Database & Prisma Schema Migration):**
   - Chuyển đổi các interfaces trong `types.ts` thành Prisma models thực tế trong file `schema.prisma`.
   - Thiết lập khóa ngoại `tenantId` và chỉ mục (indexes) trên tất cả các bảng.
2. **Giai đoạn 4 (Wasp Server Operations):**
   - Viết các Wasp Queries và Actions (`getPayrollSpreadsheet`, `saveAttendance`, `updateEmployee`, `lockPayrollPeriod`) kết nối cơ sở dữ liệu PostgreSQL thực tế trên Supabase.
   - Đảm bảo kiểm tra phân quyền server-side đa tầng (`requireTenantMember`, `requireRole('ADMIN')`).
3. **Giai đoạn 5 (Excel Export/Import Worker):**
   - Tích hợp thư viện xử lý file Excel chuẩn hóa phía server hoặc client (`xlsx` / `exceljs`) để nhập xuất các mẫu biểu nhà nước C70a-HD và bảng chấm công thực tế.

---
*Báo cáo được hoàn thành và sẵn sàng cho khách hàng / Trưởng dự án nghiệm thu.*
