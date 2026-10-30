import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  createInMemoryDatabaseStore,
  TenantScopedRepository,
} from './db/tenantScopedRepository.ts';
import { seedDemoData } from './db/seedPayrollDemoData.ts';
import { HttpError } from './errors.ts';
import type { TenantContext } from './security/authMiddleware.ts';
import {
  validateUploadedFileName,
  maskIdCardNumber,
  maskBankAccountNumber,
  sanitizeEmployeePii,
} from './security/securitySanitizer.ts';
import type { Employee, Tenant } from '../types.ts';

describe('Security Audit & Controlled Penetration Testing Suite (OWASP ASVS)', () => {
  let db: ReturnType<typeof createInMemoryDatabaseStore>;
  let seedResult: ReturnType<typeof seedDemoData>;

  let contextOwnerA: TenantContext;
  let contextAccountantA: TenantContext;
  let contextEmployeeA: TenantContext;

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
  });

  // ==========================================================
  // 1. KIỂM THỬ TẤN CÔNG PATH TRAVERSAL & TẢI TỆP NGUY HIỂM (FILE UPLOAD SECURITY)
  // ==========================================================
  describe('1. File Upload Security & Path Traversal Mitigation (OWASP A04/A05)', () => {
    it('blocks directory traversal attempts in file names (../../etc/passwd.xlsx)', async () => {
      const repo = new TenantScopedRepository(db);

      await assert.rejects(
        async () => {
          await repo.createImportExportJob(contextAccountantA, {
            type: 'IMPORT_ATTENDANCE',
            fileName: '../../etc/passwd.xlsx',
          });
        },
        (err: unknown) => {
          assert(err instanceof HttpError);
          assert.strictEqual(err.statusCode, 400);
          assert.match(err.message, /Path Traversal/);
          return true;
        }
      );
    });

    it('blocks windows path traversal and backslashes (..\\windows\\system32\\cmd.xlsx)', async () => {
      const repo = new TenantScopedRepository(db);

      await assert.rejects(
        async () => {
          await repo.createImportExportJob(contextAccountantA, {
            type: 'IMPORT_ATTENDANCE',
            fileName: '..\\windows\\system32\\cmd.xlsx',
          });
        },
        (err: unknown) => {
          assert(err instanceof HttpError);
          assert.strictEqual(err.statusCode, 400);
          assert.match(err.message, /Path Traversal/);
          return true;
        }
      );
    });

    it('blocks executable and script file extensions (.exe, .sh, .bat, .php, .js)', () => {
      const maliciousNames = [
        'malware.exe',
        'reverse_shell.sh',
        'exploit.bat',
        'webshell.php',
        'payload.js',
        'evil.vbs',
      ];

      for (const name of maliciousNames) {
        assert.throws(
          () => {
            validateUploadedFileName(name);
          },
          (err: unknown) => {
            assert(err instanceof HttpError);
            assert.strictEqual(err.statusCode, 400);
            assert.match(err.message, /không được phép tải lên/);
            return true;
          }
        );
      }
    });

    it('accepts safe file names and sanitizes special characters', () => {
      const result = validateUploadedFileName('Bang_Luong_T03-2026 (Final) v1.0.xlsx');
      assert.strictEqual(result.isValid, true);
      assert.strictEqual(result.extension, 'xlsx');
      // Ký tự dấu cách và ngoặc đơn được thay thế bằng ký tự an toàn
      assert.strictEqual(result.sanitizedName, 'Bang_Luong_T03-2026__Final__v1.0.xlsx');
    });
  });

  // ==========================================================
  // 2. KHÓA TRUY CẬP DOANH NGHIỆP BỊ ĐÌNH CHỈ (TENANT SUSPENSION GUARD)
  // ==========================================================
  describe('2. Tenant Suspension & Inactive Organization Access Control (OWASP A01)', () => {
    it('blocks any operation if the tenant account is marked as suspended (isActive = false)', async () => {
      const repo = new TenantScopedRepository(db);

      // 1. Tạo một doanh nghiệp bị khóa do nợ cước hoặc vi phạm chính sách
      const suspendedTenant: Tenant = {
        id: 'tenant_suspended_999',
        name: 'Công ty Bị Đình Chỉ',
        slug: 'suspended-corp',
        isActive: false, // BỊ KHÓA
        subscriptionTier: 'starter',
      };
      db.tenants.set(suspendedTenant.id, suspendedTenant);

      const contextSuspended: TenantContext = {
        user: { id: 'usr_suspended_owner', email: 'owner@suspended.test' },
        tenantId: suspendedTenant.id,
        role: 'OWNER',
        membershipId: 'mem_susp_1',
      };

      // 2. Cố tình truy vấn danh sách nhân viên -> BỊ CHẶN 403
      await assert.rejects(
        async () => {
          await repo.listEmployees(contextSuspended);
        },
        (err: unknown) => {
          assert(err instanceof HttpError);
          assert.strictEqual(err.statusCode, 403);
          assert.match(err.message, /bị tạm khóa/);
          return true;
        }
      );

      // 3. Cố tình tạo nhân viên mới -> BỊ CHẶN 403
      await assert.rejects(
        async () => {
          await repo.createEmployee(contextSuspended, {
            code: 'NV001',
            fullName: 'Nhân viên',
            gender: 'Nam',
            startDate: '2026-01-01',
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
          assert.match(err.message, /bị tạm khóa/);
          return true;
        }
      );
    });
  });

  // ==========================================================
  // 3. BẢO VỆ DỮ LIỆU ĐỊNH DANH NHẠY CẢM (PII MASKING)
  // ==========================================================
  describe('3. Sensitive PII Data Exposure Prevention (OWASP A02)', () => {
    it('masks CCCD and Bank Account number when viewed by regular EMPLOYEE', async () => {
      const repo = new TenantScopedRepository(db);

      // Thêm CCCD và STK cho nhân viên emp_a_003 (Lê Hoàng Cường)
      const empA3 = db.employees.get('emp_a_003');
      empA3.idCardNumber = '001099123456';
      empA3.bankAccountNumber = '19033445566778';

      // 1. Khi nhân viên thường (contextEmployeeA) xem hồ sơ của chính mình
      const viewedBySelf = await repo.getEmployeeById(contextEmployeeA, 'emp_a_003');
      // CCCD phải được che các số giữa: 001******456
      assert.strictEqual(viewedBySelf.idCardNumber, '001******456');
      // STK phải được che phần lớn số đầu: **********6778
      assert.strictEqual(viewedBySelf.bankAccountNumber, '**********6778');

      // 2. Khi Quản trị viên / Chủ sở hữu (contextOwnerA) xem hồ sơ để trả lương
      const viewedByOwner = await repo.getEmployeeById(contextOwnerA, 'emp_a_003');
      // OWNER xem được đầy đủ số thực
      assert.strictEqual(viewedByOwner.idCardNumber, '001099123456');
      assert.strictEqual(viewedByOwner.bankAccountNumber, '19033445566778');
    });

    it('unit tests masking helpers directly', () => {
      // Test CCCD
      assert.strictEqual(maskIdCardNumber('001099123456'), '001******456');
      assert.strictEqual(maskIdCardNumber('12345'), '***');
      assert.strictEqual(maskIdCardNumber(null), null);

      // Test STK Ngân hàng
      assert.strictEqual(maskBankAccountNumber('19033445566778'), '**********6778');
      assert.strictEqual(maskBankAccountNumber('1234'), '****');
      assert.strictEqual(maskBankAccountNumber(null), null);
    });
  });

  // ==========================================================
  // 4. PHÒNG NGỪA RỦI RO QUẢN TRỊ VIÊN TOÀN CỤC (SUPERADMIN BOUNDARY)
  // ==========================================================
  describe('4. SuperAdmin Least-Privilege Boundary (OWASP A01)', () => {
    it('guarantees global isAdmin flag does not grant automatic business access without tenant membership', async () => {
      const repo = new TenantScopedRepository(db);

      // SuperAdmin của nền tảng Open SaaS (isAdmin: true), KHÔNG có membership trong Tenant A
      const contextSuperAdminWithoutMembership: TenantContext = {
        user: { id: 'usr_super_admin_global', email: 'admin@opensaas.sh', isAdmin: true },
        tenantId: 'tenant_alpha_tech_001',
        role: 'EMPLOYEE', // Không có vai trò quản lý trong Tenant A
        membershipId: 'mem_invalid',
      };

      // Cố đọc danh sách toàn bộ nhân viên Công ty Alpha -> Bị giới hạn (chỉ trả về rỗng vì không liên kết userId)
      const list = await repo.listEmployees(contextSuperAdminWithoutMembership);
      assert.strictEqual(list.length, 0);

      // Cố tạo phòng ban mới -> Bị chặn 403 vì không có vai trò OWNER/ADMIN trong Tenant A
      await assert.rejects(
        async () => {
          await repo.createDepartment(contextSuperAdminWithoutMembership, {
            name: 'Phòng Can Thiệp',
            code: 'INTERVENE',
          });
        },
        (err: unknown) => {
          assert(err instanceof HttpError);
          assert.strictEqual(err.statusCode, 403);
          return true;
        }
      );
    });
  });
});
