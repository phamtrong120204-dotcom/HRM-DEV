import { AlertCircle } from 'lucide-react';

export function DemoBanner() {
  return (
    <div className="bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200 border-b px-4 py-2 text-xs">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <span>
            <strong className="font-semibold">CHẾ ĐỘ XEM THỬ NGHIỆM (DEMO MODE):</strong> Dữ liệu nhân sự và số tiền hiển thị là dữ liệu mẫu giả định để phục vụ thiết kế giao diện & kiểm thử công thức, chưa kết nối cơ sở dữ liệu thật.
          </span>
        </div>
        <span className="hidden rounded bg-amber-200/50 dark:bg-amber-800/50 px-2 py-0.5 font-mono text-[10px] sm:inline-block">
          MOCK DATA ENGINE v1.0
        </span>
      </div>
    </div>
  );
}
