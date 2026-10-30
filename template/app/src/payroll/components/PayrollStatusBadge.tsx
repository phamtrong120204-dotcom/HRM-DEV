import { PayrollPeriodStatus } from '../types';

interface PayrollStatusBadgeProps {
  status: PayrollPeriodStatus;
}

export function PayrollStatusBadge({ status }: PayrollStatusBadgeProps) {
  switch (status) {
    case 'DRAFT':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
          <span className="h-1.5 w-1.5 rounded-full bg-slate-500"></span>
          BẢN NHÁP (DRAFT)
        </span>
      );
    case 'REVIEWING':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse"></span>
          CHỜ PHÊ DUYỆT
        </span>
      );
    case 'LOCKED':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
          <span className="h-1.5 w-1.5 rounded-full bg-blue-600"></span>
          ĐÃ KHÓA SỔ (LOCKED)
        </span>
      );
    case 'PAID':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-600"></span>
          ĐÃ CHI TRẢ (PAID)
        </span>
      );
    default:
      return null;
  }
}
