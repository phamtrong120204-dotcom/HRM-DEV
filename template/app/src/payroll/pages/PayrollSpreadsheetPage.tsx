import {
  AlertCircle,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  DollarSign,
  Download,
  Eye,
  FileSpreadsheet,
  Filter,
  HelpCircle,
  Lock,
  Printer,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Unlock,
  Users
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { DemoBanner } from '../components/DemoBanner';
import { PayrollStatusBadge } from '../components/PayrollStatusBadge';
import { SalarySlipModal } from '../components/SalarySlipModal';
import { TenantSwitcher } from '../components/TenantSwitcher';
import { MOCK_DEPARTMENTS, MOCK_EMPLOYEES, MOCK_SETTINGS, MOCK_TENANT } from '../mockData';
import { Employee, PayrollPeriodStatus, PayrollRecord } from '../types';
import { formatNumber, formatVND } from '../utils/docSo';
import { calcEmployeePayroll } from '../utils/payrollEngine';

export function PayrollSpreadsheetPage() {
  const [selectedMonth, setSelectedMonth] = useState('2026-04');
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [periodStatus, setPeriodStatus] = useState<PayrollPeriodStatus>('DRAFT');

  // Modal phiếu lương
  const [selectedSlipRecord, setSelectedSlipRecord] = useState<PayrollRecord | null>(null);
  const [isSlipModalOpen, setIsSlipModalOpen] = useState(false);

  // Dữ liệu nhập tùy biến (sản lượng, thưởng, tạm ứng, giờ OT) cho từng nhân viên
  const [customInputs, setCustomInputs] = useState<
    Record<
      string,
      {
        pieceRateQuantity: number;
        bonusAmount: number;
        advancePayment: number;
        overtimeHours: number;
        otherDeduction: number;
      }
    >
  >(() => {
    const init: Record<string, any> = {};
    MOCK_EMPLOYEES.forEach((emp) => {
      init[emp.id] = {
        pieceRateQuantity: emp.pieceRateUnitPrice > 0 ? 850 : 0,
        bonusAmount: emp.departmentName === 'Kinh Doanh & CSKH' ? 2000000 : 0,
        advancePayment: emp.code === 'NV005' ? 2000000 : 0,
        overtimeHours: emp.departmentName === 'Sản Xuất & Kỹ Thuật' ? 12 : 0,
        otherDeduction: 0,
      };
    });
    return init;
  });

  // Tính toán bảng lương theo thời gian thực từ engine
  const computedRecords = useMemo(() => {
    return MOCK_EMPLOYEES.map((emp) => {
      const inputs = customInputs[emp.id] || {
        pieceRateQuantity: 0,
        bonusAmount: 0,
        advancePayment: 0,
        overtimeHours: 0,
        otherDeduction: 0,
      };

      // Giả lập công tháng 4
      const isAbsentHeavy = emp.code === 'NV006';
      const actualWorkDays = isAbsentHeavy ? 11 : 24;
      const unpaidLeaveDays = isAbsentHeavy ? 15 : 0;
      const paidLeaveDays = 1; // 1 ngày phép
      const holidayDays = 1; // 30/4
      const paidDaysCount = actualWorkDays + paidLeaveDays + holidayDays;

      const record = calcEmployeePayroll(
        emp,
        {
          actualWorkDays,
          paidLeaveDays: paidLeaveDays + holidayDays,
          unpaidLeaveDays,
          paidDaysCount,
          overtimeHours: inputs.overtimeHours,
        },
        {
          pieceRateQuantity: inputs.pieceRateQuantity,
          bonusAmount: inputs.bonusAmount,
          advancePayment: inputs.advancePayment,
          otherDeduction: inputs.otherDeduction,
        },
        MOCK_SETTINGS,
        selectedMonth
      );

      return record;
    });
  }, [selectedMonth, customInputs]);

  // Bộ lọc danh sách bảng lương
  const filteredRecords = useMemo(() => {
    return computedRecords.filter((rec) => {
      const matchSearch =
        rec.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rec.employeeCode.toLowerCase().includes(searchQuery.toLowerCase());
      const matchDept = selectedDept === 'ALL' || rec.departmentName === selectedDept;
      return matchSearch && matchDept;
    });
  }, [computedRecords, searchQuery, selectedDept]);

  // Tổng cộng toàn bảng
  const totals = useMemo(() => {
    return filteredRecords.reduce(
      (acc, r) => ({
        baseSalary: acc.baseSalary + r.baseSalary,
        timeBasedSalary: acc.timeBasedSalary + r.timeBasedSalary,
        pieceRateSalary: acc.pieceRateSalary + r.pieceRateSalary,
        bonusAmount: acc.bonusAmount + r.bonusAmount,
        totalAllowances: acc.totalAllowances + r.totalAllowances,
        overtimePay: acc.overtimePay + r.overtimePay,
        grossSalary: acc.grossSalary + r.grossSalary,
        employeeBhxh: acc.employeeBhxh + r.employeeInsurance.bhxh,
        employeeBhyt: acc.employeeBhyt + r.employeeInsurance.bhyt,
        employeeBhtn: acc.employeeBhtn + r.employeeInsurance.bhtn,
        totalEmployeeInsurance: acc.totalEmployeeInsurance + r.totalEmployeeInsurance,
        taxableIncome: acc.taxableIncome + r.taxableIncome,
        personalIncomeTax: acc.personalIncomeTax + r.personalIncomeTax,
        advancePayment: acc.advancePayment + r.advancePayment,
        netSalary: acc.netSalary + r.netSalary,
        totalEmployerCost: acc.totalEmployerCost + r.totalEmployerCost,
        totalCompanyExpense: acc.totalCompanyExpense + r.totalCompanyExpense,
      }),
      {
        baseSalary: 0,
        timeBasedSalary: 0,
        pieceRateSalary: 0,
        bonusAmount: 0,
        totalAllowances: 0,
        overtimePay: 0,
        grossSalary: 0,
        employeeBhxh: 0,
        employeeBhyt: 0,
        employeeBhtn: 0,
        totalEmployeeInsurance: 0,
        taxableIncome: 0,
        personalIncomeTax: 0,
        advancePayment: 0,
        netSalary: 0,
        totalEmployerCost: 0,
        totalCompanyExpense: 0,
      }
    );
  }, [filteredRecords]);

  const handleUpdateInput = (empId: string, field: string, val: number) => {
    if (periodStatus === 'LOCKED' || periodStatus === 'PAID') {
      alert('Kỳ lương đã được chốt/khóa sổ. Không thể sửa số liệu trực tiếp!');
      return;
    }
    setCustomInputs((prev) => ({
      ...prev,
      [empId]: {
        ...(prev[empId] || { pieceRateQuantity: 0, bonusAmount: 0, advancePayment: 0, overtimeHours: 0, otherDeduction: 0 }),
        [field]: Math.max(0, val),
      },
    }));
  };

  const handleExportCSV = () => {
    const headers = [
      'STT',
      'Mã NV',
      'Họ và tên',
      'Phòng ban',
      'Lương cơ bản',
      'Công tính lương',
      'Lương thời gian',
      'Lương sản phẩm',
      'Thưởng',
      'Phụ cấp',
      'Làm thêm giờ (OT)',
      'TỔNG THU NHẬP (GROSS)',
      'BHXH (8%)',
      'BHYT (1.5%)',
      'BHTN (1%)',
      'Thuế TNCN',
      'Tạm ứng',
      'THỰC LĨNH (NET)',
      'Chi phí BH NSDLĐ',
      'TỔNG CHI PHÍ DOANH NGHIỆP',
    ];

    const rows = filteredRecords.map((r, i) => [
      i + 1,
      r.employeeCode,
      `"${r.employeeName}"`,
      `"${r.departmentName}"`,
      r.baseSalary,
      r.paidDaysCount,
      r.timeBasedSalary,
      r.pieceRateSalary,
      r.bonusAmount,
      r.totalAllowances,
      r.overtimePay,
      r.grossSalary,
      r.employeeInsurance.bhxh,
      r.employeeInsurance.bhyt,
      r.employeeInsurance.bhtn,
      r.personalIncomeTax,
      r.advancePayment,
      r.netSalary,
      r.totalEmployerCost,
      r.totalCompanyExpense,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Bang_thanh_toan_luong_${selectedMonth}.csv`;
    link.click();
  };

  const handleOpenSlip = (rec: PayrollRecord) => {
    setSelectedSlipRecord(rec);
    setIsSlipModalOpen(true);
  };

  return (
    <div className="bg-background text-foreground min-h-screen">
      <DemoBanner />

      <main className="mx-auto max-w-[1600px] px-3 py-6 sm:px-6">
        {/* Header bar */}
        <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Bảng Thanh Toán Tiền Lương</h1>
              <PayrollStatusBadge status={periodStatus} />
              <span className="rounded-full bg-primary/10 px-3 py-0.5 text-xs font-bold text-primary font-mono">
                {selectedMonth}
              </span>
            </div>
            <p className="text-muted-foreground mt-1 text-sm">
              Bảng lương tự động tính toán theo chuẩn Luật Lao Động & Luật Thuế TNCN (Bảo hiểm, OT miễn thuế, Giảm trừ gia cảnh, Phụ cấp).
            </p>
          </div>

          {/* Action buttons & workflow */}
          <div className="flex flex-wrap items-center gap-2">
            <TenantSwitcher />

            {/* Workflow status transitions */}
            {periodStatus === 'DRAFT' && (
              <button
                type="button"
                onClick={() => setPeriodStatus('REVIEWING')}
                className="flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-bold text-amber-800 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300 transition-colors"
              >
                <Send className="h-4 w-4" />
                <span>Gửi Duyệt</span>
              </button>
            )}

            {periodStatus === 'REVIEWING' && (
              <button
                type="button"
                onClick={() => setPeriodStatus('LOCKED')}
                className="flex items-center gap-1.5 rounded-lg border border-purple-300 bg-purple-50 px-3 py-2 text-sm font-bold text-purple-800 hover:bg-purple-100 dark:border-purple-800 dark:bg-purple-950 dark:text-purple-300 transition-colors"
              >
                <Lock className="h-4 w-4" />
                <span>Phê Duyệt & Khóa Sổ</span>
              </button>
            )}

            {periodStatus === 'LOCKED' && (
              <>
                <button
                  type="button"
                  onClick={() => setPeriodStatus('PAID')}
                  className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-sm font-bold text-white shadow-xs hover:bg-emerald-700 transition-colors"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Xác Nhận Đã Chi Trả</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('Mở khóa bảng lương để điều chỉnh? Hành động này sẽ được ghi vào Nhật ký hệ thống.')) {
                      setPeriodStatus('DRAFT');
                    }
                  }}
                  className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted transition-colors"
                >
                  <Unlock className="h-3.5 w-3.5" />
                  <span>Mở Khóa Sổ</span>
                </button>
              </>
            )}

            {periodStatus === 'PAID' && (
              <span className="flex items-center gap-1.5 rounded-lg bg-emerald-100 px-3 py-2 text-xs font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                <Check className="h-4 w-4" /> Đã Hoàn Tất Chi Lương
              </span>
            )}

            <button
              type="button"
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-sm font-semibold shadow-xs hover:bg-muted transition-colors"
            >
              <Download className="h-4 w-4 text-emerald-600" />
              <span>Xuất Excel</span>
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-sm font-semibold shadow-xs hover:bg-muted transition-colors"
            >
              <Printer className="h-4 w-4 text-muted-foreground" />
              <span>In Bảng Lương</span>
            </button>
          </div>
        </div>

        {/* 4 Summary Cards */}
        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
            <span className="text-xs font-medium text-muted-foreground">Tổng Thu Nhập (GROSS)</span>
            <p className="mt-1 text-xl font-black text-foreground">{formatVND(totals.grossSalary)}</p>
            <span className="text-[11px] text-muted-foreground">{filteredRecords.length} người lao động</span>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
            <span className="text-xs font-medium text-muted-foreground">Tổng Thực Lĩnh (NET)</span>
            <p className="mt-1 text-xl font-black text-emerald-600">{formatVND(totals.netSalary)}</p>
            <span className="text-[11px] text-emerald-600 font-medium">Chi trả qua tài khoản ngân hàng</span>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
            <span className="text-xs font-medium text-muted-foreground">Thuế TNCN & BH Người LĐ</span>
            <p className="mt-1 text-xl font-black text-blue-600">
              {formatVND(totals.personalIncomeTax + totals.totalEmployeeInsurance)}
            </p>
            <span className="text-[11px] text-muted-foreground">
              Thuế: {formatVND(totals.personalIncomeTax)} · BH: {formatVND(totals.totalEmployeeInsurance)}
            </span>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
            <span className="text-xs font-medium text-muted-foreground">Tổng Chi Phí Doanh Nghiệp</span>
            <p className="mt-1 text-xl font-black text-purple-600">{formatVND(totals.totalCompanyExpense)}</p>
            <span className="text-[11px] text-muted-foreground">
              Gồm 23.5% BHXH + BHYT + BHTN + KPCĐ cty
            </span>
          </div>
        </div>

        {/* Filter bar */}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <label htmlFor="payroll-month" className="sr-only">Chọn tháng bảng lương</label>
              <input
                id="payroll-month"
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="border-input bg-card rounded-lg border px-3 py-1.5 text-sm font-semibold focus:border-primary focus:outline-none"
              />
            </div>

            <div className="relative">
              <Search className="text-muted-foreground absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm mã NV, họ tên..."
                className="border-input bg-card rounded-lg border py-1.5 pr-3 pl-8 text-xs focus:border-primary focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="payroll-dept" className="sr-only">Lọc theo phòng ban</label>
              <select
                id="payroll-dept"
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="border-input bg-card rounded-lg border px-3 py-1.5 text-xs font-medium focus:border-primary focus:outline-none"
              >
                <option value="ALL">Tất cả phòng ban</option>
                {MOCK_DEPARTMENTS.map((d) => (
                  <option key={d.id} value={d.name}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1 rounded bg-amber-100 dark:bg-amber-950 px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:text-amber-300">
              <span className="h-2 w-2 rounded-full bg-amber-500" /> Ô màu vàng: Cho phép chỉnh sửa trực tiếp số liệu
            </span>
          </div>
        </div>

        {/* Master Spreadsheet Table */}
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
          <div className="overflow-x-auto max-h-[620px]">
            <table className="w-full border-collapse text-left text-xs">
              <thead className="bg-muted sticky top-0 z-20 text-[11px] font-bold text-muted-foreground uppercase border-b border-border shadow-xs">
                <tr>
                  {/* Sticky identity columns */}
                  <th className="sticky left-0 z-30 bg-muted px-2 py-3 text-center border-r border-border min-w-[36px]">
                    STT
                  </th>
                  <th className="sticky left-[36px] z-30 bg-muted px-3 py-3 border-r border-border min-w-[80px]">
                    Mã NV
                  </th>
                  <th className="sticky left-[116px] z-30 bg-muted px-3 py-3 border-r border-border min-w-[150px]">
                    Họ và Tên
                  </th>

                  {/* Lương & Công */}
                  <th className="px-3 py-3 text-right border-r border-border min-w-[100px]">Lương Cơ Bản</th>
                  <th className="px-2 py-3 text-center border-r border-border min-w-[50px]">Công Chuẩn</th>
                  <th className="px-2 py-3 text-center border-r border-border min-w-[55px]">Công Hưởng</th>
                  <th className="px-3 py-3 text-right border-r border-border min-w-[100px]">Lương Thời Gian</th>

                  {/* Sản phẩm & Thưởng (Yellow Editable) */}
                  <th className="bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-200 px-2 py-3 text-center border-r border-border min-w-[70px]">
                    SL Sản Phẩm
                  </th>
                  <th className="px-3 py-3 text-right border-r border-border min-w-[95px]">Lương Sản Phẩm</th>
                  <th className="bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-200 px-3 py-3 text-right border-r border-border min-w-[95px]">
                    Khen Thưởng
                  </th>

                  {/* Phụ cấp & OT */}
                  <th className="px-3 py-3 text-right border-r border-border min-w-[95px]">Tổng Phụ Cấp</th>
                  <th className="bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-200 px-2 py-3 text-center border-r border-border min-w-[60px]">
                    Giờ OT
                  </th>
                  <th className="px-3 py-3 text-right border-r border-border min-w-[95px]">Tiền Làm Thêm</th>

                  {/* TỔNG THU NHẬP GROSS */}
                  <th className="bg-primary/10 text-primary px-3 py-3 text-right font-black border-r border-border min-w-[115px]">
                    TỔNG GROSS
                  </th>

                  {/* Bảo hiểm & Thuế */}
                  <th className="px-3 py-3 text-right border-r border-border min-w-[95px]">BHXH (8%)</th>
                  <th className="px-3 py-3 text-right border-r border-border min-w-[85px]">BHYT (1.5%)</th>
                  <th className="px-3 py-3 text-right border-r border-border min-w-[85px]">BHTN (1%)</th>
                  <th className="px-3 py-3 text-right border-r border-border min-w-[100px]">Tổng BH Trừ Lương</th>
                  <th className="px-3 py-3 text-right border-r border-border min-w-[95px]">Thuế TNCN</th>
                  <th className="bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-200 px-3 py-3 text-right border-r border-border min-w-[90px]">
                    Tạm Ứng
                  </th>

                  {/* THỰC LĨNH NET */}
                  <th className="bg-emerald-100 text-emerald-950 dark:bg-emerald-900 dark:text-emerald-100 px-3 py-3 text-right font-black border-r border-border min-w-[120px]">
                    THỰC LĨNH (NET)
                  </th>

                  {/* Chi phí cty */}
                  <th className="px-3 py-3 text-right border-r border-border min-w-[105px]">BH NSDLĐ (23.5%)</th>
                  <th className="px-3 py-3 text-right border-r border-border min-w-[120px]">Tổng Chi Phí Cty</th>

                  {/* Hành động */}
                  <th className="px-3 py-3 text-center min-w-[80px]">Hành Động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredRecords.map((rec, index) => {
                  const empInput = customInputs[rec.employeeId] || {
                    pieceRateQuantity: 0,
                    bonusAmount: 0,
                    advancePayment: 0,
                    overtimeHours: 0,
                    otherDeduction: 0,
                  };

                  return (
                    <tr key={rec.id} className="hover:bg-muted/40 transition-colors">
                      {/* Sticky identity */}
                      <td className="sticky left-0 z-10 bg-card px-2 py-2.5 text-center font-mono text-muted-foreground border-r border-border">
                        {index + 1}
                      </td>
                      <td className="sticky left-[36px] z-10 bg-card px-3 py-2.5 font-mono font-bold text-primary border-r border-border">
                        {rec.employeeCode}
                      </td>
                      <td className="sticky left-[116px] z-10 bg-card px-3 py-2.5 border-r border-border">
                        <div className="font-semibold text-foreground truncate max-w-[140px]">{rec.employeeName}</div>
                        <div className="text-[10px] text-muted-foreground truncate">{rec.departmentName}</div>
                      </td>

                      {/* Lương & Công */}
                      <td className="px-3 py-2.5 text-right font-mono border-r border-border">
                        {formatVND(rec.baseSalary)}
                      </td>
                      <td className="px-2 py-2.5 text-center font-mono border-r border-border">
                        {rec.standardWorkingDays}
                      </td>
                      <td className="px-2 py-2.5 text-center font-mono font-bold text-foreground border-r border-border">
                        {rec.paidDaysCount}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono border-r border-border">
                        {formatVND(rec.timeBasedSalary)}
                      </td>

                      {/* Yellow Editable: SL Sản Phẩm */}
                      <td className="bg-amber-50/70 dark:bg-amber-950/30 p-1 text-center border-r border-border">
                        {rec.pieceRateUnitPrice > 0 ? (
                          <input
                            type="number"
                            min={0}
                            value={empInput.pieceRateQuantity}
                            onChange={(e) =>
                              handleUpdateInput(rec.employeeId, 'pieceRateQuantity', Number(e.target.value))
                            }
                            aria-label={`Sản lượng của ${rec.employeeName}`}
                            className="w-16 rounded border border-amber-300 bg-background px-1.5 py-1 text-center font-mono text-xs font-bold text-amber-800 dark:border-amber-700 dark:text-amber-200 focus:outline-none"
                          />
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono border-r border-border">
                        {rec.pieceRateSalary > 0 ? formatVND(rec.pieceRateSalary) : '-'}
                      </td>

                      {/* Yellow Editable: Khen Thưởng */}
                      <td className="bg-amber-50/70 dark:bg-amber-950/30 p-1 text-right border-r border-border">
                        <input
                          type="number"
                          step={100000}
                          min={0}
                          value={empInput.bonusAmount}
                          onChange={(e) =>
                            handleUpdateInput(rec.employeeId, 'bonusAmount', Number(e.target.value))
                          }
                          aria-label={`Khen thưởng của ${rec.employeeName}`}
                          className="w-20 rounded border border-amber-300 bg-background px-1.5 py-1 text-right font-mono text-xs font-bold text-amber-800 dark:border-amber-700 dark:text-amber-200 focus:outline-none"
                        />
                      </td>

                      {/* Phụ cấp & OT */}
                      <td className="px-3 py-2.5 text-right font-mono border-r border-border">
                        {formatVND(rec.totalAllowances)}
                      </td>

                      {/* Yellow Editable: Giờ OT */}
                      <td className="bg-amber-50/70 dark:bg-amber-950/30 p-1 text-center border-r border-border">
                        <input
                          type="number"
                          min={0}
                          max={80}
                          value={empInput.overtimeHours}
                          onChange={(e) =>
                            handleUpdateInput(rec.employeeId, 'overtimeHours', Number(e.target.value))
                          }
                          aria-label={`Giờ tăng ca của ${rec.employeeName}`}
                          className="w-12 rounded border border-amber-300 bg-background px-1 py-1 text-center font-mono text-xs font-bold text-amber-800 dark:border-amber-700 dark:text-amber-200 focus:outline-none"
                        />
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono border-r border-border">
                        {rec.overtimePay > 0 ? formatVND(rec.overtimePay) : '-'}
                      </td>

                      {/* TỔNG THU NHẬP GROSS */}
                      <td className="bg-primary/5 px-3 py-2.5 text-right font-mono font-bold text-primary border-r border-border">
                        {formatVND(rec.grossSalary)}
                      </td>

                      {/* Bảo hiểm & Thuế */}
                      <td className="px-3 py-2.5 text-right font-mono border-r border-border">
                        {formatVND(rec.employeeInsurance.bhxh)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono border-r border-border">
                        {formatVND(rec.employeeInsurance.bhyt)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono border-r border-border">
                        {formatVND(rec.employeeInsurance.bhtn)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono font-bold text-muted-foreground border-r border-border">
                        {formatVND(rec.totalEmployeeInsurance)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono font-bold text-rose-600 border-r border-border">
                        {rec.personalIncomeTax > 0 ? formatVND(rec.personalIncomeTax) : '0'}
                      </td>

                      {/* Yellow Editable: Tạm Ứng */}
                      <td className="bg-amber-50/70 dark:bg-amber-950/30 p-1 text-right border-r border-border">
                        <input
                          type="number"
                          step={500000}
                          min={0}
                          value={empInput.advancePayment}
                          onChange={(e) =>
                            handleUpdateInput(rec.employeeId, 'advancePayment', Number(e.target.value))
                          }
                          aria-label={`Tạm ứng của ${rec.employeeName}`}
                          className="w-20 rounded border border-amber-300 bg-background px-1.5 py-1 text-right font-mono text-xs font-bold text-amber-800 dark:border-amber-700 dark:text-amber-200 focus:outline-none"
                        />
                      </td>

                      {/* THỰC LĨNH NET */}
                      <td className="bg-emerald-50 dark:bg-emerald-950/40 px-3 py-2.5 text-right font-mono font-black text-emerald-600 dark:text-emerald-400 border-r border-border">
                        {formatVND(rec.netSalary)}
                      </td>

                      {/* Chi phí cty */}
                      <td className="px-3 py-2.5 text-right font-mono text-muted-foreground border-r border-border">
                        {formatVND(rec.totalEmployerCost)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono font-bold text-purple-700 dark:text-purple-300 border-r border-border">
                        {formatVND(rec.totalCompanyExpense)}
                      </td>

                      {/* Hành động */}
                      <td className="px-3 py-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => handleOpenSlip(rec)}
                          className="inline-flex items-center gap-1 rounded bg-primary/10 px-2 py-1 text-xs font-bold text-primary hover:bg-primary/20 transition-colors"
                          title="Xem & In phiếu lương cá nhân"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>Phiếu</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {/* TỔNG CỘNG HÀNG DƯỚI CÙNG */}
              <tfoot className="bg-muted/80 sticky bottom-0 font-bold border-t-2 border-border">
                <tr>
                  <td colSpan={3} className="sticky left-0 z-10 bg-muted/90 px-3 py-3 text-center border-r border-border">
                    TỔNG CỘNG ({filteredRecords.length} NV)
                  </td>
                  <td className="px-3 py-3 text-right font-mono border-r border-border">
                    {formatVND(totals.baseSalary)}
                  </td>
                  <td className="border-r border-border"></td>
                  <td className="border-r border-border"></td>
                  <td className="px-3 py-3 text-right font-mono border-r border-border">
                    {formatVND(totals.timeBasedSalary)}
                  </td>
                  <td className="border-r border-border"></td>
                  <td className="px-3 py-3 text-right font-mono border-r border-border">
                    {formatVND(totals.pieceRateSalary)}
                  </td>
                  <td className="px-3 py-3 text-right font-mono border-r border-border">
                    {formatVND(totals.bonusAmount)}
                  </td>
                  <td className="px-3 py-3 text-right font-mono border-r border-border">
                    {formatVND(totals.totalAllowances)}
                  </td>
                  <td className="border-r border-border"></td>
                  <td className="px-3 py-3 text-right font-mono border-r border-border">
                    {formatVND(totals.overtimePay)}
                  </td>
                  <td className="bg-primary/15 px-3 py-3 text-right font-mono font-black text-primary border-r border-border">
                    {formatVND(totals.grossSalary)}
                  </td>
                  <td className="px-3 py-3 text-right font-mono border-r border-border">
                    {formatVND(totals.employeeBhxh)}
                  </td>
                  <td className="px-3 py-3 text-right font-mono border-r border-border">
                    {formatVND(totals.employeeBhyt)}
                  </td>
                  <td className="px-3 py-3 text-right font-mono border-r border-border">
                    {formatVND(totals.employeeBhtn)}
                  </td>
                  <td className="px-3 py-3 text-right font-mono font-black border-r border-border">
                    {formatVND(totals.totalEmployeeInsurance)}
                  </td>
                  <td className="px-3 py-3 text-right font-mono font-black text-rose-600 border-r border-border">
                    {formatVND(totals.personalIncomeTax)}
                  </td>
                  <td className="px-3 py-3 text-right font-mono border-r border-border">
                    {formatVND(totals.advancePayment)}
                  </td>
                  <td className="bg-emerald-100 text-emerald-950 dark:bg-emerald-950 dark:text-emerald-200 px-3 py-3 text-right font-mono font-black border-r border-border">
                    {formatVND(totals.netSalary)}
                  </td>
                  <td className="px-3 py-3 text-right font-mono text-muted-foreground border-r border-border">
                    {formatVND(totals.totalEmployerCost)}
                  </td>
                  <td className="px-3 py-3 text-right font-mono font-black text-purple-700 dark:text-purple-300 border-r border-border">
                    {formatVND(totals.totalCompanyExpense)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </main>

      {/* Salary Slip Modal */}
      <SalarySlipModal
        record={selectedSlipRecord}
        isOpen={isSlipModalOpen}
        onClose={() => setIsSlipModalOpen(false)}
        yearMonth={selectedMonth}
      />
    </div>
  );
}
