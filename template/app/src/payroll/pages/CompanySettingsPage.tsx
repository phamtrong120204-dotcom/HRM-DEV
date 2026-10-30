import {
  AlertTriangle,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  CreditCard,
  Eye,
  FileCheck,
  FileSpreadsheet,
  FileText,
  History,
  Lock,
  Plus,
  RotateCcw,
  Save,
  Search,
  Settings,
  Shield,
  ShieldAlert,
  Sparkles,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
  X
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { DemoBanner } from '../components/DemoBanner';
import { OnboardingWizardModal } from '../components/OnboardingWizardModal';
import { TenantSwitcher } from '../components/TenantSwitcher';
import {
  MOCK_AUDIT_LOGS,
  MOCK_DEPARTMENTS,
  MOCK_MEMBERS,
  MOCK_POSITIONS,
  MOCK_SETTINGS,
  MOCK_TENANT
} from '../mockData';
import { AuditLog, CompanySetting, Department, Tenant, TenantMember } from '../types';
import { formatNumber, formatVND } from '../utils/docSo';

export function CompanySettingsPage() {
  const [activeTab, setActiveTab] = useState<
    'PROFILE' | 'DEPTS' | 'SHIFTS' | 'ALLOWANCE' | 'TAX_INS' | 'MEMBERS' | 'TEMPLATES' | 'AUDIT'
  >('PROFILE');

  const [tenant, setTenant] = useState<Tenant>(MOCK_TENANT);
  const [settings, setSettings] = useState<CompanySetting>(MOCK_SETTINGS);
  const [departments, setDepartments] = useState<Department[]>(MOCK_DEPARTMENTS);
  const [members, setMembers] = useState<TenantMember[]>(MOCK_MEMBERS);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(MOCK_AUDIT_LOGS);

  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [showValidationAlert, setShowValidationAlert] = useState(false);

  // Validate settings before save
  const handleValidateSettings = () => {
    const errors: string[] = [];
    if (!tenant.name.trim()) errors.push('Tên doanh nghiệp không được để trống.');
    if (!tenant.taxId?.trim()) errors.push('Mã số thuế doanh nghiệp không được để trống.');
    if (settings.standardWorkingDays < 20 || settings.standardWorkingDays > 28) {
      errors.push('Số ngày công chuẩn phải nằm trong khoảng từ 20 đến 28 ngày.');
    }
    if (settings.lunchAllowanceTaxExemptLimit > 1000000) {
      errors.push('Cảnh báo: Phụ cấp ăn trưa vượt trần miễn thuế theo Thông tư 26/2015 (730.000đ/tháng).');
    }
    setValidationErrors(errors);
    setShowValidationAlert(true);
    return errors.length === 0;
  };

  const handleSave = () => {
    const isValid = handleValidateSettings();
    if (!isValid) return;

    // Record audit log
    const newLog: AuditLog = {
      id: `log_${Date.now()}`,
      tenantId: tenant.id,
      userId: 'user_1',
      userName: 'Nguyễn Văn An (Admin)',
      action: 'UPDATE_SETTINGS',
      scope: 'COMPANY_SETTINGS',
      description: 'Cập nhật cấu hình doanh nghiệp từ Trung tâm Cài đặt',
      createdAt: new Date().toISOString(),
    };
    setAuditLogs((prev) => [newLog, ...prev]);

    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <div className="bg-background text-foreground min-h-screen">
      <DemoBanner />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header bar */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Trung Tâm Cài Đặt Doanh Nghiệp</h1>
              <span className="rounded-full bg-primary/10 px-3 py-0.5 text-xs font-bold text-primary">
                Multi-Tenant Ready
              </span>
            </div>
            <p className="text-muted-foreground mt-1 text-sm">
              Cấu hình thông tin pháp nhân, phòng ban, ca kíp, quy tắc tính lương, biểu mẫu và phân quyền thành viên.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <TenantSwitcher />
            <button
              type="button"
              onClick={() => setIsOnboardingOpen(true)}
              className="flex items-center gap-1.5 rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-sm font-bold text-primary hover:bg-primary/20 transition-colors"
            >
              <Sparkles className="h-4 w-4" />
              <span>Khởi Tạo Mới (Wizard)</span>
            </button>
            <button
              type="button"
              onClick={handleValidateSettings}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-sm font-semibold shadow-xs hover:bg-muted transition-colors"
            >
              <Shield className="h-4 w-4 text-blue-600" />
              <span>Kiểm Tra Mâu Thuẫn</span>
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
            >
              {saveSuccess ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
              <span>{saveSuccess ? 'Đã Lưu!' : 'Lưu Cài Đặt'}</span>
            </button>
          </div>
        </div>

        {/* Validation Modal / Alert */}
        {showValidationAlert && (
          <div
            className={`mb-6 rounded-xl border p-4 text-xs ${
              validationErrors.length === 0
                ? 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200'
                : 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2 font-bold text-sm">
                {validationErrors.length === 0 ? (
                  <>
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    <span>Tất cả các cấu hình hợp lệ và nhất quán! Không phát hiện mâu thuẫn nghiệp vụ.</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-5 w-5 text-amber-600" />
                    <span>Phát hiện {validationErrors.length} điểm cần lưu ý trước khi lưu:</span>
                  </>
                )}
              </div>
              <button
                type="button"
                onClick={() => setShowValidationAlert(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {validationErrors.length > 0 && (
              <ul className="mt-2 list-disc list-inside space-y-1 pl-6">
                {validationErrors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* 8 Tab Navigation */}
        <div className="mb-6 border-b border-border flex overflow-x-auto gap-4 text-xs font-bold">
          {[
            { id: 'PROFILE', label: '1. Hồ sơ doanh nghiệp', icon: Building2 },
            { id: 'DEPTS', label: '2. Phòng ban & Chức danh', icon: Users },
            { id: 'SHIFTS', label: '3. Ca làm & Chấm công', icon: Clock },
            { id: 'ALLOWANCE', label: '4. Chính sách lương & Phụ cấp', icon: CreditCard },
            { id: 'TAX_INS', label: '5. Thuế & BHXH (Nhóm B)', icon: ShieldAlert },
            { id: 'MEMBERS', label: '6. Thành viên & Phân quyền', icon: UserCheck },
            { id: 'TEMPLATES', label: '7. Mẫu biểu & Chữ ký', icon: FileSpreadsheet },
            { id: 'AUDIT', label: '8. Nhật ký thay đổi', icon: History },
          ].map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 pb-3 whitespace-nowrap border-b-2 transition-colors ${
                  isSelected
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* TAB 1: HỒ SƠ DOANH NGHIỆP */}
        {activeTab === 'PROFILE' && (
          <div className="rounded-xl border border-border bg-card p-6 shadow-xs space-y-6">
            <h3 className="font-bold text-base border-b border-border pb-3">Thông Tin Pháp Nhân Doanh Nghiệp</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-foreground">Tên công ty / Doanh nghiệp (*)</label>
                <input
                  type="text"
                  value={tenant.name}
                  onChange={(e) => setTenant({ ...tenant, name: e.target.value })}
                  className="border-input bg-background mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:border-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground">Mã số thuế (MST) (*)</label>
                <input
                  type="text"
                  value={tenant.taxId || ''}
                  onChange={(e) => setTenant({ ...tenant, taxId: e.target.value })}
                  className="border-input bg-background mt-1 w-full rounded-lg border px-3 py-2 text-sm font-mono focus:border-primary focus:outline-none"
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-semibold text-foreground">Địa chỉ trụ sở chính</label>
                <input
                  type="text"
                  value={tenant.address || ''}
                  onChange={(e) => setTenant({ ...tenant, address: e.target.value })}
                  className="border-input bg-background mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:border-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground">Người đại diện theo pháp luật</label>
                <input
                  type="text"
                  value={tenant.legalRepresentative || ''}
                  onChange={(e) => setTenant({ ...tenant, legalRepresentative: e.target.value })}
                  className="border-input bg-background mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:border-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground">Số điện thoại liên hệ</label>
                <input
                  type="text"
                  value={tenant.phone || ''}
                  onChange={(e) => setTenant({ ...tenant, phone: e.target.value })}
                  className="border-input bg-background mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:border-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground">Email liên hệ kế toán / nhân sự</label>
                <input
                  type="email"
                  value={tenant.email || ''}
                  onChange={(e) => setTenant({ ...tenant, email: e.target.value })}
                  className="border-input bg-background mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:border-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground">Website</label>
                <input
                  type="text"
                  value={tenant.website || ''}
                  onChange={(e) => setTenant({ ...tenant, website: e.target.value })}
                  className="border-input bg-background mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:border-primary focus:outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PHÒNG BAN & CHỨC DANH */}
        {activeTab === 'DEPTS' && (
          <div className="space-y-6">
            <div className="rounded-xl border border-border bg-card p-6 shadow-xs">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h3 className="font-bold text-base">Danh Mục Phòng Ban ({departments.length})</h3>
                <button
                  type="button"
                  onClick={() => {
                    const name = prompt('Nhập tên phòng ban mới:');
                    if (name?.trim()) {
                      const newDept: Department = {
                        id: `dept_${Date.now()}`,
                        tenantId: tenant.id,
                        name: name.trim(),
                        code: `PB${String(departments.length + 1).padStart(2, '0')}`,
                      };
                      setDepartments([...departments, newDept]);
                    }
                  }}
                  className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:bg-primary/90"
                >
                  <Plus className="h-3.5 w-3.5" /> Thêm Phòng Ban
                </button>
              </div>

              <div className="mt-4 divide-y divide-border">
                {departments.map((d) => (
                  <div key={d.id} className="py-3 flex items-center justify-between">
                    <div>
                      <span className="font-mono text-xs font-bold text-primary mr-2">[{d.code}]</span>
                      <span className="font-semibold text-sm">{d.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const newName = prompt('Đổi tên phòng ban:', d.name);
                          if (newName?.trim()) {
                            setDepartments(departments.map((item) => (item.id === d.id ? { ...item, name: newName.trim() } : item)));
                          }
                        }}
                        className="text-xs text-muted-foreground hover:text-foreground px-2 py-1"
                      >
                        Sửa
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Bạn có chắc muốn xóa phòng ban ${d.name}?`)) {
                            setDepartments(departments.filter((item) => item.id !== d.id));
                          }
                        }}
                        className="text-xs text-rose-600 hover:text-rose-700 px-2 py-1"
                      >
                        Xóa
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-6 shadow-xs">
              <h3 className="font-bold text-base border-b border-border pb-3">Danh Mục Chức Danh / Vị Trí</h3>
              <div className="mt-4 flex flex-wrap gap-2">
                {MOCK_POSITIONS.map((pos, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/40 px-3 py-1 text-xs font-semibold"
                  >
                    {pos}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: CA LÀM & CHẤM CÔNG */}
        {activeTab === 'SHIFTS' && (
          <div className="rounded-xl border border-border bg-card p-6 shadow-xs space-y-6">
            <h3 className="font-bold text-base border-b border-border pb-3">Quy Chế Ca Làm Việc & Ghi Nhận Công</h3>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-foreground">Số ngày công chuẩn trong tháng</label>
                <input
                  type="number"
                  min={20}
                  max={28}
                  value={settings.standardWorkingDays}
                  onChange={(e) => setSettings({ ...settings, standardWorkingDays: Number(e.target.value) })}
                  className="border-input bg-background mt-1 w-full rounded-lg border px-3 py-2 text-sm font-mono focus:border-primary focus:outline-none"
                />
                <span className="text-[11px] text-muted-foreground">Thường là 24 ngày (nghỉ T7, CN) hoặc 26 ngày (nghỉ CN).</span>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground">Chính sách ngày nghỉ tuần</label>
                <select
                  value={settings.weekendDaysSetting}
                  onChange={(e) => setSettings({ ...settings, weekendDaysSetting: e.target.value as any })}
                  className="border-input bg-background mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:border-primary focus:outline-none"
                >
                  <option value="CN">Chỉ nghỉ Chủ Nhật (Làm việc từ Thứ Hai đến Thứ Bảy)</option>
                  <option value="T7CN">Nghỉ Thứ Bảy & Chủ Nhật (Làm việc từ Thứ Hai đến Thứ Sáu)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground">Thời gian ân hạn đi muộn / về sớm (Phút)</label>
                <input
                  type="number"
                  min={0}
                  max={60}
                  defaultValue={15}
                  className="border-input bg-background mt-1 w-full rounded-lg border px-3 py-2 text-sm font-mono focus:border-primary focus:outline-none"
                />
                <span className="text-[11px] text-muted-foreground">Tối đa 15 phút không bị tính vi phạm chuyên cần.</span>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground">Hệ số tính lương làm thêm giờ (OT)</label>
                <div className="mt-1 grid grid-cols-3 gap-2 text-xs">
                  <div className="rounded-lg border p-2 bg-muted/20 text-center">
                    <span className="text-muted-foreground">Ngày thường</span>
                    <p className="font-bold font-mono text-sm mt-0.5">150% (1.5x)</p>
                  </div>
                  <div className="rounded-lg border p-2 bg-muted/20 text-center">
                    <span className="text-muted-foreground">Ngày nghỉ tuần</span>
                    <p className="font-bold font-mono text-sm mt-0.5">200% (2.0x)</p>
                  </div>
                  <div className="rounded-lg border p-2 bg-muted/20 text-center">
                    <span className="text-muted-foreground">Lễ, Tết</span>
                    <p className="font-bold font-mono text-sm mt-0.5">300% (3.0x)</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: CHÍNH SÁCH LƯƠNG & PHỤ CẤP */}
        {activeTab === 'ALLOWANCE' && (
          <div className="rounded-xl border border-border bg-card p-6 shadow-xs space-y-6">
            <h3 className="font-bold text-base border-b border-border pb-3">Định Mức Phụ Cấp & Miễn Thuế</h3>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-foreground">Mức phụ cấp ăn trưa chuẩn (VND)</label>
                <input
                  type="number"
                  step={10000}
                  value={settings.lunchAllowanceTaxExemptLimit}
                  onChange={(e) => setSettings({ ...settings, lunchAllowanceTaxExemptLimit: Number(e.target.value) })}
                  className="border-input bg-background mt-1 w-full rounded-lg border px-3 py-2 text-sm font-mono focus:border-primary focus:outline-none"
                />
                <span className="text-[11px] text-emerald-600 font-medium">
                  {formatVND(settings.lunchAllowanceTaxExemptLimit)}/tháng (Trần miễn thuế TNCN: 730.000đ).
                </span>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground">Quy tắc làm tròn số tiền lương</label>
                <select
                  value={settings.salaryRoundingRule}
                  onChange={(e) => setSettings({ ...settings, salaryRoundingRule: e.target.value as any })}
                  className="border-input bg-background mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:border-primary focus:outline-none"
                >
                  <option value="ROUND_1000">Làm tròn đến 1.000 VND gần nhất (Khuyến nghị)</option>
                  <option value="ROUND_100">Làm tròn đến 100 VND</option>
                  <option value="NO_ROUND">Không làm tròn (giữ nguyên số lẻ)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground">Định mức thưởng chuyên cần chuẩn (VND)</label>
                <input
                  type="number"
                  step={50000}
                  defaultValue={500000}
                  className="border-input bg-background mt-1 w-full rounded-lg border px-3 py-2 text-sm font-mono focus:border-primary focus:outline-none"
                />
                <span className="text-[11px] text-muted-foreground">Áp dụng khi nhân viên làm việc đủ 100% công chuẩn và không đi muộn.</span>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground">Chính sách phụ cấp thâm niên</label>
                <input
                  type="number"
                  step={50000}
                  defaultValue={200000}
                  className="border-input bg-background mt-1 w-full rounded-lg border px-3 py-2 text-sm font-mono focus:border-primary focus:outline-none"
                />
                <span className="text-[11px] text-muted-foreground">Mức cộng thêm cho mỗi 01 năm làm việc tại doanh nghiệp.</span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: THUẾ & BHXH (NHÓM B) */}
        {activeTab === 'TAX_INS' && (
          <div className="rounded-xl border border-border bg-card p-6 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="font-bold text-base flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5 text-amber-600" />
                  <span>Quy Tắc Thuế & Bảo Hiểm Xã Hội (Nhóm B — Có Kiểm Soát)</span>
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Các thông số do cơ quan Nhà nước quy định theo Luật BHXH & Luật Thuế TNCN
                </p>
              </div>
              <span className="rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 px-3 py-0.5 text-xs font-bold">
                Yêu cầu quyền Owner / Admin
              </span>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-foreground">Mức giảm trừ bản thân (VND / tháng)</label>
                <input
                  type="number"
                  value={11000000}
                  disabled
                  className="border-input bg-muted/50 mt-1 w-full rounded-lg border px-3 py-2 text-sm font-mono cursor-not-allowed"
                />
                <span className="text-[11px] text-muted-foreground">11.000.000đ/tháng (132.000.000đ/năm).</span>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground">Mức giảm trừ người phụ thuộc (VND / người / tháng)</label>
                <input
                  type="number"
                  value={4400000}
                  disabled
                  className="border-input bg-muted/50 mt-1 w-full rounded-lg border px-3 py-2 text-sm font-mono cursor-not-allowed"
                />
                <span className="text-[11px] text-muted-foreground">4.400.000đ/người/tháng.</span>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground">Trần đóng BHXH & BHYT (20 lần mức cơ sở)</label>
                <input
                  type="number"
                  value={settings.insuranceCeilingSalary}
                  onChange={(e) => setSettings({ ...settings, insuranceCeilingSalary: Number(e.target.value) })}
                  className="border-input bg-background mt-1 w-full rounded-lg border px-3 py-2 text-sm font-mono focus:border-primary focus:outline-none"
                />
                <span className="text-[11px] text-muted-foreground font-mono">
                  {formatVND(settings.insuranceCeilingSalary)}
                </span>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground">Trần đóng BHTN (20 lần lương tối thiểu Vùng I)</label>
                <input
                  type="number"
                  value={settings.unemploymentInsuranceCeilingSalary}
                  onChange={(e) => setSettings({ ...settings, unemploymentInsuranceCeilingSalary: Number(e.target.value) })}
                  className="border-input bg-background mt-1 w-full rounded-lg border px-3 py-2 text-sm font-mono focus:border-primary focus:outline-none"
                />
                <span className="text-[11px] text-muted-foreground font-mono">
                  {formatVND(settings.unemploymentInsuranceCeilingSalary)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: THÀNH VIÊN & PHÂN QUYỀN */}
        {activeTab === 'MEMBERS' && (
          <div className="rounded-xl border border-border bg-card p-6 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="font-bold text-base">Thành Viên Trong Doanh Nghiệp ({members.length})</h3>
                <p className="text-xs text-muted-foreground">Quản lý tài khoản truy cập và vai trò trong tenant này</p>
              </div>
              <button
                type="button"
                onClick={() => setIsInviteModalOpen(true)}
                className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:bg-primary/90"
              >
                <UserPlus className="h-3.5 w-3.5" /> Mời Thành Viên
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted text-muted-foreground uppercase border-b border-border font-semibold">
                  <tr>
                    <th className="px-4 py-3">Thành Viên</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Vai Trò</th>
                    <th className="px-4 py-3">Ngày Gia Nhập</th>
                    <th className="px-4 py-3 text-right">Hành Động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {members.map((m) => (
                    <tr key={m.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3 font-semibold">{m.name}</td>
                      <td className="px-4 py-3 font-mono text-muted-foreground">{m.email}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                            m.role === 'OWNER'
                              ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                              : m.role === 'ADMIN'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                              : m.role === 'ACCOUNTANT'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-muted text-foreground'
                          }`}
                        >
                          {m.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{m.joinedAt.slice(0, 10)}</td>
                      <td className="px-4 py-3 text-right">
                        {m.role !== 'OWNER' && (
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Gỡ quyền thành viên ${m.name}?`)) {
                                setMembers(members.filter((item) => item.id !== m.id));
                              }
                            }}
                            className="text-rose-600 hover:text-rose-700 font-semibold"
                          >
                            Gỡ bỏ
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 7: MẪU BIỂU & CHỮ KÝ */}
        {activeTab === 'TEMPLATES' && (
          <div className="rounded-xl border border-border bg-card p-6 shadow-xs space-y-6">
            <h3 className="font-bold text-base border-b border-border pb-3">Thiết Lập Chữ Ký & Người Ký Trên Bảng Lương, Phiếu Lương</h3>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <div className="rounded-lg border border-border p-4 bg-muted/10 space-y-3">
                <span className="font-bold text-xs uppercase text-primary">1. Người Lập Biểu</span>
                <div>
                  <label className="text-xs text-muted-foreground">Họ và tên</label>
                  <input
                    type="text"
                    defaultValue="Nguyễn Thị Lan"
                    className="border-input bg-background mt-1 w-full rounded-lg border px-3 py-1.5 text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Chức danh</label>
                  <input
                    type="text"
                    defaultValue="Chuyên viên Nhân sự & Tiền lương"
                    className="border-input bg-background mt-1 w-full rounded-lg border px-3 py-1.5 text-xs"
                  />
                </div>
              </div>

              <div className="rounded-lg border border-border p-4 bg-muted/10 space-y-3">
                <span className="font-bold text-xs uppercase text-primary">2. Kế Toán Trưởng</span>
                <div>
                  <label className="text-xs text-muted-foreground">Họ và tên</label>
                  <input
                    type="text"
                    defaultValue="Trần Văn Bình"
                    className="border-input bg-background mt-1 w-full rounded-lg border px-3 py-1.5 text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Chức danh</label>
                  <input
                    type="text"
                    defaultValue="Kế toán trưởng"
                    className="border-input bg-background mt-1 w-full rounded-lg border px-3 py-1.5 text-xs"
                  />
                </div>
              </div>

              <div className="rounded-lg border border-border p-4 bg-muted/10 space-y-3">
                <span className="font-bold text-xs uppercase text-primary">3. Giám Đốc / Đại Diện Pháp Luật</span>
                <div>
                  <label className="text-xs text-muted-foreground">Họ và tên</label>
                  <input
                    type="text"
                    defaultValue="Nguyễn Văn An"
                    className="border-input bg-background mt-1 w-full rounded-lg border px-3 py-1.5 text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Chức danh</label>
                  <input
                    type="text"
                    defaultValue="Tổng Giám Đốc"
                    className="border-input bg-background mt-1 w-full rounded-lg border px-3 py-1.5 text-xs"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 8: NHẬT KÝ THAY ĐỔI (AUDIT TRAIL) */}
        {activeTab === 'AUDIT' && (
          <div className="rounded-xl border border-border bg-card p-6 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="font-bold text-base">Nhật Ký Thay Đổi Cấu Hình (Audit Trail)</h3>
                <p className="text-xs text-muted-foreground">Theo dõi mọi tác vụ cập nhật cấu hình và quy chế của doanh nghiệp</p>
              </div>
              <span className="font-mono text-xs text-muted-foreground">{auditLogs.length} sự kiện</span>
            </div>

            <div className="divide-y divide-border">
              {auditLogs.map((log) => (
                <div key={log.id} className="py-3 flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-primary">[{log.action}]</span>
                      <span className="text-xs font-semibold">{log.description}</span>
                    </div>
                    <div className="text-[11px] text-muted-foreground flex items-center gap-2">
                      <span>Bởi: <strong>{log.userName}</strong></span>
                      <span>·</span>
                      <span>{new Date(log.createdAt).toLocaleString('vi-VN')}</span>
                      <span>·</span>
                      <span className="font-mono">Phạm vi: {log.scope}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => alert(`Xem chi tiết bản ghi kiểm toán ${log.id}`)}
                    className="text-xs text-primary font-bold hover:underline"
                  >
                    Chi tiết
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Onboarding Wizard Modal */}
      <OnboardingWizardModal
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
        onComplete={() => {
          setIsOnboardingOpen(false);
          alert('Khởi tạo cấu hình doanh nghiệp thành công (Chế độ demo)!');
        }}
      />

      {/* Invite Member Modal */}
      {isInviteModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-card text-card-foreground relative my-8 w-full max-w-md rounded-2xl border border-border p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-bold text-base">Mời Thành Viên Tham Gia</h3>
              <button
                type="button"
                onClick={() => setIsInviteModalOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-semibold">Họ và tên thành viên</label>
                <input
                  type="text"
                  placeholder="VD: Lê Thu Thủy"
                  id="invite-name"
                  className="border-input bg-background mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:border-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold">Địa chỉ Email</label>
                <input
                  type="email"
                  placeholder="thuy.le@company.com"
                  id="invite-email"
                  className="border-input bg-background mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:border-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold">Vai trò phân quyền</label>
                <select
                  id="invite-role"
                  className="border-input bg-background mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:border-primary focus:outline-none"
                >
                  <option value="HR_MANAGER">HR Manager (Quản lý Nhân sự & Chấm công)</option>
                  <option value="ACCOUNTANT">Accountant (Kế toán Lương & Báo cáo Thuế)</option>
                  <option value="ADMIN">Admin (Quản trị viên doanh nghiệp)</option>
                  <option value="EMPLOYEE">Employee (Nhân viên chỉ xem phiếu lương của mình)</option>
                </select>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2 border-t border-border pt-4">
              <button
                type="button"
                onClick={() => setIsInviteModalOpen(false)}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => {
                  const nameInput = (document.getElementById('invite-name') as HTMLInputElement)?.value;
                  const emailInput = (document.getElementById('invite-email') as HTMLInputElement)?.value;
                  const roleInput = (document.getElementById('invite-role') as HTMLSelectElement)?.value;
                  if (!nameInput || !emailInput) {
                    alert('Vui lòng điền đủ họ tên và email!');
                    return;
                  }
                  const newMember: TenantMember = {
                    id: `mem_${Date.now()}`,
                    tenantId: tenant.id,
                    userId: `u_${Date.now()}`,
                    name: nameInput,
                    email: emailInput,
                    role: roleInput as any,
                    joinedAt: new Date().toISOString(),
                  };
                  setMembers([...members, newMember]);
                  setIsInviteModalOpen(false);
                }}
                className="rounded-lg bg-primary px-4 py-1.5 text-xs font-bold text-primary-foreground hover:bg-primary/90"
              >
                Gửi Lời Mời
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
