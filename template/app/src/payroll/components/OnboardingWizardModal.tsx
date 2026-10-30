import { ArrowRight, Building2, Calendar, Check, CheckCircle2, ChevronLeft, ShieldAlert, Sparkles, UploadCloud, Users, X } from 'lucide-react';
import { useState } from 'react';
import { MOCK_SETTINGS, MOCK_TENANT } from '../mockData';

interface OnboardingWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export function OnboardingWizardModal({ isOpen, onClose, onComplete }: OnboardingWizardModalProps) {
  const [step, setStep] = useState(1);
  const [companyName, setCompanyName] = useState(MOCK_TENANT.name);
  const [taxId, setTaxId] = useState(MOCK_TENANT.taxId || '');
  const [standardDays, setStandardDays] = useState(MOCK_SETTINGS.standardWorkingDays);
  const [weekendDays, setWeekendDays] = useState<'CN' | 'T7CN'>(MOCK_SETTINGS.weekendDaysSetting);
  const [taxVersion, setTaxVersion] = useState<'2026_5_TIER' | 'LEGACY_7_TIER'>('2026_5_TIER');

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-card text-card-foreground relative my-8 w-full max-w-2xl rounded-2xl border shadow-2xl transition-all">
        {/* Header */}
        <div className="border-border flex items-center justify-between border-b px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="bg-primary/10 text-primary flex h-8 w-8 items-center justify-center rounded-lg">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">
                Khởi Tạo Doanh Nghiệp Mới (Onboarding Wizard)
              </h3>
              <p className="text-muted-foreground text-xs">
                Bước {step}/4: {step === 1 ? 'Thông tin pháp nhân' : step === 2 ? 'Quy chế làm việc' : step === 3 ? 'Chính sách thuế & bảo hiểm' : 'Danh sách nhân sự'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="hover:bg-muted text-muted-foreground hover:text-foreground rounded-lg p-1.5 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Thanh tiến trình 4 bước */}
        <div className="border-border bg-muted/30 grid grid-cols-4 border-b text-[11px] font-semibold text-center">
          <div className={`p-2.5 border-r ${step >= 1 ? 'text-primary border-b-2 border-b-primary font-bold' : 'text-muted-foreground'}`}>
            1. Thông tin Cty
          </div>
          <div className={`p-2.5 border-r ${step >= 2 ? 'text-primary border-b-2 border-b-primary font-bold' : 'text-muted-foreground'}`}>
            2. Ca & Lịch làm
          </div>
          <div className={`p-2.5 border-r ${step >= 3 ? 'text-primary border-b-2 border-b-primary font-bold' : 'text-muted-foreground'}`}>
            3. Thuế & BH
          </div>
          <div className={`p-2.5 ${step >= 4 ? 'text-primary border-b-2 border-b-primary font-bold' : 'text-muted-foreground'}`}>
            4. Nhân sự
          </div>
        </div>

        {/* Nội dung từng bước */}
        <div className="p-6 text-xs space-y-4">
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="text-foreground font-semibold block mb-1">Tên công ty / Doanh nghiệp *</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="border-input bg-background w-full rounded-lg border p-2.5 text-xs font-medium focus:ring-2 focus:ring-primary/40 focus:outline-none"
                  placeholder="Ví dụ: Công ty TNHH Sản Xuất & Thương Mại ABC"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-foreground font-semibold block mb-1">Mã số thuế (MST) *</label>
                  <input
                    type="text"
                    value={taxId}
                    onChange={(e) => setTaxId(e.target.value)}
                    className="border-input bg-background w-full rounded-lg border p-2.5 text-xs font-mono focus:ring-2 focus:ring-primary/40 focus:outline-none"
                    placeholder="0101234567"
                  />
                </div>
                <div>
                  <label className="text-foreground font-semibold block mb-1">Số điện thoại liên hệ</label>
                  <input
                    type="text"
                    defaultValue="024 3999 8888"
                    className="border-input bg-background w-full rounded-lg border p-2.5 text-xs focus:ring-2 focus:ring-primary/40 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="text-foreground font-semibold block mb-1">Địa chỉ trụ sở doanh nghiệp</label>
                <input
                  type="text"
                  defaultValue="12 Phố Mẫu, Quận Hoàn Kiếm, Hà Nội"
                  className="border-input bg-background w-full rounded-lg border p-2.5 text-xs focus:ring-2 focus:ring-primary/40 focus:outline-none"
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-foreground font-semibold block mb-1">Số ngày công chuẩn trong tháng *</label>
                  <input
                    type="number"
                    value={standardDays}
                    onChange={(e) => setStandardDays(Number(e.target.value))}
                    min={20}
                    max={31}
                    className="border-input bg-background w-full rounded-lg border p-2.5 text-xs font-semibold focus:ring-2 focus:ring-primary/40 focus:outline-none"
                  />
                  <span className="text-muted-foreground text-[10px] mt-1 block">
                    Thông thường: 26 ngày (nghỉ CN) hoặc 22 ngày (nghỉ T7, CN).
                  </span>
                </div>
                <div>
                  <label className="text-foreground font-semibold block mb-1">Ngày nghỉ hàng tuần</label>
                  <select
                    value={weekendDays}
                    onChange={(e) => setWeekendDays(e.target.value as any)}
                    className="border-input bg-background w-full rounded-lg border p-2.5 text-xs font-medium focus:ring-2 focus:ring-primary/40 focus:outline-none"
                  >
                    <option value="CN">Chỉ nghỉ Chủ nhật (26 ngày công)</option>
                    <option value="T7CN">Nghỉ cả Thứ 7 & Chủ nhật (22 ngày công)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-foreground font-semibold block mb-1">Danh mục phòng ban khởi tạo</label>
                <p className="text-muted-foreground text-[11px] mb-2">
                  Hệ thống tự động kích hoạt các phòng ban phổ biến (bạn có thể thêm/bớt sau trong Cài đặt):
                </p>
                <div className="flex flex-wrap gap-2">
                  {['Ban Giám Đốc', 'Kế Toán', 'Kinh Doanh', 'Nhân Sự', 'Sản Xuất', 'Kho Vận'].map((dept) => (
                    <span key={dept} className="bg-primary/10 text-primary border-primary/20 rounded-md border px-2.5 py-1 text-xs font-medium">
                      ✓ {dept}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="bg-muted/40 border-border rounded-xl border p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground">Biểu thuế Thu Nhập Cá Nhân áp dụng:</span>
                  <select
                    value={taxVersion}
                    onChange={(e) => setTaxVersion(e.target.value as any)}
                    className="border-input bg-background rounded-lg border p-1.5 text-xs font-semibold focus:outline-none"
                  >
                    <option value="2026_5_TIER">Biểu 5 bậc mới (Giảm trừ 15.5M / 6.2M)</option>
                    <option value="LEGACY_7_TIER">Biểu 7 bậc cũ (Giảm trừ 11.0M / 4.4M)</option>
                  </select>
                </div>
                <p className="text-muted-foreground text-[10px]">
                  {taxVersion === '2026_5_TIER'
                    ? 'Áp dụng biểu thuế lũy tiến 5 bậc (5%, 10%, 20%, 30%, 35%) và miễn toàn bộ tiền làm thêm giờ (OT).'
                    : 'Áp dụng biểu thuế lũy tiến 7 bậc truyền thống theo Nghị quyết 954/2020/UBTVQH14.'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="border-border rounded-xl border p-3 space-y-1">
                  <span className="text-muted-foreground text-[11px] font-medium">Bảo hiểm phần NLĐ nộp:</span>
                  <div className="text-sm font-bold text-foreground">10.5%</div>
                  <span className="text-muted-foreground text-[10px]">BHXH 8% · BHYT 1.5% · BHTN 1%</span>
                </div>
                <div className="border-border rounded-xl border p-3 space-y-1">
                  <span className="text-muted-foreground text-[11px] font-medium">Bảo hiểm phần DN đóng thêm:</span>
                  <div className="text-sm font-bold text-foreground">23.5%</div>
                  <span className="text-muted-foreground text-[10px]">BHXH 17.5% · BHYT 3% · BHTN 1% · KPCĐ 2%</span>
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4 text-center py-4">
              <div className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mx-auto flex h-14 w-14 items-center justify-center rounded-full">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h4 className="text-base font-bold text-foreground">
                Doanh nghiệp đã sẵn sàng vận hành!
              </h4>
              <p className="text-muted-foreground text-xs max-w-md mx-auto">
                Cấu hình cơ bản đã hoàn tất. Bạn có thể chọn nhập ngay danh sách nhân sự thực tế từ file Excel hoặc nạp dữ liệu mẫu để thử nghiệm các tính năng.
              </p>

              <div className="flex justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    onComplete();
                    onClose();
                  }}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg px-4 py-2 text-xs font-semibold shadow-xs transition-colors"
                >
                  Nạp dữ liệu mẫu thử nghiệm
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-border bg-muted/20 flex items-center justify-between border-t px-6 py-4">
          {step > 1 && step < 4 ? (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="border-border hover:bg-muted inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Quay lại</span>
            </button>
          ) : (
            <div></div>
          )}

          {step < 4 ? (
            <button
              type="button"
              onClick={() => setStep(step + 1)}
              className="bg-primary hover:bg-primary/90 text-primary-foreground inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold shadow-xs transition-colors"
            >
              <span>Tiếp tục</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                onComplete();
                onClose();
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white inline-flex items-center gap-1.5 rounded-lg px-5 py-2 text-xs font-semibold shadow-xs transition-colors"
            >
              <Check className="h-4 w-4" />
              <span>Bắt đầu sử dụng ngay</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
