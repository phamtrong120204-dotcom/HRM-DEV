import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  createInMemoryDatabaseStore,
  TenantScopedRepository,
} from './db/tenantScopedRepository.ts';
import { seedDemoData } from './db/seedPayrollDemoData.ts';
import type { TenantContext } from './security/authMiddleware.ts';
import { HttpError } from './errors.ts';

describe('Multi-Tenant Data Isolation & Security Test Suite', () => {
  let db: ReturnType<typeof createInMemoryDatabaseStore>;
  let seedResult: ReturnType<typeof seedDemoData>;

  // Ngữ cảnh người dùng Doanh nghiệp A (Alpha Tech)
  let contextOwnerA: TenantContext;
  let contextAccountantA: TenantContext;
  let contextEmployeeA: TenantContext;

  // Ngữ cảnh người dùng Doanh nghiệp B (Beta Garment)
  let contextOwnerB: TenantContext;
  let contextEmployeeB: TenantContext;

  beforeEach(() => {
    db = createInMemoryDatabaseStore();
    seedResult = seedDemoData(db);

    contextOwnerA = {
      user: { id: seedResult.userOwnerA.id, email: seedResult.userOwnerA.email },
      tenantId: seedResult.tenantA.id,
      role: 'OWNER',
      membershipId: 'mem_a_1',
    };

    contextAccountantA = {
      user: { id: seedResult.userAccountantA.id, email: seedResult.userAccountantA.email },
      tenantId: seedResult.tenantA.id,
      role: 'ACCOUNTANT',
      membershipId: 'mem_a_2',
    };

    contextEmployeeA = {
      user: { id: seedResult.userEmployeeA.id, email: seedResult.userEmployeeA.email },
      tenantId: seedResult.tenantA.id,
      role: 'EMPLOYEE',
      membershipId: 'mem_a_3',
    };

    contextOwnerB = {
      user: { id: seedResult.userOwnerB.id, email: seedResult.userOwnerB.email },
      tenantId: seedResult.tenantB.id,
      role: 'OWNER',
      membershipId: 'mem_b_1',
    };

    contextEmployeeB = {
      user: { id: seedResult.userEmployeeB.id, email: seedResult.userEmployeeB.email },
      tenantId: seedResult.tenantB.id,
      role: 'EMPLOYEE',
      membershipId: 'mem_b_2',
    };
  });

  // ==========================================================
  // 1. CÔ LẬP TRUY VẤN DỮ LIỆU ĐỌC (CROSS-TENANT READ ISOLATION / IDOR READ)
  // ==========================================================
  describe('1. Cross-Tenant Read Isolation (IDOR Prevention)', () => {
    it('blocks User of Tenant A from retrieving employee details of Tenant B', async () => {
      const repo = new TenantScopedRepository(db);

      // emp_b_001 thuộc về Tenant B
      await assert.rejects(
        async () => {
          await repo.getEmployeeById(contextOwnerA, 'emp_b_001');
        },
        (err: unknown) => {
          assert(err instanceof HttpError);
          assert.strictEqual(err.statusCode, 403);
          assert.match(err.message, /doanh nghiệp khác/);
          return true;
        }
      );
    });

    it('ensures listEmployees query of Tenant A NEVER returns any records from Tenant B', async () => {
      const repo = new TenantScopedRepository(db);
      const employeesA = await repo.listEmployees(contextOwnerA);

      assert.strictEqual(employeesA.length, 4);
      // Toàn bộ nhân viên phải thuộc về đúng tenantA
      for (const emp of employeesA) {
        assert.strictEqual(emp.tenantId, contextOwnerA.tenantId);
        assert.notStrictEqual(emp.tenantId, contextOwnerB.tenantId);
      }
    });

    it('blocks User of Tenant A from reading payroll period of Tenant B', async () => {
      const repo = new TenantScopedRepository(db);

      await assert.rejects(
        async () => {
          await repo.listPayrollRecords(contextAccountantA, `period_${seedResult.tenantB.id}_2026-03`);
        },
        (err: unknown) => {
          assert(err instanceof HttpError);
          assert.strictEqual(err.statusCode, 403);
          return true;
        }
      );
    });
  });

  // ==========================================================
  // 2. CÔ LẬP THAO TÁC GHI / CẬP NHẬT (CROSS-TENANT MUTATION ISOLATION / IDOR WRITE)
  // ==========================================================
  describe('2. Cross-Tenant Mutation Isolation', () => {
    it('blocks Owner of Tenant A from updating employee of Tenant B', async () => {
      const repo = new TenantScopedRepository(db);

      await assert.rejects(
        async () => {
          await repo.updateEmployee(contextOwnerA, 'emp_b_001', {
            jobTitle: 'Hacked Title',
          });
        },
        (err: unknown) => {
          assert(err instanceof HttpError);
          assert.strictEqual(err.statusCode, 403);
          return true;
        }
      );

      // Xác minh dữ liệu Tenant B vẫn nguyên vẹn
      const empB = db.employees.get('emp_b_001');
      assert.strictEqual(empB.jobTitle, 'Quản đốc phân xưởng');
    });

    it('blocks Accountant of Tenant A from updating attendance record of Tenant B employee', async () => {
      const repo = new TenantScopedRepository(db);

      await assert.rejects(
        async () => {
          await repo.updateAttendanceCell(
            contextAccountantA,
            'emp_b_002', // Nhân viên của Tenant B
            '2026-03',
            15,
            'X',
            0
          );
        },
        (err: unknown) => {
          assert(err instanceof HttpError);
          assert.strictEqual(err.statusCode, 403);
          return true;
        }
      );
    });
  });

  // ==========================================================
  // 3. XÁC MINH RÀNG BUỘC KHÓA NGOẠI CHÉO (CROSS-ENTITY OWNERSHIP VALIDATION)
  // ==========================================================
  describe('3. Cross-Entity Ownership Boundary', () => {
    it('rejects creating an employee in Tenant A referencing a department of Tenant B', async () => {
      const repo = new TenantScopedRepository(db);

      await assert.rejects(
        async () => {
          await repo.createEmployee(contextOwnerA, {
            code: 'NV099',
            fullName: 'Nhân viên Thử nghiệm',
            gender: 'Nam',
            departmentId: 'dept_b_may1', // Phòng ban thuộc Tenant B!
            jobTitle: 'Thử nghiệm',
            startDate: '2026-03-01',
            status: 'WORKING',
            baseSalary: 10000000,
            insuranceSalary: 10000000,
            taxableAllowance: 0,
            nonTaxableAllowance: 0,
            attendanceAllowance: 0,
            seniorityAllowancePerYear: 0,
            gasAllowance: 0,
            pieceRateUnitPrice: 0,
            dependentsCount: 0,
          });
        },
        (err: unknown) => {
          assert(err instanceof HttpError);
          assert.strictEqual(err.statusCode, 403);
          assert.match(err.message, /Phòng ban/);
          return true;
        }
      );
    });
  });

  // ==========================================================
  // 4. CHỐNG GIẢ MẠO TENANT_ID TỪ PHÍA CLIENT (CLIENT-SPOOFED TENANT_ID)
  // ==========================================================
  describe('4. Client-Provided Tenant ID Spoofing Prevention', () => {
    it('forces context.tenantId and ignores any malicious tenantId sent in request payload', async () => {
      const repo = new TenantScopedRepository(db);

      const created = await repo.createEmployee(contextOwnerA, {
        tenantId: 'tenant_beta_garment_002', // Client cố tình mạo danh Tenant B
        code: 'NV_SPOOF_TEST',
        fullName: 'Kiểm tra Giả mạo',
        gender: 'Nam',
        departmentId: 'dept_a_tech',
        jobTitle: 'Tester',
        startDate: '2026-03-01',
        status: 'WORKING',
        baseSalary: 10000000,
        insuranceSalary: 10000000,
        taxableAllowance: 0,
        nonTaxableAllowance: 0,
        attendanceAllowance: 0,
        seniorityAllowancePerYear: 0,
        gasAllowance: 0,
        pieceRateUnitPrice: 0,
        dependentsCount: 0,
      });

      // Hệ thống bắt buộc gán theo contextOwnerA.tenantId
      assert.strictEqual(created.tenantId, contextOwnerA.tenantId);
      assert.notStrictEqual(created.tenantId, 'tenant_beta_garment_002');
    });
  });

  // ==========================================================
  // 5. PHÂN QUYỀN NỘI BỘ DOANH NGHIỆP (ROLE-BASED PERMISSIONS)
  // ==========================================================
  describe('5. Role-Based Privilege Separation', () => {
    it('restricts regular EMPLOYEE to view ONLY their own employee record', async () => {
      const repo = new TenantScopedRepository(db);

      const empRecords = await repo.listEmployees(contextEmployeeA);
      // Chỉ nhận đúng 1 bản ghi của chính userEmployeeA (Lê Hoàng Cường)
      assert.strictEqual(empRecords.length, 1);
      assert.strictEqual(empRecords[0].code, 'NV003');
      assert.strictEqual(empRecords[0].fullName, 'Lê Hoàng Cường');
    });

    it('blocks regular EMPLOYEE from viewing another employee record', async () => {
      const repo = new TenantScopedRepository(db);

      // emp_a_001 là Giám đốc (Nguyễn Văn Alpha)
      await assert.rejects(
        async () => {
          await repo.getEmployeeById(contextEmployeeA, 'emp_a_001');
        },
        (err: unknown) => {
          assert(err instanceof HttpError);
          assert.strictEqual(err.statusCode, 403);
          assert.match(err.message, /hồ sơ của chính mình/);
          return true;
        }
      );
    });

    it('blocks regular EMPLOYEE from creating departments or shifts', async () => {
      const repo = new TenantScopedRepository(db);

      await assert.rejects(
        async () => {
          await repo.createDepartment(contextEmployeeA, {
            name: 'Phòng ban Trái phép',
            code: 'ILLEGAL',
          });
        },
        (err: unknown) => {
          assert(err instanceof HttpError);
          assert.strictEqual(err.statusCode, 403);
          return true;
        }
      );

      await assert.rejects(
        async () => {
          await repo.createShift(contextEmployeeA, {
            name: 'Ca Trái phép',
            code: 'CA_X',
            startTime: '08:00',
            endTime: '17:00',
            breakMinutes: 60,
            workUnits: 1.0,
            isOvertime: false,
            overtimeRate: 1.5,
            color: '#000',
            isActive: true,
          });
        },
        (err: unknown) => {
          assert(err instanceof HttpError);
          assert.strictEqual(err.statusCode, 403);
          return true;
        }
      );
    });

    it('allows ACCOUNTANT to list company payroll records but blocks regular EMPLOYEE', async () => {
      const repo = new TenantScopedRepository(db);

      // Tạo một bản ghi lương mẫu trong kỳ
      const periodId = `period_${seedResult.tenantA.id}_2026-03`;
      db.payrollRecords.set('pr_001', {
        id: 'pr_001',
        tenantId: seedResult.tenantA.id,
        payrollPeriodId: periodId,
        employeeId: 'emp_a_001',
        employeeCode: 'NV001',
        employeeName: 'Nguyễn Văn Alpha',
        baseSalary: 35000000,
        netSalary: 30000000,
        grossSalary: 40000000,
        totalDeductions: 10000000,
      } as any);

      // Kế toán xem được
      const acctRecords = await repo.listPayrollRecords(contextAccountantA, periodId);
      assert.strictEqual(acctRecords.length, 1);

      // Nhân viên thường không có bản ghi nào của họ trong kỳ này -> trả về mảng rỗng
      const empRecords = await repo.listPayrollRecords(contextEmployeeA, periodId);
      assert.strictEqual(empRecords.length, 0);
    });
  });

  // ==========================================================
  // 6. CÔ LẬP TÁC VỤ TẬP TIN (IMPORT / EXPORT JOBS ISOLATION)
  // ==========================================================
  describe('6. File Import/Export Job Isolation', () => {
    it('binds export jobs strictly to tenant and prevents other tenants from accessing generated files', async () => {
      const repo = new TenantScopedRepository(db);

      const job = await repo.createImportExportJob(contextAccountantA, {
        type: 'EXPORT_PAYROLL_EXCEL',
        fileName: 'Bang_Luong_T03_2026_AlphaTech.xlsx',
        fileUrl: 'https://storage.example.test/tenants/alpha/exports/payroll.xlsx',
      });

      assert.strictEqual(job.tenantId, contextAccountantA.tenantId);
      assert.strictEqual(job.userId, contextAccountantA.user.id);

      // Tenant A đọc được job
      const fetchedByA = await repo.getImportExportJob(contextAccountantA, job.id);
      assert.strictEqual(fetchedByA.id, job.id);

      // Tenant B cố tình đọc job của Tenant A -> BỊ CHẶN 403
      await assert.rejects(
        async () => {
          await repo.getImportExportJob(contextOwnerB, job.id);
        },
        (err: unknown) => {
          assert(err instanceof HttpError);
          assert.strictEqual(err.statusCode, 403);
          assert.match(err.message, /doanh nghiệp khác/);
          return true;
        }
      );
    });
  });
});
