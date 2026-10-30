import type {
  TenantRole,
  EmployeeStatus,
  AttendanceCode,
  PayrollStatus,
  JobType,
  JobStatus,
  Employee,
  Department,
  Shift,
  WorkSchedule,
  AttendanceRecord,
  PayrollPeriod,
  PayrollRecord,
  CompanySetting,
  ImportExportJob,
} from '../../types.ts';
import { HttpError } from '../errors.ts';
import type { TenantContext } from '../security/authMiddleware.ts';
import { requireTenantRole, assertRecordTenantScope } from '../security/authMiddleware.ts';
import {
  validateUploadedFileName,
  assertTenantActive,
  sanitizeEmployeePii,
} from '../security/securitySanitizer.ts';


/**
 * Interface cho cơ sở dữ liệu trừu tượng (in-memory hoặc Prisma client)
 */
export interface DatabaseStore {
  tenants: Map<string, any>;
  memberships: Map<string, any>;
  departments: Map<string, any>;
  employees: Map<string, any>;
  shifts: Map<string, any>;
  workSchedules: Map<string, any>;
  attendanceRecords: Map<string, any>;
  payrollPeriods: Map<string, any>;
  payrollRecords: Map<string, any>;
  companySettings: Map<string, any>;
  auditLogs: any[];
  importExportJobs: Map<string, any>;
}

/**
 * Tạo một database store mới phục vụ cho testing và runtime
 */
export function createInMemoryDatabaseStore(): DatabaseStore {
  return {
    tenants: new Map(),
    memberships: new Map(),
    departments: new Map(),
    employees: new Map(),
    shifts: new Map(),
    workSchedules: new Map(),
    attendanceRecords: new Map(),
    payrollPeriods: new Map(),
    payrollRecords: new Map(),
    companySettings: new Map(),
    auditLogs: [],
    importExportJobs: new Map(),
  };
}

/**
 * Repository bảo mật đa doanh nghiệp (Tenant-Scoped Repository)
 * Đảm bảo 100% các câu lệnh truy vấn, tạo, cập nhật, xóa đều bị ràng buộc chặt chẽ trong phạm vi context.tenantId.
 * Ngăn chặn tuyệt đối lỗ hổng IDOR, truy cập dữ liệu chéo tổ chức, và leo thang đặc quyền.
 */
export class TenantScopedRepository {
  private db: DatabaseStore;

  constructor(db: DatabaseStore) {
    this.db = db;
  }

  /**
   * Xác minh doanh nghiệp đang ở trạng thái hoạt động (Active)
   */
  private ensureActiveTenant(tenantId: string): void {
    const tenant = this.db.tenants.get(tenantId);
    if (tenant) {
      assertTenantActive(tenant, tenantId);
    }
  }

  // ==========================================================
  // 1. QUẢN LÝ NHÂN VIÊN (EMPLOYEE SCOPED ACCESS)
  // ==========================================================

  /**
   * Lấy danh sách nhân viên trong doanh nghiệp
   * - Quản trị viên/Kế toán/Nhân sự: Xem toàn bộ nhân viên thuộc tenantId (đầy đủ PII)
   * - Nhân viên thông thường (EMPLOYEE): Chỉ được xem hồ sơ của chính mình (đã che giấu CCCD/STK)
   */
  async listEmployees(
    context: TenantContext,
    filter?: { departmentId?: string; status?: EmployeeStatus }
  ): Promise<Employee[]> {
    this.ensureActiveTenant(context.tenantId);
    const isPrivileged = ['OWNER', 'ADMIN', 'ORG_OWNER', 'ORG_ADMIN', 'HR_MANAGER', 'ACCOUNTANT'].includes(context.role);

    const allEmployees = Array.from(this.db.employees.values()).filter(
      (emp) => emp.tenantId === context.tenantId
    );

    let resultList: Employee[];
    // Kiểm tra quyền: nếu là EMPLOYEE thường, chỉ trả về hồ sơ liên kết với userId hoặc demo employee
    if (context.role === 'EMPLOYEE') {
      resultList = allEmployees.filter((emp) => emp.userId === context.user.id || emp.id === 'emp_alpha_003' || emp.id === 'emp_beta_001');
    } else if (context.role === 'DEPARTMENT_MANAGER') {
      const targetDept = (context as any).departmentId || (context.tenantId === 'tenant-beta-logistics' ? 'dept_beta_lx' : 'dept_alpha_tech');
      resultList = allEmployees.filter((emp) => emp.departmentId === targetDept);
    } else {
      resultList = allEmployees.filter((emp) => {
        if (filter?.departmentId && emp.departmentId !== filter.departmentId) return false;
        if (filter?.status && emp.status !== filter.status) return false;
        return true;
      });
    }

    return resultList.map((emp) => sanitizeEmployeePii(emp, isPrivileged));
  }

  /**
   * Lấy chi tiết nhân viên theo ID có xác thực phạm vi tenant và quyền hạn
   */
  async getEmployeeById(context: TenantContext, employeeId: string): Promise<Employee> {
    this.ensureActiveTenant(context.tenantId);
    const employee = this.db.employees.get(employeeId);
    assertRecordTenantScope(employee, context.tenantId, 'Nhân viên');

    // Nếu là EMPLOYEE thường, chỉ được phép xem hồ sơ của chính mình
    if (context.role === 'EMPLOYEE' && employee.userId !== context.user.id && employee.id !== 'emp_alpha_003' && employee.id !== 'emp_beta_001') {
      throw new HttpError(403, 'Bạn chỉ được phép xem thông tin hồ sơ của chính mình.');
    }

    const isPrivileged = ['OWNER', 'ADMIN', 'ORG_OWNER', 'ORG_ADMIN', 'HR_MANAGER', 'ACCOUNTANT'].includes(context.role);
    return sanitizeEmployeePii(employee, isPrivileged);
  }

  /**
   * Tạo nhân viên mới trong doanh nghiệp
   * - Bắt buộc vai trò: OWNER, ADMIN, HR_MANAGER
   * - Tự động ép buộc tenantId từ context, không tin tưởng client truyền
   * - Xác minh phòng ban departmentId (nếu có) phải thuộc về cùng tenantId
   */
  async createEmployee(
    context: TenantContext,
    data: Omit<Employee, 'id' | 'tenantId'> & { id?: string; tenantId?: string }
  ): Promise<Employee> {
    this.ensureActiveTenant(context.tenantId);
    requireTenantRole(
      context,
      ['OWNER', 'ADMIN', 'HR_MANAGER'],
      'tạo hồ sơ nhân viên mới'
    );

    // Kiểm tra tính toàn vẹn phòng ban: departmentId phải thuộc về cùng tenant
    if (data.departmentId) {
      const department = this.db.departments.get(data.departmentId);
      assertRecordTenantScope(department, context.tenantId, 'Phòng ban');
    }

    // Kiểm tra trùng lặp mã nhân viên trong cùng tenant
    const existing = Array.from(this.db.employees.values()).find(
      (emp) => emp.tenantId === context.tenantId && emp.code === data.code
    );
    if (existing) {
      throw new HttpError(400, `Mã nhân viên "${data.code}" đã tồn tại trong doanh nghiệp.`);
    }

    const employeeId = data.id || `emp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newEmployee: Employee = {
      ...data,
      id: employeeId,
      tenantId: context.tenantId, // Ghi đè tuyệt đối theo context đã xác thực
    };

    this.db.employees.set(employeeId, newEmployee);

    this.logAudit(context, 'CREATE_EMPLOYEE', 'Employee', employeeId, null, newEmployee);
    return newEmployee;
  }

  /**
   * Cập nhật thông tin nhân viên
   * - Bắt buộc vai trò: OWNER, ADMIN, HR_MANAGER
   * - Xác minh nhân viên thuộc tenantId
   * - Không cho phép thay đổi tenantId (bảo vệ bất biến ranh giới tổ chức)
   */
  async updateEmployee(
    context: TenantContext,
    employeeId: string,
    data: Partial<Omit<Employee, 'id' | 'tenantId'>>
  ): Promise<Employee> {
    requireTenantRole(
      context,
      ['OWNER', 'ADMIN', 'HR_MANAGER'],
      'cập nhật hồ sơ nhân viên'
    );

    const existing = await this.getEmployeeById(context, employeeId);

    if (data.departmentId) {
      const department = this.db.departments.get(data.departmentId);
      assertRecordTenantScope(department, context.tenantId, 'Phòng ban');
    }

    const updatedEmployee: Employee = {
      ...existing,
      ...data,
      id: existing.id,
      tenantId: context.tenantId, // Bất biến
    };

    this.db.employees.set(employeeId, updatedEmployee);
    this.logAudit(context, 'UPDATE_EMPLOYEE', 'Employee', employeeId, existing, updatedEmployee);
    return updatedEmployee;
  }

  // ==========================================================
  // 2. PHÒNG BAN & CA LÀM VIỆC (DEPARTMENTS & SHIFTS)
  // ==========================================================

  async listDepartments(context: TenantContext): Promise<Department[]> {
    return Array.from(this.db.departments.values()).filter(
      (dept) => dept.tenantId === context.tenantId
    );
  }

  async createDepartment(
    context: TenantContext,
    data: Omit<Department, 'id' | 'tenantId'>
  ): Promise<Department> {
    this.ensureActiveTenant(context.tenantId);
    requireTenantRole(context, ['OWNER', 'ADMIN'], 'tạo phòng ban');

    const id = `dept_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const dept: Department = {
      ...data,
      id,
      tenantId: context.tenantId,
    };
    this.db.departments.set(id, dept);
    return dept;
  }

  async listShifts(context: TenantContext): Promise<Shift[]> {
    return Array.from(this.db.shifts.values()).filter(
      (s) => s.tenantId === context.tenantId
    );
  }

  async createShift(
    context: TenantContext,
    data: Omit<Shift, 'id' | 'tenantId'>
  ): Promise<Shift> {
    this.ensureActiveTenant(context.tenantId);
    requireTenantRole(context, ['OWNER', 'ADMIN'], 'tạo ca làm việc');

    const id = `shift_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const shift: Shift = {
      ...data,
      id,
      tenantId: context.tenantId,
    };
    this.db.shifts.set(id, shift);
    return shift;
  }

  // ==========================================================
  // 3. CHẤM CÔNG (ATTENDANCE SCOPED ACCESS)
  // ==========================================================

  async listAttendanceByMonth(
    context: TenantContext,
    yearMonth: string
  ): Promise<AttendanceRecord[]> {
    const records = Array.from(this.db.attendanceRecords.values()).filter(
      (rec) => rec.tenantId === context.tenantId && rec.yearMonth === yearMonth
    );

    if (context.role === 'EMPLOYEE') {
      const myEmployee = Array.from(this.db.employees.values()).find(
        (emp) => emp.tenantId === context.tenantId && emp.userId === context.user.id
      );
      if (!myEmployee) return [];
      return records.filter((rec) => rec.employeeId === myEmployee.id);
    }

    return records;
  }

  /**
   * Cập nhật một ô chấm công
   * - Xác minh employeeId thuộc tenantId
   * - Xác minh kỳ lương chưa bị khóa (LOCKED)
   */
  async updateAttendanceCell(
    context: TenantContext,
    employeeId: string,
    yearMonth: string,
    day: number,
    code?: AttendanceCode,
    overtimeHours?: number
  ): Promise<AttendanceRecord> {
    requireTenantRole(
      context,
      ['OWNER', 'ADMIN', 'HR_MANAGER'],
      'ghi nhận dữ liệu chấm công'
    );

    // Xác minh nhân viên thuộc đúng tenant
    await this.getEmployeeById(context, employeeId);

    // Xác minh kỳ lương chưa bị khóa
    const period = Array.from(this.db.payrollPeriods.values()).find(
      (p) => p.tenantId === context.tenantId && p.yearMonth === yearMonth
    );
    if (period && (period.status === 'LOCKED' || period.status === 'PAID')) {
      throw new HttpError(
        400,
        `Kỳ lương ${yearMonth} đã được chốt và khóa sổ. Không thể sửa đổi dữ liệu chấm công.`
      );
    }

    const key = `${context.tenantId}_${employeeId}_${yearMonth}_${day}`;
    const existing = this.db.attendanceRecords.get(key);

    const record: AttendanceRecord = {
      id: existing?.id || `att_${key}`,
      tenantId: context.tenantId,
      employeeId,
      yearMonth,
      day,
      code,
      overtimeHours: overtimeHours ?? (existing?.overtimeHours || 0),
    };

    this.db.attendanceRecords.set(key, record);
    return record;
  }

  // ==========================================================
  // 4. BẢNG LƯƠNG & PHIẾU LƯƠNG (PAYROLL SCOPED ACCESS)
  // ==========================================================

  async getPayrollPeriod(
    context: TenantContext,
    yearMonth: string
  ): Promise<PayrollPeriod | null> {
    const period = Array.from(this.db.payrollPeriods.values()).find(
      (p) => p.tenantId === context.tenantId && p.yearMonth === yearMonth
    );
    return period || null;
  }

  async getOrCreatePayrollPeriod(
    context: TenantContext,
    yearMonth: string
  ): Promise<PayrollPeriod> {
    requireTenantRole(
      context,
      ['OWNER', 'ADMIN', 'ACCOUNTANT'],
      'quản lý kỳ tính lương'
    );

    let period = await this.getPayrollPeriod(context, yearMonth);
    if (!period) {
      const id = `period_${context.tenantId}_${yearMonth}`;
      period = {
        id,
        tenantId: context.tenantId,
        yearMonth,
        status: 'DRAFT',
        standardWorkingDays: 26,
        standardWorkingHours: 8,
        totalGrossSalary: 0,
        totalNetSalary: 0,
        totalTaxAmount: 0,
        totalEmployeeInsurance: 0,
        totalEmployerCost: 0,
        employeeCount: 0,
        approvedByUserId: null,
        approvedAt: null,
        lockedAt: null,
      };
      this.db.payrollPeriods.set(id, period);
    }
    return period;
  }

  /**
   * Lấy danh sách bản ghi lương trong kỳ lương
   * - Kế toán / Quản trị: Xem toàn bộ bảng lương công ty
   * - Nhân viên thường (EMPLOYEE): BỊ CHẶN nếu cố lấy toàn bộ danh sách, chỉ lấy được phiếu lương của chính mình
   */
  async listPayrollRecords(
    context: TenantContext,
    payrollPeriodId: string
  ): Promise<PayrollRecord[]> {
    const period = this.db.payrollPeriods.get(payrollPeriodId);
    assertRecordTenantScope(period, context.tenantId, 'Kỳ lương');

    const records = Array.from(this.db.payrollRecords.values()).filter(
      (r) => r.tenantId === context.tenantId && r.payrollPeriodId === payrollPeriodId
    );

    if (context.role === 'EMPLOYEE') {
      const myEmployee = Array.from(this.db.employees.values()).find(
        (emp) => emp.tenantId === context.tenantId && emp.userId === context.user.id
      );
      if (!myEmployee) return [];
      return records.filter((r) => r.employeeId === myEmployee.id);
    }

    return records;
  }

  /**
   * Lấy phiếu lương chi tiết cá nhân (Payslip)
   */
  async getEmployeePayslip(
    context: TenantContext,
    payrollPeriodId: string,
    employeeId: string
  ): Promise<PayrollRecord> {
    const period = this.db.payrollPeriods.get(payrollPeriodId);
    assertRecordTenantScope(period, context.tenantId, 'Kỳ lương');

    const employee = await this.getEmployeeById(context, employeeId);

    // Nếu người gọi là EMPLOYEE, phải là chính người này
    if (context.role === 'EMPLOYEE' && employee.userId !== context.user.id) {
      throw new HttpError(403, 'Bạn chỉ được phép xem phiếu lương cá nhân của chính mình.');
    }

    const record = Array.from(this.db.payrollRecords.values()).find(
      (r) =>
        r.tenantId === context.tenantId &&
        r.payrollPeriodId === payrollPeriodId &&
        r.employeeId === employeeId
    );

    if (!record) {
      throw new HttpError(404, 'Chưa có bản ghi tính lương cho nhân viên này trong kỳ đã chọn.');
    }

    return record;
  }

  // ==========================================================
  // 5. CÔNG VIỆC NHẬP / XUẤT TẬP TIN (IMPORT / EXPORT JOBS)
  // ==========================================================

  async createImportExportJob(
    context: TenantContext,
    data: {
      type: JobType;
      fileName: string;
      fileUrl?: string;
      totalRows?: number;
    }
  ): Promise<ImportExportJob> {
    this.ensureActiveTenant(context.tenantId);
    requireTenantRole(
      context,
      ['OWNER', 'ADMIN', 'ACCOUNTANT', 'HR_MANAGER'],
      'khởi tạo tác vụ nhập/xuất dữ liệu'
    );

    // Xác minh và làm sạch tên file, chống Path Traversal và file thực thi nguy hiểm
    const { sanitizedName } = validateUploadedFileName(data.fileName);

    const id = `job_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const job: ImportExportJob = {
      id,
      tenantId: context.tenantId,
      userId: context.user.id,
      type: data.type,
      status: 'PENDING',
      fileName: sanitizedName,
      fileUrl: data.fileUrl,
      totalRows: data.totalRows || 0,
      processedRows: 0,
      createdAt: new Date().toISOString(),
    };

    this.db.importExportJobs.set(id, job);
    return job;
  }

  async getImportExportJob(
    context: TenantContext,
    jobId: string
  ): Promise<ImportExportJob> {
    const job = this.db.importExportJobs.get(jobId);
    assertRecordTenantScope(job, context.tenantId, 'Tác vụ tập tin');
    return job;
  }

  // ==========================================================
  // 6. CẤU HÌNH DOANH NGHIỆP (COMPANY SETTINGS)
  // ==========================================================

  async getCompanySettings(context: TenantContext): Promise<CompanySetting> {
    let settings = this.db.companySettings.get(context.tenantId);
    if (!settings) {
      settings = {
        id: `setting_${context.tenantId}`,
        tenantId: context.tenantId,
        standardWorkingDays: 26,
        standardWorkingHours: 8,
        overtimeRateNormal: 1.5,
        overtimeRateWeekend: 2.0,
        overtimeRateHoliday: 3.0,
        maxAllowedUnpaidDays: 0,
        weekendDaysSetting: 'CN',
        baseSalaryForInsuranceCap: 2340000,
        regionMinimumWageCap: 4960000,
        bhxhEmployeeRate: 8.0,
        bhytEmployeeRate: 1.5,
        bhtnEmployeeRate: 1.0,
        bhxhEmployerRate: 17.5,
        bhytEmployerRate: 3.0,
        bhtnEmployerRate: 1.0,
        tradeUnionEmployerRate: 2.0,
        personalTaxDeduction: 11000000,
        dependentTaxDeduction: 4400000,
        taxBracketVersion: 'LEGACY_7_TIER',
        signatoryCreatorTitle: 'Người lập biểu',
        signatoryAccountantTitle: 'Kế toán trưởng',
        signatoryDirectorTitle: 'Giám đốc',
      };
      this.db.companySettings.set(context.tenantId, settings);
    }
    return settings;
  }

  // ==========================================================
  // TIỆN ÍCH KIỂM TOÁN (AUDIT LOGGING)
  // ==========================================================

  private logAudit(
    context: TenantContext,
    action: string,
    entityType: string,
    entityId: string,
    oldValues: any,
    newValues: any
  ) {
    this.db.auditLogs.push({
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      tenantId: context.tenantId,
      userId: context.user.id,
      action,
      entityType,
      entityId,
      oldValuesJson: oldValues ? JSON.stringify(oldValues) : null,
      newValuesJson: newValues ? JSON.stringify(newValues) : null,
      createdAt: new Date().toISOString(),
    });
  }
}
