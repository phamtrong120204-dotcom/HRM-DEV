import { Check, Download, FileSpreadsheet, Info, UploadCloud, X } from 'lucide-react';
import { useState } from 'react';

interface ExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: (count: number) => void;
}

export function ExcelImportModal({ isOpen, onClose, onImportSuccess }: ExcelImportModalProps) {
  const [pasteData, setPasteData] = useState('');
  const [duplicateMode, setDuplicateMode] = useState<'UPDATE' | 'SKIP'>('UPDATE');
  const [fileName, setFileName] = useState<string | null>(null);

  // Giả lập danh sách đọc được từ paste/file
  const sampleImportRows = [
    { code: 'NV101', name: 'Nguyễn Văn Minh', dept: 'Kinh Doanh', salary: 12000000, insSalary: 10000000, npt: 1, isNew: true },
    { code: 'NV102', name: 'Trần Hương Giang', dept: 'Kế Toán', salary: 11000000, insSalary: 11000000, npt: 0, isNew: true },
    { code: 'NV001', name: 'Nguyễn Văn An', dept: 'Ban Giám Đốc', salary: 48000000, insSalary: 30000000, npt: 2, isNew: false },
  ];

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-card text-card-foreground relative my-8 w-full max-w-3xl rounded-2xl border shadow-2xl transition-all">
        {/* Header */}
        <div className="border-border flex items-center justify-between border-b px-6 py-4">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="text-primary h-5 w-5" />
            <h3 className="text-base font-bold text-foreground">
              Nhập Danh Sách Nhân Viên Từ Excel / Bảng Tính
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="hover:bg-muted text-muted-foreground hover:text-foreground rounded-lg p-1.5 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-4 p-6 text-xs">
          {/* Khu vực chọn file & tải file mẫu */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <label className="bg-primary hover:bg-primary/90 text-primary-foreground inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3.5 py-2 font-semibold shadow-xs transition-colors">
                <UploadCloud className="h-4 w-4" />
                <span>Chọn tệp Excel (.xlsx, .csv)</span>
                <input
                  type="file"
                  accept=".xlsx,.csv"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) setFileName(f.name);
                  }}
                />
              </label>
              <span className="text-muted-foreground text-xs font-medium">
                {fileName ? `Đã chọn: ${fileName}` : 'Chưa chọn tệp'}
              </span>
            </div>

            <button
              type="button"
              onClick={() => alert('Đang tải file mẫu: Mau_Danh_Sach_Nhan_Vien_Chuan.xlsx')}
              className="border-border hover:bg-muted text-foreground inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 font-medium transition-colors"
            >
              <Download className="h-4 w-4 text-emerald-600" />
              <span>Tải file Excel mẫu</span>
            </button>
          </div>

          <p className="text-muted-foreground text-[11px] leading-relaxed">
            Hệ thống tự động nhận diện tiêu đề các cột: <strong>Họ và tên, Mã NV, Phòng ban, Chức vụ, Lương cơ bản, Lương đóng BH, Người phụ thuộc, CCCD, STK</strong>. Cột bắt buộc duy nhất là <em>Họ và tên</em> (thiếu mã nhân viên hệ thống sẽ tự động cấp mã mới).
          </p>

          {/* Khu vực dán trực tiếp */}
          <div className="space-y-1.5">
            <label className="text-foreground font-semibold">
              Hoặc dán thẳng từ Excel (Copy vùng dữ liệu rồi Ctrl + V vào đây):
            </label>
            <textarea
              rows={3}
              value={pasteData}
              onChange={(e) => setPasteData(e.target.value)}
              placeholder="Dán dữ liệu sao chép từ Excel vào đây để xem trước..."
              className="border-input bg-background text-foreground w-full rounded-xl border p-3 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          {/* Tùy chọn xử lý trùng mã */}
          <div className="bg-muted/30 border-border flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3">
            <span className="text-foreground font-semibold">Khi phát hiện Mã nhân viên đã tồn tại trong hệ thống:</span>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="dupMode"
                  value="UPDATE"
                  checked={duplicateMode === 'UPDATE'}
                  onChange={() => setDuplicateMode('UPDATE')}
                  className="text-primary"
                />
                <span>Cập nhật theo danh sách mới</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="dupMode"
                  value="SKIP"
                  checked={duplicateMode === 'SKIP'}
                  onChange={() => setDuplicateMode('SKIP')}
                  className="text-primary"
                />
                <span>Bỏ qua, giữ nguyên bản cũ</span>
              </label>
            </div>
          </div>

          {/* Bảng xem trước dữ liệu */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-foreground">Xem trước dữ liệu bóc tách (Preview):</span>
              <span className="text-muted-foreground text-[11px]">
                Tìm thấy 2 nhân sự mới · 1 nhân sự trùng mã (sẽ {duplicateMode === 'UPDATE' ? 'cập nhật' : 'bỏ qua'})
              </span>
            </div>

            <div className="border-border max-h-48 overflow-y-auto rounded-xl border">
              <table className="w-full text-left text-[11px]">
                <thead className="bg-muted text-muted-foreground sticky top-0 border-b">
                  <tr>
                    <th className="p-2">Mã NV</th>
                    <th className="p-2">Họ và tên</th>
                    <th className="p-2">Phòng ban</th>
                    <th className="p-2 text-right">Lương CB</th>
                    <th className="p-2 text-right">Lương BH</th>
                    <th className="p-2 text-center">NPT</th>
                    <th className="p-2 text-center">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {sampleImportRows.map((r, i) => (
                    <tr key={i} className="hover:bg-muted/30">
                      <td className="p-2 font-mono font-bold text-primary">{r.code}</td>
                      <td className="p-2 font-medium">{r.name}</td>
                      <td className="p-2">{r.dept}</td>
                      <td className="p-2 text-right">{r.salary.toLocaleString('vi-VN')} đ</td>
                      <td className="p-2 text-right">{r.insSalary.toLocaleString('vi-VN')} đ</td>
                      <td className="p-2 text-center">{r.npt}</td>
                      <td className="p-2 text-center">
                        {r.isNew ? (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                            Thêm mới
                          </span>
                        ) : (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
                            Trùng mã ({duplicateMode === 'UPDATE' ? 'Cập nhật' : 'Bỏ qua'})
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-border bg-muted/20 flex items-center justify-between border-t px-6 py-4">
          <div className="flex items-center gap-1.5 text-muted-foreground text-[11px]">
            <Info className="h-4 w-4" />
            <span>Dữ liệu sẽ được ghi nhận vào cơ sở dữ liệu sau khi bấm Xác nhận</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="border-border hover:bg-muted rounded-lg border px-4 py-2 text-xs font-semibold transition-colors"
            >
              Hủy bỏ
            </button>
            <button
              type="button"
              onClick={() => {
                onImportSuccess(3);
                onClose();
              }}
              className="bg-primary hover:bg-primary/90 text-primary-foreground inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold shadow-xs transition-colors"
            >
              <Check className="h-4 w-4" />
              <span>Xác nhận nhập 3 nhân sự</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
