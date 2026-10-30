import {
  AlertTriangle,
  Award,
  Cake,
  Calendar,
  CheckCircle2,
  DollarSign,
  FileSpreadsheet,
  Percent,
  Printer,
  Shield,
  Sparkles,
  TrendingUp,
  Users
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { DemoBanner } from '../components/DemoBanner';
import { TenantSwitcher } from '../components/TenantSwitcher';
import { MOCK_EMPLOYEES, MOCK_SETTINGS } from '../mockData';
import { formatNumber, formatVND } from '../utils/docSo';
import { calcEmployeePayroll } from '../utils/payrollEngine';
import {
  BentoGrid,
  Card,
  CardTitle,
  StatCard,
  AnimatedNumber,
  Sparkline,
  ProgressBar
} from '../../components/dashboard';

export function PayrollDashboardPage() {
  const [selectedMonth, setSelectedMonth] = useState('2026-04');

  // Tính toán bảng lương mẫu từ dữ liệu mock
  const payrollList = useMemo(() => {
    return MOCK_EMPLOYEES.map((emp) => {
      const isAbsentHeavy = emp.code === 'NV006';
      const actualWorkDays = isAbsentHeavy ? 11 : 24;
      const unpaidLeaveDays = isAbsentHeavy ? 15 : 0;
      const paidLeaveDays = 2; // 1 phép + 1 lễ 30/4
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

  // Tổng hợp chỉ số KPI
  const kpis = useMemo(() => {
    const totalGross = payrollList.reduce((acc, r) => acc + r.grossSalary, 0);
    const totalNet = payrollList.reduce((acc, r) => acc + r.netSalary, 0);
    const totalTax = payrollList.reduce((acc, r) => acc + r.personalIncomeTax, 0);
    const totalEmployeeIns = payrollList.reduce((acc, r) => acc + r.totalEmployeeInsurance, 0);
    const totalEmployerCost = payrollList.reduce((acc, r) => acc + r.totalEmployerCost, 0);
    const totalCompanyExpense = payrollList.reduce((acc, r) => acc + r.totalCompanyExpense, 0);
    const totalActualDays = payrollList.reduce((acc, r) => acc + r.actualWorkDays, 0);
    const totalStandardCapacity = payrollList.length * (MOCK_SETTINGS.standardWorkingDays || 26);
    const attendanceRate = totalStandardCapacity > 0 ? (totalActualDays / totalStandardCapacity) * 100 : 0;
    const taxPayersCount = payrollList.filter((r) => r.personalIncomeTax > 0).length;

    return {
      totalGross,
      totalNet,
      totalTax,
      totalEmployeeIns,
      totalEmployerCost,
      totalCompanyExpense,
      attendanceRate,
      taxPayersCount,
    };
  }, [payrollList]);

  // Top 5 thu nhập cao nhất
  const topEarners = useMemo(() => {
    return [...payrollList].sort((a, b) => b.grossSalary - a.grossSalary).slice(0, 5);
  }, [payrollList]);

  // Nhân viên nghỉ nhiều nhất trong tháng
  const topAbsences = useMemo(() => {
    return [...payrollList]
      .filter((r) => r.unpaidLeaveDays > 0)
      .sort((a, b) => b.unpaidLeaveDays - a.unpaidLeaveDays)
      .slice(0, 5);
  }, [payrollList]);

  // Sinh nhật trong tháng 04
  const birthdays = useMemo(() => {
    return MOCK_EMPLOYEES.filter((e) => e.dateOfBirth?.includes('-04-'));
  }, []);

  return (
    <div className="min-h-screen pb-16 bg-zinc-50 text-zinc-950">
      {/* Cảnh báo Demo Mode bắt buộc */}
      <DemoBanner />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-6 space-y-5">
        {/* Header Dashboard chuẩn shadcn-admin + Metadata Strip */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-950">
                Tổng Quan Quỹ Lương & Nhân Sự
              </h1>
              <TenantSwitcher currentRole="OWNER" />
            </div>
            <p className="text-zinc-500 mt-1 text-xs sm:text-sm">
              Thống kê toàn diện chi phí nhân sự, trích nộp thuế TNCN và bảo hiểm bắt buộc theo kỳ lương
            </p>
            {/* Dải Metadata Strip mảnh thay thế Hero Banner màu tím */}
            <div className="mt-2.5 inline-flex flex-wrap items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-600">
              <span className="inline-flex items-center gap-1.5 font-medium text-zinc-900">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                Kỳ lương {selectedMonth.split('-')[1]}/{selectedMonth.split('-')[0]}
              </span>
              <span className="text-zinc-300">·</span>
              <span className="font-medium text-zinc-900 tabular-nums">{payrollList.length} Nhân sự</span>
              <span className="text-zinc-300">·</span>
              <span>Anti-IDOR Multi-Tenant</span>
              <span className="text-zinc-300">·</span>
              <span className="tabular-nums">Giảm trừ 11M / 4.4M</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="bg-white border border-zinc-200 text-zinc-900 flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium">
              <Calendar className="text-zinc-500 h-3.5 w-3.5" />
              <span className="text-zinc-500">Kỳ lương:</span>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-transparent font-mono font-semibold focus:outline-none text-xs cursor-pointer tabular-nums"
              />
            </label>

            <button
              type="button"
              onClick={() => alert('Xuất báo cáo quỹ lương tháng ' + selectedMonth + ' dạng Excel .xlsx đa sheet')}
              className="bg-zinc-900 hover:bg-zinc-800 text-zinc-50 inline-flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-xs font-medium transition-colors"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              <span>Xuất Excel</span>
            </button>
          </div>
        </div>

        {/* Lưới Bento 12 cột cân đối chuẩn shadcn-admin */}
        <div className="grid grid-cols-2 lg:grid-cols-12 gap-4">
          {/* KPI 1: Thực lĩnh Net */}
          <div className="col-span-1 lg:col-span-3 rounded-lg border border-zinc-200 bg-white p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs font-medium text-zinc-500">
              <span>Thực Lĩnh (Net Salary)</span>
              <DollarSign size={15} className="text-zinc-400" />
            </div>
            <div className="mt-2 text-lg sm:text-xl font-bold tracking-tight text-zinc-950 tabular-nums">
              {formatVND(kpis.totalNet)}
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] text-zinc-500">
              <span>Chi trả 100% qua NH</span>
              <span className="rounded bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 font-semibold text-emerald-700 tabular-nums">+2.8%</span>
            </div>
          </div>

          {/* KPI 2: Tổng Gross */}
          <div className="col-span-1 lg:col-span-3 rounded-lg border border-zinc-200 bg-white p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs font-medium text-zinc-500">
              <span>Tổng Thu Nhập (Gross)</span>
              <TrendingUp size={15} className="text-zinc-400" />
            </div>
            <div className="mt-2 text-lg sm:text-xl font-bold tracking-tight text-zinc-950 tabular-nums">
              {formatVND(kpis.totalGross)}
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] text-zinc-500">
              <span className="tabular-nums">BQ {formatVND(kpis.totalGross / (payrollList.length || 1))}</span>
              <span className="rounded bg-zinc-100 border border-zinc-200 px-1.5 py-0.5 font-semibold text-zinc-700 tabular-nums">+1.5%</span>
            </div>
          </div>

          {/* KPI 3: Thuế TNCN */}
          <div className="col-span-1 lg:col-span-3 rounded-lg border border-zinc-200 bg-white p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs font-medium text-zinc-500">
              <span>Thuế TNCN Khấu Trừ</span>
              <Percent size={15} className="text-zinc-400" />
            </div>
            <div className="mt-2 text-lg sm:text-xl font-bold tracking-tight text-zinc-950 tabular-nums">
              {formatVND(kpis.totalTax)}
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] text-zinc-500">
              <span>Biểu lũy tiến chuẩn</span>
              <span className="rounded bg-zinc-100 border border-zinc-200 px-1.5 py-0.5 font-semibold text-zinc-700 tabular-nums">{kpis.taxPayersCount} nộp</span>
            </div>
          </div>

          {/* KPI 4: Bảo hiểm */}
          <div className="col-span-1 lg:col-span-3 rounded-lg border border-zinc-200 bg-white p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs font-medium text-zinc-500">
              <span>Bảo Hiểm & Công Đoàn</span>
              <Shield size={15} className="text-zinc-400" />
            </div>
            <div className="mt-2 text-lg sm:text-xl font-bold tracking-tight text-zinc-950 tabular-nums">
              {formatVND(kpis.totalEmployeeIns + kpis.totalEmployerCost)}
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] text-zinc-500 tabular-nums">
              <span>NLĐ: {formatVND(kpis.totalEmployeeIns)}</span>
              <span className="rounded bg-zinc-100 border border-zinc-200 px-1.5 py-0.5 font-semibold text-zinc-700">10.5% + 22%</span>
            </div>
          </div>

          {/* Phân tích cơ cấu chi phí doanh nghiệp (7 cols on Desktop) */}
          <div className="col-span-2 lg:col-span-7 rounded-lg border border-zinc-200 bg-white p-5">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-semibold text-zinc-950">
                Cơ Cấu Chi Phí Doanh Nghiệp Thực Trả Cho Nhân Sự
              </h3>
              <span className="bg-zinc-100 border border-zinc-200 text-zinc-700 px-2 py-0.5 rounded text-xs font-medium tabular-nums">
                {selectedMonth}
              </span>
            </div>

            <p className="text-xs text-zinc-500 mb-4">
              Tổng chi phí doanh nghiệp tháng này: <strong className="text-zinc-950 font-semibold tabular-nums">{formatVND(kpis.totalCompanyExpense)}</strong>
            </p>

            <div className="space-y-3.5 text-xs">
              <div>
                <div className="flex justify-between font-medium mb-1">
                  <span className="text-zinc-700">1. Tiền trả thực lĩnh cho NLĐ (Net)</span>
                  <strong className="text-zinc-950 tabular-nums">{formatVND(kpis.totalNet)}</strong>
                </div>
                <div className="bg-zinc-100 h-2 rounded overflow-hidden">
                  <div
                    className="bg-zinc-900 h-full rounded transition-all duration-500"
                    style={{ width: `${(kpis.totalNet / (kpis.totalCompanyExpense || 1)) * 100}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between font-medium mb-1">
                  <span className="text-zinc-700">2. Chi phí Bảo hiểm & KPCĐ phần Doanh nghiệp nộp (22%)</span>
                  <strong className="text-zinc-800 tabular-nums">{formatVND(kpis.totalEmployerCost)}</strong>
                </div>
                <div className="bg-zinc-100 h-2 rounded overflow-hidden">
                  <div
                    className="bg-zinc-600 h-full rounded transition-all duration-500"
                    style={{ width: `${(kpis.totalEmployerCost / (kpis.totalCompanyExpense || 1)) * 100}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between font-medium mb-1">
                  <span className="text-zinc-700">3. Bảo hiểm phần NLĐ nộp hộ (10.5%)</span>
                  <strong className="text-zinc-800 tabular-nums">{formatVND(kpis.totalEmployeeIns)}</strong>
                </div>
                <div className="bg-zinc-100 h-2 rounded overflow-hidden">
                  <div
                    className="bg-zinc-400 h-full rounded transition-all duration-500"
                    style={{ width: `${(kpis.totalEmployeeIns / (kpis.totalCompanyExpense || 1)) * 100}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between font-medium mb-1">
                  <span className="text-zinc-700">4. Thuế TNCN khấu trừ nộp hộ</span>
                  <strong className="text-amber-700 tabular-nums">{formatVND(kpis.totalTax)}</strong>
                </div>
                <div className="bg-zinc-100 h-2 rounded overflow-hidden">
                  <div
                    className="bg-amber-600 h-full rounded transition-all duration-500"
                    style={{ width: `${(kpis.totalTax / (kpis.totalCompanyExpense || 1)) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Top 5 Thu nhập (5 cols on Desktop) */}
          <div className="col-span-2 lg:col-span-5 rounded-lg border border-zinc-200 bg-white p-5">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-zinc-950">Top 5 Thu Nhập Cao Nhất</h3>
              <Award size={16} className="text-zinc-400" />
            </div>

            <div className="divide-y divide-zinc-100 text-xs">
              {topEarners.map((emp, idx) => (
                <div key={emp.employeeId} className="flex items-center justify-between py-2.5">
                  <div className="flex items-center gap-2.5">
                    <span className="bg-zinc-100 border border-zinc-200 text-zinc-700 flex h-5 w-5 items-center justify-center rounded font-mono text-[10px] font-bold tabular-nums">
                      {idx + 1}
                    </span>
                    <div>
                      <div className="font-semibold text-zinc-900">{emp.employeeName}</div>
                      <div className="text-zinc-500 text-[11px]">{emp.departmentName}</div>
                    </div>
                  </div>
                  <div className="text-right tabular-nums">
                    <div className="font-bold text-zinc-950">{formatVND(emp.grossSalary)}</div>
                    <div className="text-zinc-500 text-[11px]">Net: {formatVND(emp.netSalary)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tỷ lệ chuyên cần (4 cols) */}
          <div className="col-span-2 lg:col-span-4 rounded-lg border border-zinc-200 bg-white p-5">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-zinc-950">Tỷ Lệ Đi Làm Chuyên Cần</h3>
              <Users size={16} className="text-zinc-400" />
            </div>
            <div className="text-2xl font-bold text-zinc-950 tabular-nums mb-2">
              {Math.round(kpis.attendanceRate)}%
            </div>
            <ProgressBar value={Math.round(kpis.attendanceRate)} label="Tổng công làm thực tế / Công định mức" />
          </div>

          {/* Cảnh báo nghỉ không lương (4 cols) */}
          <div className="col-span-2 sm:col-span-1 lg:col-span-4 rounded-lg border border-zinc-200 bg-white p-5">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-zinc-950">Nhân Sự Nghỉ Không Lương</h3>
              <AlertTriangle size={16} className="text-zinc-400" />
            </div>

            <div className="divide-y divide-zinc-100 text-xs">
              {topAbsences.length > 0 ? (
                topAbsences.map((emp) => (
                  <div key={emp.employeeId} className="flex items-center justify-between py-2.5">
                    <div>
                      <div className="font-semibold text-zinc-900">{emp.employeeName}</div>
                      <div className="text-zinc-500 text-[11px]">{emp.departmentName}</div>
                    </div>
                    <div className="text-right tabular-nums">
                      <span className="rounded bg-red-50 border border-red-200 px-2 py-0.5 text-[10px] font-semibold text-red-700">
                        {emp.unpaidLeaveDays} ngày nghỉ KL
                      </span>
                      {emp.isInsuranceExempt14Days && (
                        <div className="text-[10px] text-amber-700 font-medium mt-0.5">
                          Miễn đóng BHXH (≥ 14 ngày)
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-zinc-500 py-6 text-center text-xs">
                  Không có nhân viên nào nghỉ không lương trong tháng.
                </div>
              )}
            </div>
          </div>

          {/* Sinh nhật (4 cols) */}
          <div className="col-span-2 sm:col-span-1 lg:col-span-4 rounded-lg border border-zinc-200 bg-white p-5">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-zinc-950">Sinh Nhật Tháng {+selectedMonth.split('-')[1]}</h3>
              <Cake size={16} className="text-zinc-400" />
            </div>

            <div className="divide-y divide-zinc-100 text-xs">
              {birthdays.length > 0 ? (
                birthdays.map((emp) => (
                  <div key={emp.id} className="flex items-center justify-between py-2.5">
                    <div>
                      <div className="font-semibold text-zinc-900">{emp.fullName}</div>
                      <div className="text-zinc-500 text-[11px]">{emp.departmentName} · {emp.jobTitle}</div>
                    </div>
                    <span className="bg-zinc-100 border border-zinc-200 text-zinc-800 rounded px-2 py-0.5 text-[10px] font-semibold tabular-nums">
                      {emp.dateOfBirth?.slice(8)}/{emp.dateOfBirth?.slice(5, 7)}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-zinc-500 py-6 text-center text-xs">
                  Không có nhân sự nào có sinh nhật trong tháng.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
