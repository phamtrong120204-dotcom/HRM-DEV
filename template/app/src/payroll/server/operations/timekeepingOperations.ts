import { HttpError } from '../errors.ts';
import { z } from '../schemaValidator.ts';
import type { AttendanceCode, AttendanceRecord, PayrollPeriod } from '../../types.ts';
import { assertRecordTenantScope, requireTenantRole } from '../security/authMiddleware.ts';
import type { TenantContext } from '../security/authMiddleware.ts';
import { assertPeriodAllowsDataEntry } from '../workflow/payrollPeriodManager.ts';

export const updateAttendanceCellSchema = z.object({
  tenantId: z.string().min(1),
  yearMonth: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
  employeeId: z.string().min(1),
  day: z.number().int().min(1).max(31),
  code: z.enum(['X', 'N', 'CT', 'P', 'L', 'O', 'KP']),
  overtimeHours: z.number().min(0).max(24).default(0),
  note: z.string().max(200).optional(),
});

export const batchUpdateAttendanceSchema = z.object({
  tenantId: z.string().min(1),
  yearMonth: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
  updates: z.array(
    z.object({
      employeeId: z.string().min(1),
      day: z.number().int().min(1).max(31),
      code: z.enum(['X', 'N', 'CT', 'P', 'L', 'O', 'KP']),
      overtimeHours: z.number().min(0).max(24).optional(),
    })
  ),
});

/**
 * Tính toán số ngày công từ bảng chấm công chi tiết theo tiêu chuẩn Luật Lao Động
 */
export function summarizeEmployeeMonthAttendance(params: {
  employeeId: string;
  yearMonth: string;
  dailyRecords: { day: number; code?: AttendanceCode; overtimeHours?: number }[];
  standardDaysInMonth: number;
}): {
  actualWorkDays: number;
  paidLeaveDays: number;
  holidayDays: number;
  businessTripDays: number;
  paidDaysCount: number;
  unpaidLeaveDays: number;
  totalOtHours: number;
} {
  const { dailyRecords } = params;

  let actualWorkDays = 0;
  let paidLeaveDays = 0;
  let holidayDays = 0;
  let businessTripDays = 0;
  let unpaidLeaveDays = 0;
  let totalOtHours = 0;

  dailyRecords.forEach((record) => {
    const code = record.code;
    const ot = record.overtimeHours || 0;
    totalOtHours += ot;

    if (!code) return;

    switch (code) {
      case 'X': // Đi làm cả ngày (1 công)
        actualWorkDays += 1.0;
        break;
      case 'N': // Làm nửa ngày (0.5 công làm việc, 0.5 nghỉ không lương)
        actualWorkDays += 0.5;
        unpaidLeaveDays += 0.5;
        break;
      case 'CT': // Đi công tác (1 công làm việc hưởng lương)
        businessTripDays += 1.0;
        break;
      case 'P': // Nghỉ phép năm có lương (1 công hưởng lương)
        paidLeaveDays += 1.0;
        break;
      case 'L': // Nghỉ lễ, Tết có lương (1 công hưởng lương)
        holidayDays += 1.0;
        break;
      case 'O': // Nghỉ ốm BHXH (0 công công ty trả)
        unpaidLeaveDays += 1.0;
        break;
      case 'KP': // Nghỉ không phép (1 ngày không lương)
        unpaidLeaveDays += 1.0;
        break;
    }
  });

  const paidDaysCount = actualWorkDays + businessTripDays + paidLeaveDays + holidayDays;

  return {
    actualWorkDays,
    paidLeaveDays,
    holidayDays,
    businessTripDays,
    paidDaysCount,
    unpaidLeaveDays,
    totalOtHours,
  };
}

/**
 * Cập nhật chấm công 1 ô ngày an toàn
 */
export function executeUpdateAttendanceCell(params: {
  tenantContext: TenantContext;
  period: PayrollPeriod;
  employeeRecord: { id: string; tenantId: string };
  day: number;
  code: AttendanceCode;
  overtimeHours?: number;
  note?: string;
}): AttendanceRecord {
  const { tenantContext, period, employeeRecord, day, code, overtimeHours = 0, note } = params;

  // 1. Kiểm tra quyền: HR_MANAGER, ADMIN hoặc OWNER mới được chấm công
  requireTenantRole(tenantContext, ['OWNER', 'ADMIN', 'HR_MANAGER'], 'chấm công');

  // 2. Kiểm tra kỳ lương có đang cho phép sửa đổi không
  assertPeriodAllowsDataEntry(period);

  // 3. Đảm bảo nhân viên thuộc tenant
  assertRecordTenantScope(employeeRecord, tenantContext.tenantId, 'Hồ sơ nhân viên');

  // 4. Kiểm tra tính hợp lệ của ngày trong tháng (1 đến 31)
  const [y, m] = period.yearMonth.split('-').map(Number);
  const maxDay = new Date(y, m, 0).getDate();
  if (day < 1 || day > maxDay) {
    throw new HttpError(400, `Ngày [${day}] không hợp lệ cho tháng [${period.yearMonth}] (tháng có ${maxDay} ngày).`);
  }

  // 5. Kiểm tra giới hạn giờ làm thêm trong ngày theo Bộ Luật Lao Động (không quá 12h/ngày)
  if (overtimeHours < 0 || overtimeHours > 12) {
    throw new HttpError(400, 'Số giờ làm thêm trong ngày phải nằm trong khoảng từ 0 đến 12 giờ.');
  }

  return {
    id: `att_${employeeRecord.id}_${period.yearMonth}_${day}`,
    tenantId: tenantContext.tenantId,
    employeeId: employeeRecord.id,
    yearMonth: period.yearMonth,
    day,
    code,
    overtimeHours,
    note,
  };
}
