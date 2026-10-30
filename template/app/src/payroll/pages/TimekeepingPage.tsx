import {
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Download,
  Filter,
  Lock,
  Paintbrush,
  Printer,
  RotateCcw,
  Save,
  Search,
  Sparkles,
  Unlock,
  Users
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { DemoBanner } from '../components/DemoBanner';
import { TenantSwitcher } from '../components/TenantSwitcher';
import { MOCK_DEPARTMENTS, MOCK_EMPLOYEES, MOCK_SETTINGS, MOCK_TENANT } from '../mockData';
import { AttendanceCode } from '../types';

// Danh sách các ký hiệu chấm công chuẩn theo Thông tư & Thực tế VN
const ATTENDANCE_BRUSHES: { code: AttendanceCode; label: string; desc: string; value: number; color: string }[] = [
  { code: 'X', label: 'X', desc: 'Đủ công (1.0)', value: 1.0, color: 'bg-emerald-500 text-white' },
  { code: 'X/2', label: 'X/2', desc: 'Nửa công (0.5)', value: 0.5, color: 'bg-teal-500 text-white' },
  { code: 'P', label: 'P', desc: 'Nghỉ phép hưởng lương (1.0)', value: 1.0, color: 'bg-blue-500 text-white' },
  { code: 'L', label: 'L', desc: 'Nghỉ lễ hưởng lương (1.0)', value: 1.0, color: 'bg-purple-500 text-white' },
  { code: 'CT', label: 'CT', desc: 'Đi công tác (1.0)', value: 1.0, color: 'bg-indigo-500 text-white' },
  { code: 'N', label: 'N', desc: 'Nghỉ không lương (0.0)', value: 0.0, color: 'bg-amber-500 text-white' },
  { code: 'O', label: 'O', desc: 'Nghỉ ốm hưởng BHXH (0.0)', value: 0.0, color: 'bg-orange-500 text-white' },
  { code: 'KP', label: 'KP', desc: 'Nghỉ không phép (0.0)', value: 0.0, color: 'bg-rose-500 text-white' },
];

export function TimekeepingPage() {
  const [selectedMonth, setSelectedMonth] = useState('2026-04');
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBrush, setSelectedBrush] = useState<AttendanceCode>('X');
  const [isLocked, setIsLocked] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Sinh danh sách ngày trong tháng được chọn
  const daysInMonth = useMemo(() => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const date = new Date(y, m, 0);
    const count = date.getDate();
    const days: { day: number; dateStr: string; dayOfWeek: string; isWeekend: boolean }[] = [];
    const dowNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

    for (let d = 1; d <= count; d++) {
      const curDate = new Date(y, m - 1, d);
      const dowIndex = curDate.getDay();
      days.push({
        day: d,
        dateStr: `${selectedMonth}-${String(d).padStart(2, '0')}`,
        dayOfWeek: dowNames[dowIndex],
        isWeekend: dowIndex === 0, // Chủ nhật
      });
    }
    return days;
  }, [selectedMonth]);

  // Khởi tạo bảng công giả lập ban đầu cho 8 nhân viên
  const [gridData, setGridData] = useState<Record<string, Record<number, AttendanceCode>>>(() => {
    const initial: Record<string, Record<number, AttendanceCode>> = {};
    MOCK_EMPLOYEES.forEach((emp) => {
      initial[emp.id] = {};
      for (let d = 1; d <= 30; d++) {
        const curDate = new Date(2026, 3, d);
        const dow = curDate.getDay();
        if (dow === 0) {
          // Chủ nhật
          initial[emp.id][d] = 'N';
        } else if (d === 30) {
          // 30/4 Giải phóng miền Nam (Lễ)
          initial[emp.id][d] = 'L';
        } else if (emp.code === 'NV006' && d > 12) {
          // NV006 nghỉ không lương > 14 ngày
          initial[emp.id][d] = 'N';
        } else if (emp.code === 'NV003' && d === 15) {
          // Nghỉ phép
          initial[emp.id][d] = 'P';
        } else {
          initial[emp.id][d] = 'X';
        }
      }
    });
    return initial;
  });

  // Số giờ OT mẫu
  const [otHours, setOtHours] = useState<Record<string, number>>({
    emp_1: 0,
    emp_2: 0,
    emp_3: 16,
    emp_4: 12,
    emp_5: 8,
    emp_6: 0,
    emp_7: 0,
    emp_8: 0,
  });

  // Lọc nhân viên
  const filteredEmployees = useMemo(() => {
    return MOCK_EMPLOYEES.filter((emp) => {
      const matchSearch =
        emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.code.toLowerCase().includes(searchQuery.toLowerCase());
      const matchDept = selectedDept === 'ALL' || emp.departmentName === selectedDept;
      return matchSearch && matchDept;
    });
  }, [searchQuery, selectedDept]);

  // Click vào 1 ô ngày chấm công
  const handleCellClick = (empId: string, day: number) => {
    if (isLocked) {
      alert('Bảng công tháng này đã được khóa. Vui lòng mở khóa để sửa đổi!');
      return;
    }
    setGridData((prev) => ({
      ...prev,
      [empId]: {
        ...(prev[empId] || {}),
        [day]: selectedBrush,
      },
    }));
  };

  // Tính toán tóm tắt công cho từng nhân viên
  const employeeSummaries = useMemo(() => {
    const summaries: Record<
      string,
      {
        actualWorkDays: number;
        paidLeaveDays: number;
        holidayDays: number;
        totalPaidDays: number;
        unpaidLeaveDays: number;
        sickLeaveDays: number;
        overtimeHours: number;
      }
    > = {};

    MOCK_EMPLOYEES.forEach((emp) => {
      const empGrid = gridData[emp.id] || {};
      let actual = 0;
      let pDays = 0;
      let lDays = 0;
      let unpaid = 0;
      let sick = 0;

      daysInMonth.forEach(({ day, isWeekend }) => {
        const code = empGrid[day];
        if (code === 'X') actual += 1;
        else if (code === 'X/2') actual += 0.5;
        else if (code === 'CT') actual += 1;
        else if (code === 'P') pDays += 1;
        else if (code === 'L') lDays += 1;
        else if (code === 'O') sick += 1;
        else if (code === 'N' || code === 'KP') {
          if (!isWeekend) unpaid += 1;
        }
      });

      summaries[emp.id] = {
        actualWorkDays: actual,
        paidLeaveDays: pDays,
        holidayDays: lDays,
        totalPaidDays: actual + pDays + lDays,
        unpaidLeaveDays: unpaid,
        sickLeaveDays: sick,
        overtimeHours: otHours[emp.id] || 0,
      };
    });

    return summaries;
  }, [gridData, daysInMonth, otHours]);

  // Điền nhanh cả tháng
  const handleQuickFill = (type: 'ALL_X' | 'SUNDAY_N') => {
    if (isLocked) return;
    setGridData((prev) => {
      const next = { ...prev };
      MOCK_EMPLOYEES.forEach((emp) => {
        next[emp.id] = { ...(next[emp.id] || {}) };
        daysInMonth.forEach(({ day, isWeekend }) => {
          if (type === 'ALL_X') {
            if (!isWeekend) next[emp.id][day] = 'X';
          } else if (type === 'SUNDAY_N') {
            if (isWeekend) next[emp.id][day] = 'N';
          }
        });
      });
      return next;
    });
  };

  const handleSave = () => {
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="bg-background text-foreground min-h-screen">
      <DemoBanner />

      <main className="mx-auto max-w-[1550px] px-3 py-6 sm:px-6">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Bảng Chấm Công Chi Tiết</h1>
              <span className="rounded-full bg-primary/10 px-3 py-0.5 text-xs font-bold text-primary">
                Kỳ công: Tháng {selectedMonth.split('-')[1]}/{selectedMonth.split('-')[0]}
              </span>
              {isLocked ? (
                <span className="flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-bold text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                  <Lock className="h-3 w-3" /> Đã Khóa
                </span>
              ) : (
                <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                  <Unlock className="h-3 w-3" /> Đang Mở Ghi Nhận
                </span>
              )}
            </div>
            <p className="text-muted-foreground mt-1 text-sm">
              Ghi nhận ca làm việc, ngày nghỉ phép, công tác và số giờ làm thêm (OT) theo quy chuẩn Luật Lao Động.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <TenantSwitcher />
            <button
              type="button"
              onClick={() => setIsLocked(!isLocked)}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
                isLocked
                  ? 'border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-300'
                  : 'border-border bg-card hover:bg-muted text-foreground'
              }`}
            >
              {isLocked ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
              <span>{isLocked ? 'Mở Khóa Công' : 'Khóa Bảng Công'}</span>
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-sm font-semibold shadow-xs hover:bg-muted transition-colors"
            >
              <Printer className="h-4 w-4 text-muted-foreground" />
              <span>In Bảng Công</span>
            </button>

            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
            >
              {savedSuccess ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
              <span>{savedSuccess ? 'Đã Lưu!' : 'Lưu Thay Đổi'}</span>
            </button>
          </div>
        </div>

        {/* Toolbar: Brush Selector & Fast Tools */}
        <div className="mb-6 rounded-xl border border-border bg-card p-4 shadow-xs">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            {/* Brushes */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1 text-xs font-bold text-muted-foreground uppercase mr-1">
                <Paintbrush className="h-3.5 w-3.5 text-primary" />
                Cọ Chấm:
              </span>
              {ATTENDANCE_BRUSHES.map((b) => (
                <button
                  key={b.code}
                  type="button"
                  onClick={() => setSelectedBrush(b.code)}
                  className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold transition-all ${
                    selectedBrush === b.code
                      ? 'ring-2 ring-primary ring-offset-2 scale-105 shadow-sm'
                      : 'opacity-85 hover:opacity-100 hover:scale-102'
                  } ${b.color}`}
                  title={b.desc}
                >
                  <span>{b.label}</span>
                  <span className="text-[10px] font-normal opacity-90 hidden sm:inline">({b.desc.split(' ')[0]})</span>
                </button>
              ))}
            </div>

            {/* Quick Fill Actions */}
            <div className="flex flex-wrap items-center gap-2 border-t pt-3 lg:border-t-0 lg:pt-0">
              <span className="text-xs font-medium text-muted-foreground">Thao tác nhanh:</span>
              <button
                type="button"
                disabled={isLocked}
                onClick={() => handleQuickFill('ALL_X')}
                className="rounded-lg border border-border bg-muted/50 px-2.5 py-1 text-xs font-medium hover:bg-muted disabled:opacity-50 transition-colors"
              >
                Tất cả đi làm (X)
              </button>
              <button
                type="button"
                disabled={isLocked}
                onClick={() => handleQuickFill('SUNDAY_N')}
                className="rounded-lg border border-border bg-muted/50 px-2.5 py-1 text-xs font-medium hover:bg-muted disabled:opacity-50 transition-colors"
              >
                Chủ nhật nghỉ (N)
              </button>
            </div>
          </div>
        </div>

        {/* Filters bar */}
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <label htmlFor="month-select" className="sr-only">Chọn tháng chấm công</label>
              <input
                id="month-select"
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
                placeholder="Tìm nhân viên..."
                className="border-input bg-card rounded-lg border py-1.5 pr-3 pl-8 text-xs focus:border-primary focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="dept-select" className="sr-only">Lọc theo phòng ban</label>
              <select
                id="dept-select"
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

          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> X = 1.0 công
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-blue-500" /> P = Phép có lương
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-purple-500" /> L = Lễ 30/4
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> N = Không lương
            </span>
          </div>
        </div>

        {/* Interactive Timesheet Grid */}
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
          <div className="overflow-x-auto max-h-[600px]">
            <table className="w-full border-collapse text-center text-xs">
              <thead className="bg-muted sticky top-0 z-20 shadow-xs">
                <tr>
                  {/* Sticky left info */}
                  <th className="sticky left-0 z-30 bg-muted px-3 py-2 text-left font-bold text-foreground border-r border-b border-border min-w-[70px]">
                    Mã NV
                  </th>
                  <th className="sticky left-[70px] z-30 bg-muted px-3 py-2 text-left font-bold text-foreground border-r border-b border-border min-w-[160px]">
                    Họ và Tên
                  </th>

                  {/* Calendar Days 1..30/31 */}
                  {daysInMonth.map((d) => (
                    <th
                      key={d.day}
                      className={`px-1 py-1.5 font-semibold border-b border-r border-border min-w-[28px] max-w-[32px] ${
                        d.isWeekend ? 'bg-muted-foreground/15 text-rose-600 font-bold' : 'text-foreground'
                      }`}
                    >
                      <div className="text-[10px] leading-tight">{d.dayOfWeek}</div>
                      <div className="text-xs font-bold leading-tight">{d.day}</div>
                    </th>
                  ))}

                  {/* Sticky right summary */}
                  <th className="bg-emerald-50 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200 px-2 py-2 font-bold border-b border-r border-border min-w-[45px]">
                    Thực tế
                  </th>
                  <th className="bg-blue-50 text-blue-900 dark:bg-blue-950 dark:text-blue-200 px-2 py-2 font-bold border-b border-r border-border min-w-[40px]">
                    Phép (P)
                  </th>
                  <th className="bg-purple-50 text-purple-900 dark:bg-purple-950 dark:text-purple-200 px-2 py-2 font-bold border-b border-r border-border min-w-[40px]">
                    Lễ (L)
                  </th>
                  <th className="bg-indigo-50 text-indigo-900 dark:bg-indigo-950 dark:text-indigo-200 px-2 py-2 font-bold border-b border-r border-border min-w-[50px]">
                    Tính lương
                  </th>
                  <th className="bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-200 px-2 py-2 font-bold border-b border-r border-border min-w-[40px]">
                    Nghỉ KL
                  </th>
                  <th className="bg-orange-50 text-orange-900 dark:bg-orange-950 dark:text-orange-200 px-2 py-2 font-bold border-b border-border min-w-[55px]">
                    Giờ OT
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredEmployees.map((emp, index) => {
                  const empGrid = gridData[emp.id] || {};
                  const summary = employeeSummaries[emp.id] || {
                    actualWorkDays: 0,
                    paidLeaveDays: 0,
                    holidayDays: 0,
                    totalPaidDays: 0,
                    unpaidLeaveDays: 0,
                    sickLeaveDays: 0,
                    overtimeHours: 0,
                  };

                  return (
                    <tr key={emp.id} className="hover:bg-muted/30 transition-colors">
                      {/* Sticky left */}
                      <td className="sticky left-0 z-10 bg-card px-3 py-2 text-left font-mono font-bold text-primary border-r border-border">
                        {emp.code}
                      </td>
                      <td className="sticky left-[70px] z-10 bg-card px-3 py-2 text-left border-r border-border">
                        <div className="font-semibold text-foreground truncate max-w-[150px]">{emp.name}</div>
                        <div className="text-[10px] text-muted-foreground truncate">{emp.departmentName}</div>
                      </td>

                      {/* Day cells */}
                      {daysInMonth.map((d) => {
                        const code = empGrid[d.day] || (d.isWeekend ? 'N' : 'X');
                        const isSunday = d.isWeekend;

                        let badgeColor = 'text-foreground';
                        if (code === 'X') badgeColor = 'text-emerald-600 font-bold';
                        else if (code === 'X/2') badgeColor = 'text-teal-600 font-bold';
                        else if (code === 'P') badgeColor = 'text-blue-600 font-bold bg-blue-50 dark:bg-blue-950';
                        else if (code === 'L') badgeColor = 'text-purple-600 font-bold bg-purple-50 dark:bg-purple-950';
                        else if (code === 'CT') badgeColor = 'text-indigo-600 font-bold bg-indigo-50 dark:bg-indigo-950';
                        else if (code === 'N') badgeColor = 'text-muted-foreground';
                        else if (code === 'O') badgeColor = 'text-orange-600 font-bold bg-orange-50 dark:bg-orange-950';
                        else if (code === 'KP') badgeColor = 'text-rose-600 font-black bg-rose-50 dark:bg-rose-950';

                        return (
                          <td
                            key={d.day}
                            onClick={() => handleCellClick(emp.id, d.day)}
                            className={`p-0 border-r border-border cursor-pointer select-none transition-colors hover:bg-primary/20 ${
                              isSunday ? 'bg-muted/40' : ''
                            } ${badgeColor}`}
                            title={`${emp.name} - Ngày ${d.day} (${d.dayOfWeek}): ${code}. Bấm để đổi thành cọ [${selectedBrush}]`}
                          >
                            <div className="flex h-8 items-center justify-center font-mono text-xs">
                              {code}
                            </div>
                          </td>
                        );
                      })}

                      {/* Summary columns */}
                      <td className="bg-emerald-50/50 dark:bg-emerald-950/20 px-2 py-2 font-mono font-bold text-emerald-700 dark:text-emerald-400 border-r border-border">
                        {summary.actualWorkDays}
                      </td>
                      <td className="bg-blue-50/50 dark:bg-blue-950/20 px-2 py-2 font-mono text-blue-700 dark:text-blue-400 border-r border-border">
                        {summary.paidLeaveDays}
                      </td>
                      <td className="bg-purple-50/50 dark:bg-purple-950/20 px-2 py-2 font-mono text-purple-700 dark:text-purple-400 border-r border-border">
                        {summary.holidayDays}
                      </td>
                      <td className="bg-indigo-50/70 dark:bg-indigo-950/40 px-2 py-2 font-mono font-bold text-indigo-700 dark:text-indigo-300 border-r border-border">
                        {summary.totalPaidDays}
                      </td>
                      <td className="bg-amber-50/50 dark:bg-amber-950/20 px-2 py-2 font-mono text-amber-700 dark:text-amber-400 border-r border-border">
                        {summary.unpaidLeaveDays}
                      </td>
                      <td className="bg-orange-50/50 dark:bg-orange-950/20 px-2 py-2 font-mono border-border">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={otHours[emp.id] ?? 0}
                          disabled={isLocked}
                          onChange={(e) =>
                            setOtHours((prev) => ({
                              ...prev,
                              [emp.id]: Math.max(0, Number(e.target.value)),
                            }))
                          }
                          aria-label={`Giờ tăng ca của ${emp.name}`}
                          className="w-12 rounded border border-border bg-background px-1 py-0.5 text-center text-xs font-bold text-orange-600 focus:outline-none"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer note */}
          <div className="border-t border-border bg-muted/20 px-4 py-3 text-xs text-muted-foreground flex flex-col sm:flex-row items-center justify-between gap-2">
            <div>
              <span>Quy định Luật 2026: </span>
              <strong className="text-foreground">Nghỉ không lương từ 14 ngày làm việc trở lên</strong> trong tháng
              sẽ tạm dừng đóng BHXH/BHYT/BHTN tháng đó (áp dụng cho nhân viên nghỉ ốm dài ngày hoặc nghỉ việc riêng).
            </div>
            <div className="font-mono text-xs">
              Chuẩn công tháng: {MOCK_SETTINGS.standardWorkingDays || 26} ngày
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
