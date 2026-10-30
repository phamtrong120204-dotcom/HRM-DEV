import { Printer, X } from 'lucide-react';
import { MOCK_SETTINGS, MOCK_TENANT } from '../mockData';
import { PayrollRecord } from '../types';
import { docSo, formatNumber, formatVND } from '../utils/docSo';

interface SalarySlipModalProps {
  record: PayrollRecord | null;
  isOpen: boolean;
  onClose: () => void;
  yearMonth?: string;
}

export function SalarySlipModal({ record, isOpen, onClose, yearMonth = '2026-04' }: SalarySlipModalProps) {
  if (!isOpen || !record) return null;

  const [y, m] = yearMonth.split('-');
  const formattedMonth = `Tháng ${+m}/${y}`;
  const slipCode = `PL${y}${m}-${record.employeeCode}`;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="slip-modal-title"
    >
      <div className="bg-card text-card-foreground relative my-8 w-full max-w-4xl rounded-2xl border shadow-2xl transition-all">
        {/* Thanh công cụ Modal (ẩn khi in) */}
        <div className="border-border bg-muted/40 flex items-center justify-between border-b px-6 py-4 no-print">
          <div>
            <h3 id="slip-modal-title" className="text-base font-bold text-foreground">
              Phiếu Lương Chi Tiết — {record.employeeName} ({record.employeeCode})
            </h3>
            <p className="text-muted-foreground text-xs">
              Kỳ lương: {formattedMonth} · Trạng thái: Đã đồng bộ từ Bảng Lương
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="bg-primary hover:bg-primary/90 text-primary-foreground inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold shadow-xs transition-colors"
            >
              <Printer className="h-4 w-4" />
              <span>In phiếu lương (A4)</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="hover:bg-muted text-muted-foreground hover:text-foreground rounded-lg p-2 transition-colors"
              aria-label="Đóng"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Nội dung Phiếu Lương (in ấn được) */}
        <div className="printable-slip max-h-[80vh] overflow-y-auto p-8 text-xs font-sans leading-normal">
          {/* Header công ty */}
          <div className="flex items-start justify-between border-b-2 border-teal-700 pb-3">
            <div>
              <h2 className="text-sm font-extrabold tracking-wide uppercase text-teal-800 dark:text-teal-400">
                {MOCK_TENANT.name}
              </h2>
              <p className="text-muted-foreground text-[11px]">{MOCK_TENANT.address}</p>
              <p className="text-muted-foreground text-[11px]">
                Điện thoại: {MOCK_TENANT.phoneNumber} · MST: {MOCK_TENANT.taxId}
              </p>
            </div>
            <div className="text-right">
              <h1 className="text-xl font-black tracking-wider text-teal-800 dark:text-teal-400 uppercase">
                PHIẾU LƯƠNG
              </h1>
              <p className="text-[11px] font-semibold text-foreground">Kỳ lương: {formattedMonth}</p>
              <p className="text-muted-foreground font-mono text-[10px]">Số phiếu: {slipCode}</p>
            </div>
          </div>

          {/* Dải gradient */}
          <div className="my-3 h-1 rounded-full bg-gradient-to-r from-teal-800 via-teal-600 to-amber-500"></div>

          {/* Thông tin nhân viên */}
          <div className="bg-teal-50/60 dark:bg-teal-950/20 border-teal-200 dark:border-teal-900 grid grid-cols-2 gap-x-6 gap-y-2 rounded-xl border p-4 text-[11px] sm:grid-cols-4">
            <div>
              <span className="text-muted-foreground block text-[10px] uppercase">Họ và tên:</span>
              <strong className="text-sm text-foreground">{record.employeeName}</strong>
            </div>
            <div>
              <span className="text-muted-foreground block text-[10px] uppercase">Mã nhân viên:</span>
              <strong className="font-mono text-foreground">{record.employeeCode}</strong>
            </div>
            <div>
              <span className="text-muted-foreground block text-[10px] uppercase">Phòng ban:</span>
              <strong className="text-foreground">{record.departmentName}</strong>
            </div>
            <div>
              <span className="text-muted-foreground block text-[10px] uppercase">Chức vụ:</span>
              <strong className="text-foreground">{record.jobTitle}</strong>
            </div>
            <div>
              <span className="text-muted-foreground block text-[10px] uppercase">Mã số thuế:</span>
              <span className="font-mono text-foreground">8012345***</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[10px] uppercase">Số người phụ thuộc:</span>
              <span className="font-semibold text-foreground">{record.dependentsCount} người</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[10px] uppercase">Ngân hàng:</span>
              <span className="text-foreground">{record.bankName || 'Tiền mặt'}</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[10px] uppercase">Số tài khoản:</span>
              <span className="font-mono text-foreground">{record.bankAccountNumber || '-'}</span>
            </div>
          </div>

          {/* Thống kê ngày công */}
          <div className="my-3 grid grid-cols-3 gap-2 text-center sm:grid-cols-6">
            <div className="border-border rounded-lg border p-2">
              <strong className="block text-sm font-bold text-foreground">{record.standardDays}</strong>
              <span className="text-muted-foreground text-[10px]">Công chuẩn</span>
            </div>
            <div className="border-border rounded-lg border p-2">
              <strong className="block text-sm font-bold text-foreground">{formatNumber(record.actualWorkDays)}</strong>
              <span className="text-muted-foreground text-[10px]">Công đi làm</span>
            </div>
            <div className="border-border rounded-lg border p-2">
              <strong className="block text-sm font-bold text-foreground">{formatNumber(record.paidLeaveDays)}</strong>
              <span className="text-muted-foreground text-[10px]">Phép + Lễ</span>
            </div>
            <div className="border-border rounded-lg border p-2">
              <strong className="block text-sm font-bold text-rose-600 dark:text-rose-400">
                {formatNumber(record.unpaidLeaveDays)}
              </strong>
              <span className="text-muted-foreground text-[10px]">Nghỉ không lương</span>
            </div>
            <div className="border-border rounded-lg border p-2">
              <strong className="block text-sm font-bold text-foreground">{formatNumber(record.overtimeHours)}h</strong>
              <span className="text-muted-foreground text-[10px]">Giờ làm thêm (OT)</span>
            </div>
            <div className="bg-teal-700 text-white rounded-lg p-2 dark:bg-teal-600">
              <strong className="block text-sm font-bold">{formatNumber(record.paidDaysCount)}</strong>
              <span className="text-[10px] text-teal-100">Công hưởng lương</span>
            </div>
          </div>

          {/* Bảng chi tiết Thu nhập và Khấu trừ */}
          <table className="border-border w-full border-collapse border text-left text-[11px]">
            <thead>
              <tr className="bg-muted text-muted-foreground border-b text-[10px] uppercase">
                <th className="border-r p-2 text-center w-10">STT</th>
                <th className="border-r p-2">Khoản mục</th>
                <th className="border-r p-2">Diễn giải công thức</th>
                <th className="p-2 text-right w-36">Số tiền (VNĐ)</th>
              </tr>
            </thead>
            <tbody>
              {/* Mục A */}
              <tr className="bg-teal-50 dark:bg-teal-950/40 font-bold text-teal-900 dark:text-teal-300">
                <td colSpan={4} className="border-b p-2">
                  A. CÁC KHOẢN THU NHẬP
                </td>
              </tr>
              <tr className="border-b">
                <td className="border-r p-1.5 text-center text-muted-foreground">1</td>
                <td className="border-r p-1.5 font-medium">Lương theo ngày công</td>
                <td className="border-r p-1.5 text-muted-foreground">
                  {formatVND(record.baseSalary)} ÷ {record.standardDays} công × {formatNumber(record.paidDaysCount)} công
                </td>
                <td className="p-1.5 text-right font-semibold">{formatVND(record.timeBasedSalary)}</td>
              </tr>
              {record.attendanceAllowance > 0 && (
                <tr className="border-b">
                  <td className="border-r p-1.5 text-center text-muted-foreground">2</td>
                  <td className="border-r p-1.5 font-medium">Phụ cấp chuyên cần</td>
                  <td className="border-r p-1.5 text-muted-foreground">Đủ điều kiện chuyên cần (nghỉ KL ≤ 0)</td>
                  <td className="p-1.5 text-right font-semibold">{formatVND(record.attendanceAllowance)}</td>
                </tr>
              )}
              {record.seniorityAllowance > 0 && (
                <tr className="border-b">
                  <td className="border-r p-1.5 text-center text-muted-foreground">3</td>
                  <td className="border-r p-1.5 font-medium">Phụ cấp thâm niên</td>
                  <td className="border-r p-1.5 text-muted-foreground">{record.seniorityYears} năm làm việc</td>
                  <td className="p-1.5 text-right font-semibold">{formatVND(record.seniorityAllowance)}</td>
                </tr>
              )}
              {record.gasAllowance > 0 && (
                <tr className="border-b">
                  <td className="border-r p-1.5 text-center text-muted-foreground">4</td>
                  <td className="border-r p-1.5 font-medium">Phụ cấp xăng xe / đi lại</td>
                  <td className="border-r p-1.5 text-muted-foreground">Theo quy chế công ty</td>
                  <td className="p-1.5 text-right font-semibold">{formatVND(record.gasAllowance)}</td>
                </tr>
              )}
              {record.otherTaxableAllowance > 0 && (
                <tr className="border-b">
                  <td className="border-r p-1.5 text-center text-muted-foreground">5</td>
                  <td className="border-r p-1.5 font-medium">Phụ cấp trách nhiệm / khác</td>
                  <td className="border-r p-1.5 text-muted-foreground">Thu nhập chịu thuế</td>
                  <td className="p-1.5 text-right font-semibold">{formatVND(record.otherTaxableAllowance)}</td>
                </tr>
              )}
              {record.nonTaxableAllowance > 0 && (
                <tr className="border-b">
                  <td className="border-r p-1.5 text-center text-muted-foreground">6</td>
                  <td className="border-r p-1.5 font-medium">Phụ cấp không chịu thuế</td>
                  <td className="border-r p-1.5 text-muted-foreground">Tiền ăn ca, công tác phí theo quy định</td>
                  <td className="p-1.5 text-right font-semibold">{formatVND(record.nonTaxableAllowance)}</td>
                </tr>
              )}
              {record.pieceRateSalary > 0 && (
                <tr className="border-b">
                  <td className="border-r p-1.5 text-center text-muted-foreground">7</td>
                  <td className="border-r p-1.5 font-medium">Lương sản phẩm hoàn thành</td>
                  <td className="border-r p-1.5 text-muted-foreground">
                    {record.pieceRateQuantity} sản phẩm × {formatVND(record.pieceRateUnitPrice)}
                  </td>
                  <td className="p-1.5 text-right font-semibold">{formatVND(record.pieceRateSalary)}</td>
                </tr>
              )}
              {record.overtimeSalary > 0 && (
                <tr className="border-b">
                  <td className="border-r p-1.5 text-center text-muted-foreground">8</td>
                  <td className="border-r p-1.5 font-medium">Tiền làm thêm giờ (OT)</td>
                  <td className="border-r p-1.5 text-muted-foreground">
                    {formatNumber(record.overtimeHours)}h × hệ số 1.5 (Miễn thuế TNCN từ 2026)
                  </td>
                  <td className="p-1.5 text-right font-semibold">{formatVND(record.overtimeSalary)}</td>
                </tr>
              )}
              {record.bonusAmount > 0 && (
                <tr className="border-b">
                  <td className="border-r p-1.5 text-center text-muted-foreground">9</td>
                  <td className="border-r p-1.5 font-medium">Tiền thưởng hiệu quả / nóng</td>
                  <td className="border-r p-1.5 text-muted-foreground">Theo quyết định khen thưởng</td>
                  <td className="p-1.5 text-right font-semibold">{formatVND(record.bonusAmount)}</td>
                </tr>
              )}
              <tr className="bg-muted/50 border-b font-bold text-foreground">
                <td className="border-r p-2 text-center"></td>
                <td colSpan={2} className="border-r p-2 uppercase">
                  Tổng thu nhập (A)
                </td>
                <td className="p-2 text-right text-teal-700 dark:text-teal-400">{formatVND(record.grossSalary)}</td>
              </tr>

              {/* Mục B */}
              <tr className="bg-rose-50 dark:bg-rose-950/40 font-bold text-rose-900 dark:text-rose-300">
                <td colSpan={4} className="border-b p-2">
                  B. CÁC KHOẢN KHẤU TRỪ VÀO LƯƠNG
                </td>
              </tr>
              <tr className="border-b">
                <td className="border-r p-1.5 text-center text-muted-foreground">1</td>
                <td className="border-r p-1.5 font-medium">Bảo hiểm xã hội (BHXH)</td>
                <td className="border-r p-1.5 text-muted-foreground">
                  {record.isInsuranceExempt14Days
                    ? 'Miễn trừ đóng (Nghỉ không lương ≥ 14 ngày)'
                    : `8.0% × ${formatVND(record.insuranceSalaryBase)}`}
                </td>
                <td className="p-1.5 text-right font-semibold text-rose-600 dark:text-rose-400">
                  {formatVND(record.bhxhEmployee)}
                </td>
              </tr>
              <tr className="border-b">
                <td className="border-r p-1.5 text-center text-muted-foreground">2</td>
                <td className="border-r p-1.5 font-medium">Bảo hiểm y tế (BHYT)</td>
                <td className="border-r p-1.5 text-muted-foreground">
                  {record.isInsuranceExempt14Days ? 'Miễn trừ đóng' : `1.5% × ${formatVND(record.insuranceSalaryBase)}`}
                </td>
                <td className="p-1.5 text-right font-semibold text-rose-600 dark:text-rose-400">
                  {formatVND(record.bhytEmployee)}
                </td>
              </tr>
              <tr className="border-b">
                <td className="border-r p-1.5 text-center text-muted-foreground">3</td>
                <td className="border-r p-1.5 font-medium">Bảo hiểm thất nghiệp (BHTN)</td>
                <td className="border-r p-1.5 text-muted-foreground">
                  {record.isInsuranceExempt14Days ? 'Miễn trừ đóng' : `1.0% × ${formatVND(record.insuranceSalaryBase)}`}
                </td>
                <td className="p-1.5 text-right font-semibold text-rose-600 dark:text-rose-400">
                  {formatVND(record.bhtnEmployee)}
                </td>
              </tr>
              <tr className="border-b">
                <td className="border-r p-1.5 text-center text-muted-foreground">4</td>
                <td className="border-r p-1.5 font-medium">Thuế thu nhập cá nhân (TNCN)</td>
                <td className="border-r p-1.5 text-muted-foreground">
                  {record.personalIncomeTax > 0
                    ? 'Khấu trừ theo biểu lũy tiến từng phần'
                    : 'Chưa đến mức phải nộp thuế'}
                </td>
                <td className="p-1.5 text-right font-semibold text-rose-600 dark:text-rose-400">
                  {formatVND(record.personalIncomeTax)}
                </td>
              </tr>
              {record.advancePayment > 0 && (
                <tr className="border-b">
                  <td className="border-r p-1.5 text-center text-muted-foreground">5</td>
                  <td className="border-r p-1.5 font-medium">Tạm ứng trong kỳ</td>
                  <td className="border-r p-1.5 text-muted-foreground">Đã ứng trước qua chuyển khoản/tiền mặt</td>
                  <td className="p-1.5 text-right font-semibold text-rose-600 dark:text-rose-400">
                    {formatVND(record.advancePayment)}
                  </td>
                </tr>
              )}
              {record.otherDeductions > 0 && (
                <tr className="border-b">
                  <td className="border-r p-1.5 text-center text-muted-foreground">6</td>
                  <td className="border-r p-1.5 font-medium">Khấu trừ khác</td>
                  <td className="border-r p-1.5 text-muted-foreground">Khoản trừ nội bộ / kỷ luật</td>
                  <td className="p-1.5 text-right font-semibold text-rose-600 dark:text-rose-400">
                    {formatVND(record.otherDeductions)}
                  </td>
                </tr>
              )}
              <tr className="bg-muted/50 border-b font-bold text-foreground">
                <td className="border-r p-2 text-center"></td>
                <td colSpan={2} className="border-r p-2 uppercase">
                  Tổng các khoản khấu trừ (B)
                </td>
                <td className="p-2 text-right text-rose-600 dark:text-rose-400">{formatVND(record.totalDeductions)}</td>
              </tr>
            </tbody>
          </table>

          {/* Khung Thực Lĩnh lớn */}
          <div className="from-teal-800 to-teal-600 my-4 flex items-center justify-between rounded-xl bg-gradient-to-r p-5 text-white shadow-md">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-teal-200">
                SỐ TIỀN THỰC LĨNH (A - B)
              </span>
              <p className="mt-1 text-xs italic opacity-95">Bằng chữ: {docSo(record.netSalary)}</p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black tracking-tight">{formatVND(record.netSalary)}</span>
            </div>
          </div>

          {/* 2 Hộp giải trình minh bạch */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-[10.5px]">
            {/* Hộp 1: Thuế TNCN */}
            <div className="border-border rounded-xl border p-3.5 space-y-1.5 bg-muted/20">
              <h4 className="font-bold text-teal-800 dark:text-teal-400 uppercase tracking-wide border-b pb-1 text-[11px]">
                Chi tiết tính Thuế Thu Nhập Cá Nhân
              </h4>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tổng thu nhập (Gross):</span>
                <strong>{formatVND(record.grossSalary)}</strong>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Trừ phụ cấp không chịu thuế:</span>
                <span>- {formatVND(record.nonTaxableAllowance)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Trừ tiền OT được miễn thuế:</span>
                <span>- {formatVND(record.overtimeTaxExemptSalary)}</span>
              </div>
              <div className="flex justify-between border-t pt-1">
                <span className="text-muted-foreground">Thu nhập chịu thuế:</span>
                <strong>{formatVND(record.taxableIncome)}</strong>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Giảm trừ gia cảnh bản thân:</span>
                <span>- {formatVND(MOCK_SETTINGS.personalTaxDeduction)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Giảm trừ NPT ({record.dependentsCount} người):</span>
                <span>- {formatVND(record.dependentsCount * MOCK_SETTINGS.dependentTaxDeduction)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Trừ bảo hiểm bắt buộc NLĐ đóng:</span>
                <span>- {formatVND(record.totalEmployeeInsurance)}</span>
              </div>
              <div className="flex justify-between border-t pt-1 font-semibold">
                <span>Thu nhập tính thuế:</span>
                <span className="text-primary">{formatVND(record.assessableIncome)}</span>
              </div>
              <div className="flex justify-between font-bold text-rose-600 dark:text-rose-400">
                <span>Thuế TNCN phải nộp:</span>
                <span>{formatVND(record.personalIncomeTax)}</span>
              </div>
            </div>

            {/* Hộp 2: Chi phí DN gánh vác */}
            <div className="border-border rounded-xl border p-3.5 space-y-1.5 bg-muted/20">
              <h4 className="font-bold text-teal-800 dark:text-teal-400 uppercase tracking-wide border-b pb-1 text-[11px]">
                Phần Doanh Nghiệp Đóng Thêm (Không trừ vào lương)
              </h4>
              <div className="flex justify-between">
                <span className="text-muted-foreground">BHXH doanh nghiệp (17.5%):</span>
                <span>{formatVND(record.bhxhEmployer)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">BHYT doanh nghiệp (3.0%):</span>
                <span>{formatVND(record.bhytEmployer)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">BHTN doanh nghiệp (1.0%):</span>
                <span>{formatVND(record.bhtnEmployer)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Kinh phí công đoàn (2.0%):</span>
                <span>{formatVND(record.tradeUnionEmployer)}</span>
              </div>
              <div className="flex justify-between border-t pt-1 font-semibold text-teal-700 dark:text-teal-400">
                <span>Cộng phần doanh nghiệp đóng:</span>
                <span>{formatVND(record.totalEmployerCost)}</span>
              </div>
              <div className="flex justify-between border-t pt-1 font-extrabold text-foreground">
                <span>TỔNG CHI PHÍ DOANH NGHIỆP TRẢ CHO BẠN:</span>
                <span>{formatVND(record.totalCompanyExpense)}</span>
              </div>
            </div>
          </div>

          {/* Khối chữ ký */}
          <div className="mt-8 grid grid-cols-3 text-center text-[11px]">
            <div>
              <strong className="block text-foreground">{MOCK_SETTINGS.signatoryCreatorTitle}</strong>
              <span className="text-[10px] italic text-muted-foreground">(Ký, ghi rõ họ tên)</span>
              <div className="h-16"></div>
            </div>
            <div>
              <strong className="block text-foreground">{MOCK_SETTINGS.signatoryAccountantTitle}</strong>
              <span className="text-[10px] italic text-muted-foreground">(Ký, ghi rõ họ tên)</span>
              <div className="h-16"></div>
            </div>
            <div>
              <strong className="block text-foreground">Người nhận lương</strong>
              <span className="text-[10px] italic text-muted-foreground">(Ký, ghi rõ họ tên)</span>
              <div className="h-16"></div>
              <strong className="block text-foreground">{record.employeeName}</strong>
            </div>
          </div>

          <div className="border-border text-muted-foreground mt-4 border-t pt-2 text-center text-[10px] italic">
            Phiếu lương là thông tin bảo mật cá nhân, vui lòng không chia sẻ. Mọi thắc mắc xin phản hồi phòng Kế toán
            trong vòng 03 ngày làm việc kể từ ngày nhận phiếu.
          </div>
        </div>
      </div>
    </div>
  );
}
