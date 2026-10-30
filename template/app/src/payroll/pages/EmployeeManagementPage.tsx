import {
  Briefcase,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  Download,
  Edit,
  Eye,
  FileSpreadsheet,
  Filter,
  Mail,
  Phone,
  Plus,
  Printer,
  Search,
  Shield,
  Trash2,
  UserCheck,
  Users,
  X
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { DemoBanner } from '../components/DemoBanner';
import { ExcelImportModal } from '../components/ExcelImportModal';
import { TenantSwitcher } from '../components/TenantSwitcher';
import { MOCK_DEPARTMENTS, MOCK_EMPLOYEES, MOCK_SETTINGS, MOCK_TENANT } from '../mockData';
import { Employee } from '../types';
import { formatNumber, formatVND } from '../utils/docSo';

export function EmployeeManagementPage() {
  const [employees, setEmployees] = useState<Employee[]>(MOCK_EMPLOYEES);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  // Filtered employees
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const matchSearch =
        emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.phone.includes(searchQuery) ||
        emp.identityCard.includes(searchQuery);

      const matchDept = selectedDept === 'ALL' || emp.departmentName === selectedDept;
      const matchStatus = selectedStatus === 'ALL' || emp.status === selectedStatus;

      return matchSearch && matchDept && matchStatus;
    });
  }, [employees, searchQuery, selectedDept, selectedStatus]);

  // Statistics
  const stats = useMemo(() => {
    const total = employees.length;
    const working = employees.filter((e) => e.status === 'WORKING').length;
    const probation = employees.filter((e) => e.status === 'PROBATION').length;
    const maternity = employees.filter((e) => e.status === 'MATERNITY').length;
    const resigned = employees.filter((e) => e.status === 'RESIGNED').length;
    const totalPayrollBudget = employees.reduce((acc, e) => acc + e.baseSalary, 0);

    return { total, working, probation, maternity, resigned, totalPayrollBudget };
  }, [employees]);

  const handleOpenAdd = () => {
    setEditingEmployee(null);
    setIsAddEditModalOpen(true);
  };

  const handleOpenEdit = (emp: Employee) => {
    setEditingEmployee(emp);
    setIsAddEditModalOpen(true);
  };

  const handleSaveEmployee = (empData: Partial<Employee>) => {
    if (editingEmployee) {
      // Update
      setEmployees((prev) =>
        prev.map((e) => (e.id === editingEmployee.id ? ({ ...e, ...empData } as Employee) : e))
      );
    } else {
      // Create new
      const newEmp: Employee = {
        id: `emp_${Date.now()}`,
        tenantId: MOCK_TENANT.id,
        code: empData.code || `NV${String(employees.length + 1).padStart(3, '0')}`,
        name: empData.name || 'Nhân viên mới',
        departmentId: empData.departmentId || 'dept_1',
        departmentName:
          MOCK_DEPARTMENTS.find((d) => d.id === empData.departmentId)?.name || 'Kinh Doanh & CSKH',
        position: empData.position || 'Chuyên viên',
        identityCard: empData.identityCard || '001099******',
        phone: empData.phone || '0901234567',
        email: empData.email || 'nv@company.com',
        startDate: empData.startDate || '2026-05-01',
        contractType: empData.contractType || 'INDETERMINATE',
        salaryType: empData.salaryType || 'TIME_BASED',
        baseSalary: Number(empData.baseSalary) || 10000000,
        insuranceSalary: Number(empData.insuranceSalary) || 10000000,
        pieceRateUnitPrice: Number(empData.pieceRateUnitPrice) || 0,
        taxDependentsCount: Number(empData.taxDependentsCount) || 0,
        allowances: {
          lunch: Number(empData.allowances?.lunch ?? 730000),
          phone: Number(empData.allowances?.phone ?? 300000),
          fuel: Number(empData.allowances?.fuel ?? 300000),
          housing: Number(empData.allowances?.housing ?? 0),
          seniority: Number(empData.allowances?.seniority ?? 0),
          attendanceBonus: Number(empData.allowances?.attendanceBonus ?? 500000),
        },
        bankAccount: {
          accountNumber: empData.bankAccount?.accountNumber || '1903******',
          bankName: empData.bankAccount?.bankName || 'Techcombank',
          branch: empData.bankAccount?.branch || 'Hà Nội',
        },
        status: (empData.status as any) || 'WORKING',
      };
      setEmployees((prev) => [...prev, newEmp]);
    }
    setIsAddEditModalOpen(false);
  };

  const handleExportCSV = () => {
    const headers = ['Mã NV', 'Họ và tên', 'Phòng ban', 'Chức vụ', 'Lương cơ bản', 'Lương đóng BH', 'Số NPT', 'Trạng thái'];
    const rows = filteredEmployees.map((e) => [
      e.code,
      `"${e.name}"`,
      `"${e.departmentName}"`,
      `"${e.position}"`,
      e.baseSalary,
      e.insuranceSalary,
      e.taxDependentsCount,
      e.status,
    ]);
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Danh_sach_nhan_vien_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  };

  return (
    <div className="bg-background text-foreground min-h-screen">
      <DemoBanner />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header bar */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Hồ Sơ Nhân Sự & Hợp Đồng</h1>
              <span className="rounded-full bg-primary/10 px-3 py-0.5 text-xs font-bold text-primary">
                {employees.length} Nhân sự
              </span>
            </div>
            <p className="text-muted-foreground mt-1 text-sm">
              Quản lý danh sách nhân viên, thang bảng lương, bảo hiểm xã hội và người phụ thuộc giảm trừ gia cảnh.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <TenantSwitcher />
            <button
              type="button"
              onClick={() => setIsImportModalOpen(true)}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-sm font-semibold shadow-xs hover:bg-muted transition-colors"
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
              <span>Nhập Excel</span>
            </button>
            <button
              type="button"
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-sm font-semibold shadow-xs hover:bg-muted transition-colors"
            >
              <Download className="h-4 w-4 text-blue-600" />
              <span>Xuất CSV</span>
            </button>
            <button
              type="button"
              onClick={handleOpenAdd}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Thêm Nhân Viên</span>
            </button>
          </div>
        </div>

        {/* 4 Stat Cards */}
        <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-5">
          <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Tổng nhân sự</span>
              <Users className="h-4 w-4 text-primary" />
            </div>
            <p className="mt-2 text-2xl font-black">{stats.total}</p>
            <span className="text-[11px] text-muted-foreground">Toàn doanh nghiệp</span>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Đang làm việc</span>
              <UserCheck className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="mt-2 text-2xl font-black text-emerald-600">{stats.working}</p>
            <span className="text-[11px] text-muted-foreground">Chính thức tham gia chấm công</span>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Thử việc</span>
              <Briefcase className="h-4 w-4 text-amber-600" />
            </div>
            <p className="mt-2 text-2xl font-black text-amber-600">{stats.probation}</p>
            <span className="text-[11px] text-muted-foreground">Hưởng 85% lương chính thức</span>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Nghỉ thai sản / chế độ</span>
              <Calendar className="h-4 w-4 text-purple-600" />
            </div>
            <p className="mt-2 text-2xl font-black text-purple-600">{stats.maternity}</p>
            <span className="text-[11px] text-muted-foreground">Hưởng trợ cấp BHXH</span>
          </div>

          <div className="col-span-2 rounded-xl border border-border bg-card p-4 shadow-xs lg:col-span-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Quỹ lương cơ bản</span>
              <CreditCard className="h-4 w-4 text-blue-600" />
            </div>
            <p className="mt-2 text-lg font-black text-blue-600 truncate">{formatVND(stats.totalPayrollBudget)}</p>
            <span className="text-[11px] text-muted-foreground">Mức lương chuẩn / tháng</span>
          </div>
        </div>

        {/* Filter bar */}
        <div className="mb-6 flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-xs md:flex-row md:items-center md:justify-between">
          <div className="relative flex-1">
            <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo Mã NV, Họ tên, SĐT, CCCD..."
              className="border-input bg-background w-full rounded-lg border py-2 pr-4 pl-9 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Filter className="h-3.5 w-3.5" />
              <span>Lọc:</span>
            </div>

            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              aria-label="Lọc theo phòng ban"
              className="border-input bg-background rounded-lg border px-3 py-2 text-xs font-medium focus:border-primary focus:outline-none"
            >
              <option value="ALL">Tất cả phòng ban</option>
              {MOCK_DEPARTMENTS.map((dept) => (
                <option key={dept.id} value={dept.name}>
                  {dept.name}
                </option>
              ))}
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              aria-label="Lọc theo trạng thái làm việc"
              className="border-input bg-background rounded-lg border px-3 py-2 text-xs font-medium focus:border-primary focus:outline-none"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="WORKING">Đang làm việc</option>
              <option value="PROBATION">Thử việc</option>
              <option value="MATERNITY">Nghỉ thai sản</option>
              <option value="RESIGNED">Đã thôi việc</option>
            </select>

            {(searchQuery || selectedDept !== 'ALL' || selectedStatus !== 'ALL') && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedDept('ALL');
                  setSelectedStatus('ALL');
                }}
                className="text-muted-foreground hover:text-foreground rounded-lg px-2 py-1.5 text-xs underline"
              >
                Xóa bộ lọc
              </button>
            )}
          </div>
        </div>

        {/* Employees Table */}
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50 text-xs font-semibold text-muted-foreground uppercase border-b border-border">
                <tr>
                  <th scope="col" className="px-4 py-3.5">Mã NV & Họ Tên</th>
                  <th scope="col" className="px-4 py-3.5">Phòng Ban & Vị Trí</th>
                  <th scope="col" className="px-4 py-3.5">Hình Thức Lương</th>
                  <th scope="col" className="px-4 py-3.5 text-right">Lương Cơ Bản</th>
                  <th scope="col" className="px-4 py-3.5 text-right">Lương Đóng BH</th>
                  <th scope="col" className="px-4 py-3.5 text-center">NPT (Giảm trừ)</th>
                  <th scope="col" className="px-4 py-3.5 text-center">Trạng Thái</th>
                  <th scope="col" className="px-4 py-3.5 text-right">Hành Động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-muted-foreground">
                      Không tìm thấy nhân viên nào phù hợp với điều kiện tìm kiếm.
                    </td>
                  </tr>
                ) : (
                  filteredEmployees.map((emp) => {
                    return (
                      <tr key={emp.id} className="hover:bg-muted/40 transition-colors">
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs">
                              {emp.name
                                .split(' ')
                                .slice(-2)
                                .map((n) => n[0])
                                .join('')}
                            </div>
                            <div>
                              <div className="font-bold text-foreground">{emp.name}</div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span className="font-mono text-primary font-semibold">{emp.code}</span>
                                <span>·</span>
                                <span>{emp.phone}</span>
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-3.5">
                          <div className="font-medium text-foreground">{emp.departmentName}</div>
                          <div className="text-xs text-muted-foreground">{emp.position}</div>
                        </td>

                        <td className="px-4 py-3.5">
                          {emp.salaryType === 'PIECE_RATE' ? (
                            <span className="inline-flex items-center rounded-md bg-purple-50 px-2 py-0.5 text-xs font-semibold text-purple-700 border border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800">
                              Sản phẩm ({formatNumber(emp.pieceRateUnitPrice)}đ/sp)
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 border border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800">
                              Theo thời gian (tháng)
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-3.5 text-right font-semibold font-mono text-foreground">
                          {formatVND(emp.baseSalary)}
                        </td>

                        <td className="px-4 py-3.5 text-right font-mono text-muted-foreground">
                          {formatVND(emp.insuranceSalary)}
                        </td>

                        <td className="px-4 py-3.5 text-center">
                          <span className="inline-flex items-center justify-center h-6 min-w-6 px-1.5 rounded-full bg-muted font-mono font-bold text-xs">
                            {emp.taxDependentsCount}
                          </span>
                        </td>

                        <td className="px-4 py-3.5 text-center">
                          {emp.status === 'WORKING' && (
                            <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800">
                              Đang làm việc
                            </span>
                          )}
                          {emp.status === 'PROBATION' && (
                            <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 border border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800">
                              Thử việc
                            </span>
                          )}
                          {emp.status === 'MATERNITY' && (
                            <span className="inline-flex items-center rounded-full bg-purple-50 px-2.5 py-0.5 text-xs font-medium text-purple-700 border border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800">
                              Thai sản
                            </span>
                          )}
                          {emp.status === 'RESIGNED' && (
                            <span className="inline-flex items-center rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-medium text-rose-700 border border-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800">
                              Đã thôi việc
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(emp)}
                              className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                              title="Chỉnh sửa thông tin"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm(`Bạn có chắc muốn chuyển trạng thái nhân viên ${emp.name} thành đã thôi việc?`)) {
                                  setEmployees((prev) =>
                                    prev.map((e) => (e.id === emp.id ? { ...e, status: 'RESIGNED' } : e))
                                  );
                                }
                              }}
                              className="rounded-lg p-1.5 text-muted-foreground hover:bg-rose-50 hover:text-rose-600 transition-colors"
                              title="Nghỉ việc"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="border-t border-border bg-muted/20 px-4 py-3 text-xs text-muted-foreground flex items-center justify-between">
            <span>Hiển thị {filteredEmployees.length} / {employees.length} nhân viên</span>
            <span className="font-mono">Doanh nghiệp: {MOCK_TENANT.name}</span>
          </div>
        </div>
      </main>

      {/* Add / Edit Employee Modal */}
      {isAddEditModalOpen && (
        <EmployeeFormModal
          isOpen={isAddEditModalOpen}
          initialData={editingEmployee}
          onClose={() => setIsAddEditModalOpen(false)}
          onSave={handleSaveEmployee}
        />
      )}

      {/* Excel Import Modal */}
      <ExcelImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportSuccess={(count) => {
          alert(`Đã nhập thành công ${count} nhân viên vào hệ thống (Chế độ demo)!`);
          setIsImportModalOpen(false);
        }}
      />
    </div>
  );
}

interface EmployeeFormModalProps {
  isOpen: boolean;
  initialData: Employee | null;
  onClose: () => void;
  onSave: (data: Partial<Employee>) => void;
}

function EmployeeFormModal({ isOpen, initialData, onClose, onSave }: EmployeeFormModalProps) {
  const [formData, setFormData] = useState<Partial<Employee>>(
    initialData || {
      code: '',
      name: '',
      departmentId: MOCK_DEPARTMENTS[0].id,
      position: 'Chuyên viên',
      identityCard: '001099******',
      phone: '090',
      email: '',
      startDate: '2026-05-01',
      contractType: 'INDETERMINATE',
      salaryType: 'TIME_BASED',
      baseSalary: 12000000,
      insuranceSalary: 10000000,
      pieceRateUnitPrice: 0,
      taxDependentsCount: 0,
      status: 'WORKING',
      allowances: {
        lunch: 730000,
        phone: 300000,
        fuel: 300000,
        housing: 0,
        seniority: 0,
        attendanceBonus: 500000,
      },
      bankAccount: {
        accountNumber: '1903******',
        bankName: 'Techcombank',
        branch: 'Hà Nội',
      },
    }
  );

  const [activeTab, setActiveTab] = useState<'INFO' | 'SALARY' | 'ALLOWANCE' | 'BANK'>('INFO');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim()) {
      alert('Vui lòng nhập Họ và tên nhân viên!');
      return;
    }
    onSave(formData);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-card text-card-foreground relative my-8 w-full max-w-2xl rounded-2xl border border-border shadow-2xl transition-all">
        {/* Header */}
        <div className="border-b border-border flex items-center justify-between px-6 py-4">
          <div>
            <h3 className="text-base font-bold text-foreground">
              {initialData ? `Chỉnh Sửa Hồ Sơ — ${initialData.name}` : 'Thêm Nhân Viên Mới Vào Hệ Thống'}
            </h3>
            <p className="text-muted-foreground text-xs">
              Thiết lập dữ liệu nhân sự, thang bảng lương, bảo hiểm và người phụ thuộc
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="hover:bg-muted text-muted-foreground hover:text-foreground rounded-lg p-1.5 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab selection */}
        <div className="border-b border-border px-6 flex gap-4 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('INFO')}
            className={`py-3 border-b-2 transition-colors ${
              activeTab === 'INFO'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            1. Thông tin chung
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('SALARY')}
            className={`py-3 border-b-2 transition-colors ${
              activeTab === 'SALARY'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            2. Lương & Thuế / BHXH
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ALLOWANCE')}
            className={`py-3 border-b-2 transition-colors ${
              activeTab === 'ALLOWANCE'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            3. Phụ cấp chính sách
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('BANK')}
            className={`py-3 border-b-2 transition-colors ${
              activeTab === 'BANK'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            4. Tài khoản ngân hàng
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-6 max-h-[65vh] overflow-y-auto space-y-4">
            {activeTab === 'INFO' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-foreground">Mã nhân viên (*)</label>
                  <input
                    type="text"
                    value={formData.code || ''}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="VD: NV009"
                    className="border-input bg-background mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:border-primary focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground">Họ và tên (*)</label>
                  <input
                    type="text"
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="VD: Nguyễn Văn B"
                    className="border-input bg-background mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:border-primary focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground">Phòng ban</label>
                  <select
                    value={formData.departmentId}
                    onChange={(e) => {
                      const dept = MOCK_DEPARTMENTS.find((d) => d.id === e.target.value);
                      setFormData({
                        ...formData,
                        departmentId: e.target.value,
                        departmentName: dept?.name || '',
                      });
                    }}
                    className="border-input bg-background mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:border-primary focus:outline-none"
                  >
                    {MOCK_DEPARTMENTS.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground">Chức danh / Vị trí</label>
                  <input
                    type="text"
                    value={formData.position || ''}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    placeholder="VD: Chuyên viên kinh doanh"
                    className="border-input bg-background mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground">Số CCCD / Hộ chiếu</label>
                  <input
                    type="text"
                    value={formData.identityCard || ''}
                    onChange={(e) => setFormData({ ...formData, identityCard: e.target.value })}
                    placeholder="001099******"
                    className="border-input bg-background mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground">Số điện thoại</label>
                  <input
                    type="text"
                    value={formData.phone || ''}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="0901234567"
                    className="border-input bg-background mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground">Email công việc</label>
                  <input
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="nv@company.com"
                    className="border-input bg-background mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground">Trạng thái nhân sự</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="border-input bg-background mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:border-primary focus:outline-none"
                  >
                    <option value="WORKING">Đang làm việc (Chính thức)</option>
                    <option value="PROBATION">Thử việc</option>
                    <option value="MATERNITY">Nghỉ thai sản</option>
                    <option value="RESIGNED">Đã thôi việc</option>
                  </select>
                </div>
              </div>
            )}

            {activeTab === 'SALARY' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-foreground">Hình thức hưởng lương</label>
                    <select
                      value={formData.salaryType}
                      onChange={(e) => setFormData({ ...formData, salaryType: e.target.value as any })}
                      className="border-input bg-background mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:border-primary focus:outline-none"
                    >
                      <option value="TIME_BASED">Lương thời gian (Theo ngày công chuẩn)</option>
                      <option value="PIECE_RATE">Lương sản phẩm (Theo sản lượng bàn giao)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-foreground">Mức lương cơ bản (VND) (*)</label>
                    <input
                      type="number"
                      value={formData.baseSalary || 0}
                      onChange={(e) => setFormData({ ...formData, baseSalary: Number(e.target.value) })}
                      className="border-input bg-background mt-1 w-full rounded-lg border px-3 py-2 text-sm font-mono focus:border-primary focus:outline-none"
                      required
                    />
                    <span className="text-[11px] text-muted-foreground">
                      {formatVND(formData.baseSalary || 0)}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-foreground">Lương đóng BHXH/BHYT/BHTN</label>
                    <input
                      type="number"
                      value={formData.insuranceSalary || 0}
                      onChange={(e) => setFormData({ ...formData, insuranceSalary: Number(e.target.value) })}
                      className="border-input bg-background mt-1 w-full rounded-lg border px-3 py-2 text-sm font-mono focus:border-primary focus:outline-none"
                    />
                    <span className="text-[11px] text-muted-foreground">
                      Trần đóng: {formatVND(MOCK_SETTINGS.insuranceCeilingSalary)}
                    </span>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-foreground">Số người phụ thuộc (NPT)</label>
                    <input
                      type="number"
                      min={0}
                      max={10}
                      value={formData.taxDependentsCount || 0}
                      onChange={(e) => setFormData({ ...formData, taxDependentsCount: Number(e.target.value) })}
                      className="border-input bg-background mt-1 w-full rounded-lg border px-3 py-2 text-sm font-mono focus:border-primary focus:outline-none"
                    />
                    <span className="text-[11px] text-muted-foreground">
                      Giảm trừ: {formatVND((formData.taxDependentsCount || 0) * 4400000)}/tháng
                    </span>
                  </div>
                </div>

                {formData.salaryType === 'PIECE_RATE' && (
                  <div className="rounded-lg border border-purple-200 bg-purple-50/50 p-3 dark:border-purple-900 dark:bg-purple-950/30">
                    <label className="text-xs font-semibold text-purple-900 dark:text-purple-300">
                      Đơn giá sản phẩm cơ sở (VND / sản phẩm)
                    </label>
                    <input
                      type="number"
                      value={formData.pieceRateUnitPrice || 0}
                      onChange={(e) => setFormData({ ...formData, pieceRateUnitPrice: Number(e.target.value) })}
                      placeholder="VD: 15000"
                      className="border-input bg-background mt-1 w-full rounded-lg border px-3 py-2 text-sm font-mono focus:border-primary focus:outline-none"
                    />
                  </div>
                )}
              </div>
            )}

            {activeTab === 'ALLOWANCE' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-foreground">Phụ cấp ăn trưa</label>
                  <input
                    type="number"
                    value={formData.allowances?.lunch || 0}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        allowances: { ...formData.allowances!, lunch: Number(e.target.value) },
                      })
                    }
                    className="border-input bg-background mt-1 w-full rounded-lg border px-3 py-2 text-sm font-mono focus:border-primary focus:outline-none"
                  />
                  <span className="text-[11px] text-emerald-600">Miễn thuế tối đa 730.000đ/tháng</span>
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground">Phụ cấp điện thoại</label>
                  <input
                    type="number"
                    value={formData.allowances?.phone || 0}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        allowances: { ...formData.allowances!, phone: Number(e.target.value) },
                      })
                    }
                    className="border-input bg-background mt-1 w-full rounded-lg border px-3 py-2 text-sm font-mono focus:border-primary focus:outline-none"
                  />
                  <span className="text-[11px] text-muted-foreground">Khoán chi theo tính chất công việc</span>
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground">Phụ cấp đi lại / xăng xe</label>
                  <input
                    type="number"
                    value={formData.allowances?.fuel || 0}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        allowances: { ...formData.allowances!, fuel: Number(e.target.value) },
                      })
                    }
                    className="border-input bg-background mt-1 w-full rounded-lg border px-3 py-2 text-sm font-mono focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground">Thưởng chuyên cần (chuẩn)</label>
                  <input
                    type="number"
                    value={formData.allowances?.attendanceBonus || 0}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        allowances: { ...formData.allowances!, attendanceBonus: Number(e.target.value) },
                      })
                    }
                    className="border-input bg-background mt-1 w-full rounded-lg border px-3 py-2 text-sm font-mono focus:border-primary focus:outline-none"
                  />
                </div>
              </div>
            )}

            {activeTab === 'BANK' && (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-foreground">Số tài khoản ngân hàng</label>
                  <input
                    type="text"
                    value={formData.bankAccount?.accountNumber || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        bankAccount: { ...formData.bankAccount!, accountNumber: e.target.value },
                      })
                    }
                    placeholder="VD: 1903678912345"
                    className="border-input bg-background mt-1 w-full rounded-lg border px-3 py-2 text-sm font-mono focus:border-primary focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-foreground">Ngân hàng thụ hưởng</label>
                    <input
                      type="text"
                      value={formData.bankAccount?.bankName || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          bankAccount: { ...formData.bankAccount!, bankName: e.target.value },
                        })
                      }
                      placeholder="VD: Vietcombank, Techcombank..."
                      className="border-input bg-background mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:border-primary focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-foreground">Chi nhánh</label>
                    <input
                      type="text"
                      value={formData.bankAccount?.branch || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          bankAccount: { ...formData.bankAccount!, branch: e.target.value },
                        })
                      }
                      placeholder="VD: Hoàn Kiếm, Hà Nội"
                      className="border-input bg-background mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:border-primary focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer actions */}
          <div className="border-t border-border bg-muted/30 px-6 py-4 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-muted transition-colors"
            >
              Hủy Bỏ
            </button>
            <button
              type="submit"
              className="rounded-lg bg-primary px-5 py-2 text-sm font-bold text-primary-foreground shadow-xs hover:bg-primary/90 transition-colors"
            >
              Lưu Hồ Sơ
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
