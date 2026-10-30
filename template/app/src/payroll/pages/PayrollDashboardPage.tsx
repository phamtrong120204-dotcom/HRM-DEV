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
    <div className="dash-root min-h-screen pb-16 bg-[var(--dash-bg)] text-[var(--dash-ink)]">
      {/* Cảnh báo Demo Mode bắt buộc */}
      <DemoBanner />

      <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 pt-5 space-y-6">
        {/* Header Dashboard dạng Pill & Controls gọn gàng cho Mobile/Tablet/Desktop */}
        <div className="bg-[var(--dash-surface)] rounded-[var(--dash-radius-lg)] p-4 sm:p-5 shadow-[var(--dash-shadow)] flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--dash-ink)]">
                Tổng Quan Quỹ Lương & Nhân Sự
              </h1>
              <TenantSwitcher currentRole="OWNER" />
            </div>
            <p className="text-[var(--dash-muted)] mt-1 text-xs sm:text-sm">
              Thống kê toàn diện chi phí nhân sự, trích nộp thuế TNCN và bảo hiểm bắt buộc theo kỳ lương
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <label className="bg-[var(--dash-bg)] border border-[var(--dash-line)] text-[var(--dash-ink)] flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold shadow-xs">
              <Calendar className="text-[var(--dash-lilac-strong)] h-3.5 w-3.5" />
              <span>Kỳ lương:</span>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-transparent font-mono font-bold focus:outline-none text-xs cursor-pointer"
              />
            </label>

            <button
              type="button"
              onClick={() => alert('Xuất báo cáo quỹ lương tháng ' + selectedMonth + ' dạng Excel .xlsx đa sheet')}
              className="bg-emerald-600 hover:bg-emerald-700 text-white inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold shadow-xs transition-colors"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              <span>Xuất Excel</span>
            </button>
          </div>
        </div>

        {/* Bento Grid layout */}
        <BentoGrid>
          {/* Bento Tile 1: Hero Tile (Lilac) */}
          <Card tone="lilac" pad="lg" className="col-span-12 xl:col-span-8 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-[var(--dash-lilac-strong)] text-xs font-bold uppercase tracking-wider mb-2">
                <Sparkles size={16} />
                <span>Báo Cáo Nghiệp Vụ Doanh Nghiệp</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--dash-ink)]">
                Kỳ lương Tháng {selectedMonth.split('-')[1]}/{selectedMonth.split('-')[0]}
              </h2>
              <p className="mt-2 text-xs sm:text-sm text-[var(--dash-ink)]/80 max-w-2xl leading-relaxed">
                Hệ thống đã tự động tính toán dữ liệu chấm công 31 ngày, thuế TNCN lũy tiến từng phần và trích nộp bảo hiểm theo quy chuẩn Luật BHXH mới nhất.
              </p>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2 pt-2 border-t border-[var(--dash-ink)]/10 text-xs">
              <span className="bg-white/70 text-[var(--dash-ink)] px-2.5 py-1 rounded-full font-semibold">
                ✓ {payrollList.length} Nhân sự
              </span>
              <span className="bg-white/70 text-[var(--dash-ink)] px-2.5 py-1 rounded-full font-semibold">
                ✓ Phân quyền RBAC an toàn
              </span>
              <span className="bg-white/70 text-[var(--dash-ink)] px-2.5 py-1 rounded-full font-semibold">
                ✓ Giảm trừ bản thân 11M & NPT 4.4M
              </span>
            </div>
          </Card>

          {/* Bento Tile 2: Primary KPI Card (Ink Card - Nhấn mạnh) */}
          <StatCard
            className="col-span-12 sm:col-span-6 xl:col-span-4"
            tone="ink"
            title="Tổng Thực Lĩnh (Net Salary)"
            value={kpis.totalNet}
            suffix=" ₫"
            delta={2.8}
            icon={<DollarSign size={18} className="text-teal-400" />}
          >
            <div className="flex items-center justify-between text-xs text-white/70 border-t border-white/10 pt-2.5">
              <span>Chi trả qua chuyển khoản</span>
              <span className="font-semibold text-emerald-400">100% tài khoản</span>
            </div>
          </StatCard>

          {/* Bento Tile 3: Gross KPI Card (Sky) */}
          <StatCard
            className="col-span-12 sm:col-span-6 xl:col-span-4"
            tone="sky"
            title="Tổng Thu Nhập (Gross)"
            value={kpis.totalGross}
            suffix=" ₫"
            delta={1.5}
            icon={<TrendingUp size={18} className="text-blue-600" />}
          >
            <Sparkline data={[42, 48, 51, 56, 53, 62, 68, 72]} />
            <div className="mt-2 text-xs text-[var(--dash-muted)]">
              Bình quân: <strong>{formatVND(kpis.totalGross / (payrollList.length || 1))}</strong>/người
            </div>
          </StatCard>

          {/* Bento Tile 4: Thuế TNCN (Amber) */}
          <StatCard
            className="col-span-12 sm:col-span-6 xl:col-span-4"
            tone="amber"
            title="Thuế TNCN Khấu Trừ"
            value={kpis.totalTax}
            suffix=" ₫"
            icon={<Percent size={18} className="text-amber-700" />}
          >
            <div className="mt-2 text-xs text-[var(--dash-muted)] flex justify-between">
              <span>{kpis.taxPayersCount} người có thuế</span>
              <span className="font-semibold text-amber-800">Biểu lũy tiến 2026</span>
            </div>
          </StatCard>

          {/* Bento Tile 5: Bảo hiểm bắt buộc (Mint) */}
          <StatCard
            className="col-span-12 sm:col-span-6 xl:col-span-4"
            tone="mint"
            title="Tổng Bảo Hiểm & Công Đoàn"
            value={kpis.totalEmployeeIns + kpis.totalEmployerCost}
            suffix=" ₫"
            icon={<Shield size={18} className="text-emerald-700" />}
          >
            <div className="mt-2 text-xs text-[var(--dash-muted)] flex justify-between">
              <span>NLĐ: {formatVND(kpis.totalEmployeeIns)}</span>
              <span>DN: {formatVND(kpis.totalEmployerCost)}</span>
            </div>
          </StatCard>

          {/* Bento Tile 6: Tỷ lệ đi làm chuyên cần */}
          <StatCard
            className="col-span-12 sm:col-span-6 xl:col-span-4"
            tone="white"
            title="Tỷ Lệ Đi Làm Chuyên Cần"
            value={Math.round(kpis.attendanceRate)}
            suffix="%"
            icon={<Users size={18} className="text-purple-600" />}
          >
            <ProgressBar value={Math.round(kpis.attendanceRate)} label="Tổng công làm thực tế / Công định mức" />
          </StatCard>

          {/* Bento Tile 7: Phân tích cơ cấu chi phí doanh nghiệp */}
          <Card tone="white" className="col-span-12 xl:col-span-8">
            <CardTitle
              action={
                <span className="bg-[var(--dash-bg)] text-[var(--dash-muted)] px-3 py-1 rounded-full text-xs font-bold">
                  {selectedMonth}
                </span>
              }
            >
              Cơ Cấu Chi Phí Doanh Nghiệp Thực Trả Cho Nhân Sự
            </CardTitle>

            <p className="text-xs text-[var(--dash-muted)] mb-4">
              Tổng chi phí doanh nghiệp tháng này: <strong className="text-[var(--dash-ink)] font-semibold">{formatVND(kpis.totalCompanyExpense)}</strong>
            </p>

            <div className="space-y-3.5 text-xs">
              <div>
                <div className="flex justify-between font-medium mb-1">
                  <span>1. Tiền trả thực lĩnh cho NLĐ (Net)</span>
                  <strong className="text-[var(--dash-ink)]">{formatVND(kpis.totalNet)}</strong>
                </div>
                <div className="bg-[var(--dash-bg)] h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-teal-600 h-full rounded-full transition-all duration-500"
                    style={{ width: `${(kpis.totalNet / (kpis.totalCompanyExpense || 1)) * 100}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between font-medium mb-1">
                  <span>2. Chi phí Bảo hiểm & KPCĐ phần Doanh nghiệp nộp (22%)</span>
                  <strong className="text-purple-600">{formatVND(kpis.totalEmployerCost)}</strong>
                </div>
                <div className="bg-[var(--dash-bg)] h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-purple-600 h-full rounded-full transition-all duration-500"
                    style={{ width: `${(kpis.totalEmployerCost / (kpis.totalCompanyExpense || 1)) * 100}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between font-medium mb-1">
                  <span>3. Bảo hiểm phần NLĐ nộp hộ (10.5%)</span>
                  <strong className="text-blue-600">{formatVND(kpis.totalEmployeeIns)}</strong>
                </div>
                <div className="bg-[var(--dash-bg)] h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-blue-600 h-full rounded-full transition-all duration-500"
                    style={{ width: `${(kpis.totalEmployeeIns / (kpis.totalCompanyExpense || 1)) * 100}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between font-medium mb-1">
                  <span>4. Thuế TNCN khấu trừ nộp hộ</span>
                  <strong className="text-amber-600">{formatVND(kpis.totalTax)}</strong>
                </div>
                <div className="bg-[var(--dash-bg)] h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-amber-600 h-full rounded-full transition-all duration-500"
                    style={{ width: `${(kpis.totalTax / (kpis.totalCompanyExpense || 1)) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* Bento Tile 8: Top 5 Thu nhập */}
          <Card tone="white" className="col-span-12 xl:col-span-4">
            <CardTitle
              action={<Award size={18} className="text-amber-500" />}
            >
              Top 5 Thu Nhập Cao Nhất
            </CardTitle>

            <div className="divide-y divide-[var(--dash-line)] text-xs mt-2">
              {topEarners.map((emp, idx) => (
                <div key={emp.employeeId} className="flex items-center justify-between py-2.5">
                  <div className="flex items-center gap-2.5">
                    <span className="bg-[var(--dash-bg)] text-[var(--dash-muted)] flex h-5 w-5 items-center justify-center rounded-full font-mono text-[10px] font-bold">
                      {idx + 1}
                    </span>
                    <div>
                      <div className="font-semibold text-[var(--dash-ink)]">{emp.employeeName}</div>
                      <div className="text-[var(--dash-muted)] text-[10px]">{emp.departmentName}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-[var(--dash-ink)]">{formatVND(emp.grossSalary)}</div>
                    <div className="text-[var(--dash-muted)] text-[10px]">Net: {formatVND(emp.netSalary)}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Bento Tile 9: Cảnh báo nghỉ không lương */}
          <Card tone="white" className="col-span-12 sm:col-span-6">
            <CardTitle action={<AlertTriangle size={18} className="text-rose-500" />}>
              Nhân Sự Nghỉ Không Lương
            </CardTitle>

            <div className="divide-y divide-[var(--dash-line)] text-xs mt-2">
              {topAbsences.length > 0 ? (
                topAbsences.map((emp) => (
                  <div key={emp.employeeId} className="flex items-center justify-between py-2.5">
                    <div>
                      <div className="font-semibold text-[var(--dash-ink)]">{emp.employeeName}</div>
                      <div className="text-[var(--dash-muted)] text-[10px]">{emp.departmentName}</div>
                    </div>
                    <div className="text-right">
                      <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-800">
                        {emp.unpaidLeaveDays} ngày nghỉ KL
                      </span>
                      {emp.isInsuranceExempt14Days && (
                        <div className="text-[10px] text-amber-600 font-semibold mt-0.5">
                          ✓ Miễn đóng BHXH (≥ 14 ngày)
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-[var(--dash-muted)] py-6 text-center text-xs">
                  Không có nhân viên nào nghỉ không lương trong tháng.
                </div>
              )}
            </div>
          </Card>

          {/* Bento Tile 10: Sinh nhật */}
          <Card tone="white" className="col-span-12 sm:col-span-6">
            <CardTitle action={<Cake size={18} className="text-pink-500" />}>
              Sinh Nhật Tháng {+selectedMonth.split('-')[1]}
            </CardTitle>

            <div className="divide-y divide-[var(--dash-line)] text-xs mt-2">
              {birthdays.length > 0 ? (
                birthdays.map((emp) => (
                  <div key={emp.id} className="flex items-center justify-between py-2.5">
                    <div>
                      <div className="font-semibold text-[var(--dash-ink)]">{emp.fullName}</div>
                      <div className="text-[var(--dash-muted)] text-[10px]">{emp.departmentName} · {emp.jobTitle}</div>
                    </div>
                    <span className="bg-pink-100 text-pink-800 rounded-full px-2.5 py-0.5 text-[10px] font-semibold">
                      {emp.dateOfBirth?.slice(8)}/{emp.dateOfBirth?.slice(5, 7)}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-[var(--dash-muted)] py-6 text-center text-xs">
                  Không có nhân sự nào có sinh nhật trong tháng.
                </div>
              )}
            </div>
          </Card>
        </BentoGrid>
      </div>
    </div>
  );
}
