import {
  AlertTriangle,
  ArrowRightLeft,
  Building2,
  Calculator,
  Calendar,
  CheckCircle2,
  DollarSign,
  Download,
  FileCheck,
  FileSpreadsheet,
  FileText,
  Info,
  Percent,
  Printer,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  Users
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { DemoBanner } from '../components/DemoBanner';
import { TenantSwitcher } from '../components/TenantSwitcher';
import { MOCK_EMPLOYEES, MOCK_SETTINGS, MOCK_TENANT } from '../mockData';
import { formatNumber, formatVND } from '../utils/docSo';
import { calcEmployeePayroll, calculateProgressivePIT } from '../utils/payrollEngine';

export function TaxInsuranceReportsPage() {
  const [activeTab, setActiveTab] = useState<'INSURANCE_TAX' | 'FINALIZATION' | 'CALCULATOR'>('INSURANCE_TAX');
  const [selectedYear, setSelectedYear] = useState('2026');
  const [selectedMonth, setSelectedMonth] = useState('2026-04');

  // Interactive Gross ⇄ Net Calculator States
  const [calcMode, setCalcMode] = useState<'GROSS_TO_NET' | 'NET_TO_GROSS'>('GROSS_TO_NET');
  const [inputSalary, setInputSalary] = useState<number>(25000000);
  const [calcDependents, setCalcDependents] = useState<number>(1);
  const [calcInsuranceBasis, setCalcInsuranceBasis] = useState<'FULL' | 'CUSTOM'>('FULL');
  const [customInsuranceSalary, setCustomInsuranceSalary] = useState<number>(10000000);
  const [taxRuleVersion, setTaxRuleVersion] = useState<'2026_5_TIER' | 'LEGACY_7_TIER'>('2026_5_TIER');

  // Tính toán bảng lương mẫu tháng 4 cho tab 1
  const monthPayrollList = useMemo(() => {
    return MOCK_EMPLOYEES.map((emp) => {
      const isAbsentHeavy = emp.code === 'NV006';
      const actualWorkDays = isAbsentHeavy ? 11 : 24;
      const unpaidLeaveDays = isAbsentHeavy ? 15 : 0;
      const paidLeaveDays = 2;
      const paidDaysCount = actualWorkDays + paidLeaveDays;
      const overtimeHours = emp.departmentName === 'Sản Xuất & Kỹ Thuật' ? 12 : 0;

      return calcEmployeePayroll(
        emp,
        {
          actualWorkDays,
          paidLeaveDays,
          unpaidLeaveDays,
          paidDaysCount,
          overtimeHours,
        },
        {
          pieceRateQuantity: emp.pieceRateUnitPrice > 0 ? 850 : 0,
          bonusAmount: emp.departmentName === 'Kinh Doanh & CSKH' ? 2000000 : 0,
          advancePayment: emp.code === 'NV005' ? 2000000 : 0,
        },
        MOCK_SETTINGS,
        selectedMonth
      );
    });
  }, [selectedMonth]);

  // Tổng hợp quỹ bảo hiểm tháng
  const insuranceSummary = useMemo(() => {
    const totalSalaryFund = monthPayrollList.reduce((acc, r) => acc + r.insuranceSalary, 0);
    const employeeBhxh = monthPayrollList.reduce((acc, r) => acc + r.employeeInsurance.bhxh, 0);
    const employeeBhyt = monthPayrollList.reduce((acc, r) => acc + r.employeeInsurance.bhyt, 0);
    const employeeBhtn = monthPayrollList.reduce((acc, r) => acc + r.employeeInsurance.bhtn, 0);
    const totalEmployeeIns = employeeBhxh + employeeBhyt + employeeBhtn;

    const employerBhxh = monthPayrollList.reduce((acc, r) => acc + r.employerInsurance.bhxh, 0);
    const employerBhyt = monthPayrollList.reduce((acc, r) => acc + r.employerInsurance.bhyt, 0);
    const employerBhtn = monthPayrollList.reduce((acc, r) => acc + r.employerInsurance.bhtn, 0);
    const employerKpcd = monthPayrollList.reduce((acc, r) => acc + r.employerInsurance.tradeUnion, 0);
    const totalEmployerIns = employerBhxh + employerBhyt + employerBhtn + employerKpcd;

    const totalPit = monthPayrollList.reduce((acc, r) => acc + r.personalIncomeTax, 0);

    return {
      totalSalaryFund,
      employeeBhxh,
      employeeBhyt,
      employeeBhtn,
      totalEmployeeIns,
      employerBhxh,
      employerBhyt,
      employerBhtn,
      employerKpcd,
      totalEmployerIns,
      grandTotalObligation: totalEmployeeIns + totalEmployerIns,
      totalPit,
    };
  }, [monthPayrollList]);

  // Tính toán công cụ Gross ⇄ Net 2 chiều
  const calculatorResult = useMemo(() => {
    const insCeiling = MOCK_SETTINGS.insuranceCeilingSalary; // 46.800.000
    const bhtnCeiling = MOCK_SETTINGS.unemploymentInsuranceCeilingSalary; // 99.200.000
    const selfDeduction = 11000000;
    const depDeduction = calcDependents * 4400000;
    const totalFamilyDeduction = selfDeduction + depDeduction;

    let gross = 0;
    let net = 0;

    if (calcMode === 'GROSS_TO_NET') {
      gross = inputSalary;
      const insBase = calcInsuranceBasis === 'FULL' ? gross : customInsuranceSalary;
      const cappedBhxhBase = Math.min(insBase, insCeiling);
      const cappedBhtnBase = Math.min(insBase, bhtnCeiling);

      const bhxh = Math.round(cappedBhxhBase * 0.08);
      const bhyt = Math.round(cappedBhxhBase * 0.015);
      const bhtn = Math.round(cappedBhtnBase * 0.01);
      const totalEmpIns = bhxh + bhyt + bhtn;

      const taxableIncome = Math.max(0, gross - totalEmpIns - 730000); // Giả định phụ cấp ăn 730k miễn thuế
      const assessableIncome = Math.max(0, taxableIncome - totalFamilyDeduction);
      const pit = calculateProgressivePIT(assessableIncome, taxRuleVersion);
      net = gross - totalEmpIns - pit;

      // Employer
      const erBhxh = Math.round(cappedBhxhBase * 0.175);
      const erBhyt = Math.round(cappedBhxhBase * 0.03);
      const erBhtn = Math.round(cappedBhtnBase * 0.01);
      const erKpcd = Math.round(cappedBhxhBase * 0.02);
      const totalErCost = erBhxh + erBhyt + erBhtn + erKpcd;

      return {
        gross,
        net,
        bhxh,
        bhyt,
        bhtn,
        totalEmpIns,
        taxableIncome,
        totalFamilyDeduction,
        assessableIncome,
        pit,
        erBhxh,
        erBhyt,
        erBhtn,
        erKpcd,
        totalErCost,
        totalCompanyExpense: gross + totalErCost,
      };
    } else {
      // NET TO GROSS: Tìm kiếm nhị phân xấp xỉ chính xác đến 1.000 VND
      let low = inputSalary;
      let high = inputSalary * 2.5;
      let bestGross = inputSalary;

      for (let i = 0; i < 40; i++) {
        const mid = Math.round((low + high) / 2);
        const insBase = calcInsuranceBasis === 'FULL' ? mid : customInsuranceSalary;
        const cappedBhxhBase = Math.min(insBase, insCeiling);
        const cappedBhtnBase = Math.min(insBase, bhtnCeiling);

        const bhxh = Math.round(cappedBhxhBase * 0.08);
        const bhyt = Math.round(cappedBhxhBase * 0.015);
        const bhtn = Math.round(cappedBhtnBase * 0.01);
        const totalEmpIns = bhxh + bhyt + bhtn;

        const taxable = Math.max(0, mid - totalEmpIns - 730000);
        const assessable = Math.max(0, taxable - totalFamilyDeduction);
        const p = calculateProgressivePIT(assessable, taxRuleVersion);
        const calculatedNet = mid - totalEmpIns - p;

        if (Math.abs(calculatedNet - inputSalary) < 500) {
          bestGross = mid;
          break;
        }
        if (calculatedNet < inputSalary) {
          low = mid;
        } else {
          high = mid;
        }
        bestGross = mid;
      }

      gross = bestGross;
      const insBase = calcInsuranceBasis === 'FULL' ? gross : customInsuranceSalary;
      const cappedBhxhBase = Math.min(insBase, insCeiling);
      const cappedBhtnBase = Math.min(insBase, bhtnCeiling);

      const bhxh = Math.round(cappedBhxhBase * 0.08);
      const bhyt = Math.round(cappedBhxhBase * 0.015);
      const bhtn = Math.round(cappedBhtnBase * 0.01);
      const totalEmpIns = bhxh + bhyt + bhtn;

      const taxableIncome = Math.max(0, gross - totalEmpIns - 730000);
      const assessableIncome = Math.max(0, taxableIncome - totalFamilyDeduction);
      const pit = calculateProgressivePIT(assessableIncome, taxRuleVersion);

      const erBhxh = Math.round(cappedBhxhBase * 0.175);
      const erBhyt = Math.round(cappedBhxhBase * 0.03);
      const erBhtn = Math.round(cappedBhtnBase * 0.01);
      const erKpcd = Math.round(cappedBhxhBase * 0.02);
      const totalErCost = erBhxh + erBhyt + erBhtn + erKpcd;

      return {
        gross,
        net: inputSalary,
        bhxh,
        bhyt,
        bhtn,
        totalEmpIns,
        taxableIncome,
        totalFamilyDeduction,
        assessableIncome,
        pit,
        erBhxh,
        erBhyt,
        erBhtn,
        erKpcd,
        totalErCost,
        totalCompanyExpense: gross + totalErCost,
      };
    }
  }, [calcMode, inputSalary, calcDependents, calcInsuranceBasis, customInsuranceSalary, taxRuleVersion]);

  return (
    <div className="bg-background text-foreground min-h-screen">
      <DemoBanner />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Báo Cáo Thuế, BHXH & Quyết Toán</h1>
              <span className="rounded-full bg-primary/10 px-3 py-0.5 text-xs font-bold text-primary">
                Năm tài chính {selectedYear}
              </span>
            </div>
            <p className="text-muted-foreground mt-1 text-sm">
              Tổng hợp nghĩa vụ trích nộp bảo hiểm, thuế thu nhập cá nhân theo biểu mẫu cơ quan thuế và công cụ quy đổi Gross ⇄ Net.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <TenantSwitcher />
            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-sm font-semibold shadow-xs hover:bg-muted transition-colors"
            >
              <Printer className="h-4 w-4 text-muted-foreground" />
              <span>In Báo Cáo</span>
            </button>
            <button
              type="button"
              onClick={() => alert('Đã xuất báo cáo ra file Excel mẫu C70a-HD / 05-1/BK-TNCN (Chế độ demo)!')}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
            >
              <Download className="h-4 w-4" />
              <span>Xuất Báo Cáo Thuế</span>
            </button>
          </div>
        </div>

        {/* 3 Nav Tabs */}
        <div className="mb-6 border-b border-border flex gap-6 text-sm font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('INSURANCE_TAX')}
            className={`pb-3 border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'INSURANCE_TAX'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <ShieldCheck className="h-4 w-4" />
            <span>1. Nghĩa Vụ Trích Nộp BHXH & Thuế Tháng</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('FINALIZATION')}
            className={`pb-3 border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'FINALIZATION'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <FileCheck className="h-4 w-4" />
            <span>2. Bảng Kê Quyết Toán Năm (05-1/BK-TNCN)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('CALCULATOR')}
            className={`pb-3 border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'CALCULATOR'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Calculator className="h-4 w-4" />
            <span>3. Công Cụ Tính Gross ⇄ Net 2 Chiều</span>
          </button>
        </div>

        {/* TAB 1: BÁO CÁO BẢO HIỂM & THUẾ THÁNG */}
        {activeTab === 'INSURANCE_TAX' && (
          <div className="space-y-6">
            {/* Warning banner về trần bảo hiểm & quy định 14 ngày */}
            <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-4 text-xs text-blue-900 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-200">
              <div className="flex items-start gap-2.5">
                <Info className="h-5 w-5 shrink-0 text-blue-600 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold text-sm">Quy tắc nghiệp vụ trích nộp Bảo hiểm & Thuế đã áp dụng:</p>
                  <ul className="list-disc list-inside space-y-0.5 text-blue-800 dark:text-blue-300">
                    <li>
                      <strong>Trần đóng BHXH/BHYT:</strong> Tối đa 20 lần mức lương cơ sở = {formatVND(MOCK_SETTINGS.insuranceCeilingSalary)} (áp dụng cho NV001 An, NV002 Bình).
                    </li>
                    <li>
                      <strong>Trần đóng BHTN:</strong> Tối đa 20 lần lương tối thiểu vùng I = {formatVND(MOCK_SETTINGS.unemploymentInsuranceCeilingSalary)}.
                    </li>
                    <li>
                      <strong>Quy tắc 14 ngày nghỉ không lương:</strong> Nhân viên NV006 (Hoàng Thị Mai) có 15 ngày nghỉ KL trong tháng 4 nên tạm dừng trích đóng bảo hiểm tháng này.
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* 3 Overview Obligation Cards */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
                <span className="text-xs font-semibold text-muted-foreground">
                  Trích nộp từ Người Lao Động (10.5%)
                </span>
                <p className="mt-2 text-2xl font-black text-foreground">
                  {formatVND(insuranceSummary.totalEmployeeIns)}
                </p>
                <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                  <div className="flex justify-between">
                    <span>BHXH (8%):</span>
                    <span className="font-mono font-semibold">{formatVND(insuranceSummary.employeeBhxh)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>BHYT (1.5%):</span>
                    <span className="font-mono font-semibold">{formatVND(insuranceSummary.employeeBhyt)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>BHTN (1%):</span>
                    <span className="font-mono font-semibold">{formatVND(insuranceSummary.employeeBhtn)}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
                <span className="text-xs font-semibold text-muted-foreground">
                  Doanh Nghiệp Đóng (23.5% gồm KPCĐ)
                </span>
                <p className="mt-2 text-2xl font-black text-purple-600">
                  {formatVND(insuranceSummary.totalEmployerIns)}
                </p>
                <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                  <div className="flex justify-between">
                    <span>BHXH (17.5%):</span>
                    <span className="font-mono font-semibold">{formatVND(insuranceSummary.employerBhxh)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>BHYT (3%):</span>
                    <span className="font-mono font-semibold">{formatVND(insuranceSummary.employerBhyt)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>BHTN (1%) + KPCĐ (2%):</span>
                    <span className="font-mono font-semibold">
                      {formatVND(insuranceSummary.employerBhtn + insuranceSummary.employerKpcd)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
                <span className="text-xs font-semibold text-muted-foreground">
                  Tổng Nghĩa Vụ Phải Nộp Cơ Quan Nhà Nước
                </span>
                <p className="mt-2 text-2xl font-black text-emerald-600">
                  {formatVND(insuranceSummary.grandTotalObligation + insuranceSummary.totalPit)}
                </p>
                <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Cơ quan BHXH (32%):</span>
                    <span className="font-mono font-semibold">
                      {formatVND(insuranceSummary.grandTotalObligation - insuranceSummary.employerKpcd)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Kinh phí công đoàn (2%):</span>
                    <span className="font-mono font-semibold">{formatVND(insuranceSummary.employerKpcd)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Cơ quan Thuế (Thuế TNCN):</span>
                    <span className="font-mono font-semibold text-rose-600">{formatVND(insuranceSummary.totalPit)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Detailed Table */}
            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
              <div className="border-b border-border bg-muted/40 px-4 py-3 flex items-center justify-between">
                <h3 className="font-bold text-sm">Bảng Trích Nộp BHXH & Thuế Từng Nhân Viên — Tháng {selectedMonth}</h3>
                <span className="text-xs text-muted-foreground">Đơn vị tiền: VNĐ</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted text-muted-foreground uppercase border-b border-border font-semibold">
                    <tr>
                      <th className="px-3 py-3">Mã NV</th>
                      <th className="px-3 py-3">Họ và Tên</th>
                      <th className="px-3 py-3 text-right">Lương Đóng BH</th>
                      <th className="px-3 py-3 text-right">BHXH (8%)</th>
                      <th className="px-3 py-3 text-right">BHYT (1.5%)</th>
                      <th className="px-3 py-3 text-right">BHTN (1%)</th>
                      <th className="px-3 py-3 text-right font-bold text-foreground">Tổng NLĐ Trừ</th>
                      <th className="px-3 py-3 text-right text-purple-700 dark:text-purple-300">NSDLĐ Đóng (23.5%)</th>
                      <th className="px-3 py-3 text-right font-bold text-rose-600">Thuế TNCN</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {monthPayrollList.map((rec) => (
                      <tr key={rec.id} className="hover:bg-muted/30">
                        <td className="px-3 py-2.5 font-mono font-bold text-primary">{rec.employeeCode}</td>
                        <td className="px-3 py-2.5 font-medium">{rec.employeeName}</td>
                        <td className="px-3 py-2.5 text-right font-mono">{formatVND(rec.insuranceSalary)}</td>
                        <td className="px-3 py-2.5 text-right font-mono">{formatVND(rec.employeeInsurance.bhxh)}</td>
                        <td className="px-3 py-2.5 text-right font-mono">{formatVND(rec.employeeInsurance.bhyt)}</td>
                        <td className="px-3 py-2.5 text-right font-mono">{formatVND(rec.employeeInsurance.bhtn)}</td>
                        <td className="px-3 py-2.5 text-right font-mono font-bold">{formatVND(rec.totalEmployeeInsurance)}</td>
                        <td className="px-3 py-2.5 text-right font-mono text-purple-700 dark:text-purple-300">
                          {formatVND(rec.totalEmployerCost)}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono font-bold text-rose-600">
                          {rec.personalIncomeTax > 0 ? formatVND(rec.personalIncomeTax) : '0'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: QUYẾT TOÁN THUẾ NĂM (MẪU 05-1/BK-TNCN) */}
        {activeTab === 'FINALIZATION' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between rounded-xl border border-border bg-card p-4 shadow-xs">
              <div>
                <h3 className="font-bold text-base">Bảng Kê Chi Tiết Cá Nhân Nhận Thu Nhập Từ Tiền Lương, Tiền Công</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Phục vụ lập Tờ khai quyết toán thuế TNCN mẫu 05-1/BK-TNCN (Ban hành kèm Thông tư 80/2021/TT-BTC)
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-muted-foreground">Năm quyết toán:</span>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="rounded-lg border border-border bg-background px-3 py-1 text-xs font-bold"
                >
                  <option value="2026">2026 (Dự báo)</option>
                  <option value="2025">2025 (Chính thức)</option>
                </select>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted text-muted-foreground uppercase border-b border-border font-semibold">
                    <tr>
                      <th className="px-3 py-3 text-center">STT</th>
                      <th className="px-3 py-3">Mã NV & Họ Tên</th>
                      <th className="px-3 py-3 text-center">Số NPT</th>
                      <th className="px-3 py-3 text-right">Tổng TN Chịu Thuế (Cả năm)</th>
                      <th className="px-3 py-3 text-right">Giảm Trừ Bản Thân (132tr)</th>
                      <th className="px-3 py-3 text-right">Giảm Trừ NPT</th>
                      <th className="px-3 py-3 text-right">Bảo Hiểm Đã Trừ</th>
                      <th className="px-3 py-3 text-right">TN Tính Thuế</th>
                      <th className="px-3 py-3 text-right font-bold">Thuế Phải Nộp (Quyết toán)</th>
                      <th className="px-3 py-3 text-right">Đã Khấu Trừ Hàng Tháng</th>
                      <th className="px-3 py-3 text-right font-bold text-emerald-600">Chênh Lệch</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {MOCK_EMPLOYEES.map((emp, idx) => {
                      // Mô phỏng số liệu 12 tháng
                      const annualGross = emp.baseSalary * 12 + 25000000; // Có thưởng Tết
                      const selfDeductionAnnual = 132000000;
                      const nptDeductionAnnual = emp.taxDependentsCount * 4400000 * 12;
                      const annualIns = Math.min(emp.insuranceSalary, 46800000) * 0.105 * 12;
                      const taxableAnnual = Math.max(0, annualGross - 730000 * 12);
                      const assessableAnnual = Math.max(0, taxableAnnual - selfDeductionAnnual - nptDeductionAnnual - annualIns);
                      // Thuế theo biểu năm = 12 x thuế biểu tháng tính trên assessableAnnual / 12
                      const monthlyAssessable = assessableAnnual / 12;
                      const monthlyPit = calculateProgressivePIT(monthlyAssessable, '2026_5_TIER');
                      const annualPit = monthlyPit * 12;
                      const alreadyWithheld = annualPit; // Cân bằng

                      return (
                        <tr key={emp.id} className="hover:bg-muted/30">
                          <td className="px-3 py-2.5 text-center font-mono text-muted-foreground">{idx + 1}</td>
                          <td className="px-3 py-2.5">
                            <span className="font-mono font-bold text-primary mr-1.5">{emp.code}</span>
                            <span className="font-semibold">{emp.name}</span>
                          </td>
                          <td className="px-3 py-2.5 text-center font-mono">{emp.taxDependentsCount}</td>
                          <td className="px-3 py-2.5 text-right font-mono">{formatVND(annualGross)}</td>
                          <td className="px-3 py-2.5 text-right font-mono">{formatVND(selfDeductionAnnual)}</td>
                          <td className="px-3 py-2.5 text-right font-mono">{formatVND(nptDeductionAnnual)}</td>
                          <td className="px-3 py-2.5 text-right font-mono">{formatVND(annualIns)}</td>
                          <td className="px-3 py-2.5 text-right font-mono font-semibold">{formatVND(assessableAnnual)}</td>
                          <td className="px-3 py-2.5 text-right font-mono font-bold text-rose-600">{formatVND(annualPit)}</td>
                          <td className="px-3 py-2.5 text-right font-mono">{formatVND(alreadyWithheld)}</td>
                          <td className="px-3 py-2.5 text-right font-mono font-bold text-emerald-600">0</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: CÔNG CỤ TÍNH LƯƠNG GROSS ⇄ NET 2 CHIỀU */}
        {activeTab === 'CALCULATOR' && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Input Controls (Left Column 5 cols) */}
            <div className="rounded-xl border border-border bg-card p-6 shadow-xs lg:col-span-5 space-y-5">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h3 className="font-bold text-base flex items-center gap-2">
                  <Calculator className="h-5 w-5 text-primary" />
                  <span>Tham Số Tính Lương</span>
                </h3>
                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">
                  Chuẩn 2026
                </span>
              </div>

              {/* Mode Toggle: Gross -> Net vs Net -> Gross */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Hướng chuyển đổi:</label>
                <div className="mt-1.5 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCalcMode('GROSS_TO_NET')}
                    className={`rounded-lg py-2.5 px-3 text-xs font-bold border transition-all ${
                      calcMode === 'GROSS_TO_NET'
                        ? 'border-primary bg-primary text-primary-foreground shadow-xs'
                        : 'border-border bg-muted/40 hover:bg-muted text-foreground'
                    }`}
                  >
                    Lương GROSS → NET
                  </button>
                  <button
                    type="button"
                    onClick={() => setCalcMode('NET_TO_GROSS')}
                    className={`rounded-lg py-2.5 px-3 text-xs font-bold border transition-all ${
                      calcMode === 'NET_TO_GROSS'
                        ? 'border-primary bg-primary text-primary-foreground shadow-xs'
                        : 'border-border bg-muted/40 hover:bg-muted text-foreground'
                    }`}
                  >
                    Lương NET → GROSS
                  </button>
                </div>
              </div>

              {/* Input Salary */}
              <div>
                <label className="text-xs font-semibold text-foreground">
                  {calcMode === 'GROSS_TO_NET' ? 'Mức lương GROSS (VND):' : 'Mức lương NET mong muốn (VND):'}
                </label>
                <div className="relative mt-1">
                  <input
                    type="number"
                    step={1000000}
                    value={inputSalary}
                    onChange={(e) => setInputSalary(Math.max(0, Number(e.target.value)))}
                    className="border-input bg-background w-full rounded-lg border py-2.5 pr-4 pl-3 font-mono text-base font-bold text-foreground focus:border-primary focus:outline-none"
                  />
                </div>
                <div className="mt-1 text-xs text-primary font-bold">{formatVND(inputSalary)}</div>
              </div>

              {/* Dependents */}
              <div>
                <label className="text-xs font-semibold text-foreground">Số người phụ thuộc (NPT):</label>
                <div className="mt-1 flex items-center gap-2">
                  {[0, 1, 2, 3, 4].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setCalcDependents(num)}
                      className={`h-9 w-9 rounded-lg font-mono text-xs font-bold border transition-colors ${
                        calcDependents === num
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border bg-muted/40 hover:bg-muted text-foreground'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                  <span className="text-xs text-muted-foreground ml-2">
                    Giảm trừ: {formatVND(calcDependents * 4400000)}/tháng
                  </span>
                </div>
              </div>

              {/* Insurance basis */}
              <div>
                <label className="text-xs font-semibold text-foreground">Mức lương làm căn cứ đóng BHXH:</label>
                <div className="mt-1 space-y-2">
                  <label className="flex items-center gap-2 text-xs">
                    <input
                      type="radio"
                      name="insBasis"
                      checked={calcInsuranceBasis === 'FULL'}
                      onChange={() => setCalcInsuranceBasis('FULL')}
                      className="text-primary focus:ring-primary"
                    />
                    <span>Đóng trên 100% lương chính thức (Áp trần tối đa 46.800.000đ)</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs">
                    <input
                      type="radio"
                      name="insBasis"
                      checked={calcInsuranceBasis === 'CUSTOM'}
                      onChange={() => setCalcInsuranceBasis('CUSTOM')}
                      className="text-primary focus:ring-primary"
                    />
                    <span>Mức thỏa thuận khác</span>
                  </label>
                  {calcInsuranceBasis === 'CUSTOM' && (
                    <input
                      type="number"
                      step={500000}
                      value={customInsuranceSalary}
                      onChange={(e) => setCustomInsuranceSalary(Number(e.target.value))}
                      className="border-input bg-background w-full rounded-lg border py-1.5 px-3 font-mono text-xs focus:border-primary focus:outline-none"
                    />
                  )}
                </div>
              </div>

              {/* Tax law version */}
              <div>
                <label className="text-xs font-semibold text-foreground">Biểu thuế TNCN áp dụng:</label>
                <select
                  value={taxRuleVersion}
                  onChange={(e) => setTaxRuleVersion(e.target.value as any)}
                  className="border-input bg-background mt-1 w-full rounded-lg border px-3 py-2 text-xs font-medium focus:border-primary focus:outline-none"
                >
                  <option value="2026_5_TIER">Luật Thuế 2026 mới (5 bậc: 5%, 10%, 20%, 30%, 35%)</option>
                  <option value="LEGACY_7_TIER">Luật hiện hành (7 bậc: 5%, 10%, 15%, 20%, 25%, 30%, 35%)</option>
                </select>
              </div>
            </div>

            {/* Breakdown Result View (Right Column 7 cols) */}
            <div className="space-y-5 lg:col-span-7">
              {/* Highlight Hero Card */}
              <div className="rounded-xl border border-border bg-card p-6 shadow-xs">
                <div className="grid grid-cols-2 gap-4 border-b border-border pb-5">
                  <div>
                    <span className="text-xs font-semibold text-muted-foreground uppercase">Lương GROSS</span>
                    <p className="mt-1 text-2xl font-black text-foreground">
                      {formatVND(calculatorResult.gross)}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-emerald-600 uppercase">Thực Lĩnh (NET)</span>
                    <p className="mt-1 text-2xl font-black text-emerald-600">
                      {formatVND(calculatorResult.net)}
                    </p>
                  </div>
                </div>

                {/* Ratio Bar */}
                <div className="pt-4">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                    <span>Phân bổ thu nhập Gross:</span>
                    <span>
                      Net: {Math.round((calculatorResult.net / calculatorResult.gross) * 100)}% · BH: {Math.round((calculatorResult.totalEmpIns / calculatorResult.gross) * 100)}% · Thuế: {Math.round((calculatorResult.pit / calculatorResult.gross) * 100)}%
                    </span>
                  </div>
                  <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="bg-emerald-500"
                      style={{ width: `${(calculatorResult.net / calculatorResult.gross) * 100}%` }}
                      title="Lương Net"
                    />
                    <div
                      className="bg-blue-500"
                      style={{ width: `${(calculatorResult.totalEmpIns / calculatorResult.gross) * 100}%` }}
                      title="Bảo hiểm người LĐ"
                    />
                    <div
                      className="bg-rose-500"
                      style={{ width: `${(calculatorResult.pit / calculatorResult.gross) * 100}%` }}
                      title="Thuế TNCN"
                    />
                  </div>
                </div>
              </div>

              {/* Detailed Breakdown Table */}
              <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
                <div className="bg-muted/40 px-4 py-3 border-b border-border font-bold text-xs">
                  Bảng Chi Tiết Khấu Trừ Thuế & Bảo Hiểm
                </div>
                <table className="w-full text-xs">
                  <tbody className="divide-y divide-border">
                    <tr className="bg-muted/20">
                      <td className="px-4 py-2.5 font-bold">LƯƠNG GROSS (Tổng thu nhập)</td>
                      <td className="px-4 py-2.5 text-right font-mono font-bold">{formatVND(calculatorResult.gross)}</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 text-muted-foreground pl-8">- Bảo hiểm xã hội (8%)</td>
                      <td className="px-4 py-2 text-right font-mono text-muted-foreground">-{formatVND(calculatorResult.bhxh)}</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 text-muted-foreground pl-8">- Bảo hiểm y tế (1.5%)</td>
                      <td className="px-4 py-2 text-right font-mono text-muted-foreground">-{formatVND(calculatorResult.bhyt)}</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 text-muted-foreground pl-8">- Bảo hiểm thất nghiệp (1%)</td>
                      <td className="px-4 py-2 text-right font-mono text-muted-foreground">-{formatVND(calculatorResult.bhtn)}</td>
                    </tr>
                    <tr className="bg-muted/10 font-semibold">
                      <td className="px-4 py-2 pl-6">Tổng các khoản bảo hiểm người lao động (10.5%)</td>
                      <td className="px-4 py-2 text-right font-mono text-blue-600">-{formatVND(calculatorResult.totalEmpIns)}</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 text-muted-foreground pl-8">- Giảm trừ gia cảnh bản thân</td>
                      <td className="px-4 py-2 text-right font-mono text-muted-foreground">-11.000.000 đ</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 text-muted-foreground pl-8">- Giảm trừ người phụ thuộc ({calcDependents} người)</td>
                      <td className="px-4 py-2 text-right font-mono text-muted-foreground">-{formatVND(calcDependents * 4400000)}</td>
                    </tr>
                    <tr className="bg-muted/10 font-semibold">
                      <td className="px-4 py-2 pl-6">Thu nhập tính thuế (TNTT)</td>
                      <td className="px-4 py-2 text-right font-mono">{formatVND(calculatorResult.assessableIncome)}</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2.5 font-semibold text-rose-600 pl-6">Thuế thu nhập cá nhân (PIT)</td>
                      <td className="px-4 py-2.5 text-right font-mono font-bold text-rose-600">-{formatVND(calculatorResult.pit)}</td>
                    </tr>
                    <tr className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-100 font-black">
                      <td className="px-4 py-3 text-sm">LƯƠNG NET (Thực nhận về tài khoản)</td>
                      <td className="px-4 py-3 text-right font-mono text-base">{formatVND(calculatorResult.net)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Employer Cost Box */}
              <div className="rounded-xl border border-purple-200 bg-purple-50/50 p-4 text-xs dark:border-purple-900 dark:bg-purple-950/30">
                <span className="font-bold text-purple-900 dark:text-purple-300">
                  Góc nhìn Người Sử Dụng Lao Động (Doanh Nghiệp Trả Thêm):
                </span>
                <div className="mt-2 grid grid-cols-2 gap-2 text-muted-foreground">
                  <div>BHXH cty (17.5%): {formatVND(calculatorResult.erBhxh)}</div>
                  <div>BHYT cty (3%): {formatVND(calculatorResult.erBhyt)}</div>
                  <div>BHTN cty (1%): {formatVND(calculatorResult.erBhtn)}</div>
                  <div>Kinh phí công đoàn (2%): {formatVND(calculatorResult.erKpcd)}</div>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-purple-200/80 pt-2 font-bold text-foreground">
                  <span>TỔNG CHI PHÍ DOANH NGHIỆP TRẢ (Gross + 23.5% BH):</span>
                  <span className="font-mono text-purple-700 dark:text-purple-300 text-sm">
                    {formatVND(calculatorResult.totalCompanyExpense)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
