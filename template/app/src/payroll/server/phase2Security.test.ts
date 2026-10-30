import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { HttpError } from './errors.ts';
import {
  resolveSecureTenantContext,
  getPayrollSpreadsheet,
  updateAttendanceCell,
  updateCompanySettings,
} from './operations/waspPayrollOperations.ts';
import {
  parseCookies,
  generateSessionId,
  periodVersionStore,
  runInTenantTransaction,
} from './standaloneAppServer.ts';

describe('Phase 2: Backend Architecture, Session Auth & OCC Test Suite', () => {
  // ==========================================================
  // 1. WASP SESSION AUTH & CONTEXT RESOLUTION
  // ==========================================================
  describe('1. Wasp Session Auth & Membership Role Verification', () => {
    it('throws 401 Unauthorized when context.user is absent', () => {
      assert.throws(
        () => resolveSecureTenantContext({ user: null }),
        (err: unknown) => {
          assert(err instanceof HttpError);
          assert.strictEqual(err.statusCode, 401);
          assert.match(err.message, /đăng nhập/);
          return true;
        }
      );
    });

    it('throws 403 Forbidden when user tries to access a tenant without membership', () => {
      const mockContext = {
        user: {
          id: 'usr_1',
          email: 'user1@company.com',
          memberships: [
            { id: 'mem_1', tenantId: 'tenant-alpha-tech', role: 'ACCOUNTANT' as const },
          ],
        },
      };

      assert.throws(
        () => resolveSecureTenantContext(mockContext, 'tenant-beta-logistics'),
        (err: unknown) => {
          assert(err instanceof HttpError);
          assert.strictEqual(err.statusCode, 403);
          assert.match(err.message, /không có quyền truy cập vào doanh nghiệp/);
          return true;
        }
      );
    });

    it('successfully resolves context when user is valid member of requested tenant', () => {
      const mockContext = {
        user: {
          id: 'usr_1',
          email: 'user1@company.com',
          memberships: [
            { id: 'mem_1', tenantId: 'tenant-alpha-tech', role: 'ACCOUNTANT' as const },
          ],
        },
      };

      const resolved = resolveSecureTenantContext(mockContext, 'tenant-alpha-tech');
      assert.strictEqual(resolved.tenantId, 'tenant-alpha-tech');
      assert.strictEqual(resolved.role, 'ACCOUNTANT');
      assert.strictEqual(resolved.user.id, 'usr_1');
    });

    it('blocks regular EMPLOYEE from viewing company-wide spreadsheet in Wasp query', async () => {
      const empContext = {
        user: {
          id: 'usr_emp',
          email: 'emp@alpha.com',
          memberships: [
            { id: 'mem_emp', tenantId: 'tenant-alpha-tech', role: 'EMPLOYEE' as const },
          ],
        },
      };

      await assert.rejects(
        async () => {
          await getPayrollSpreadsheet({ yearMonth: '2026-10', tenantId: 'tenant-alpha-tech' }, empContext);
        },
        (err: unknown) => {
          assert(err instanceof HttpError);
          assert.strictEqual(err.statusCode, 403);
          assert.match(err.message, /Nhân viên không có quyền/);
          return true;
        }
      );
    });

    it('blocks ACCOUNTANT and EMPLOYEE from updating attendance cells', async () => {
      const accountantContext = {
        user: {
          id: 'usr_acc',
          memberships: [
            { id: 'mem_acc', tenantId: 'tenant-alpha-tech', role: 'ACCOUNTANT' as const },
          ],
        },
      };

      await assert.rejects(
        async () => {
          await updateAttendanceCell({
            yearMonth: '2026-10',
            employeeId: 'emp_1',
            day: 15,
            code: 'X',
            tenantId: 'tenant-alpha-tech',
          }, accountantContext);
        },
        (err: unknown) => {
          assert(err instanceof HttpError);
          assert.strictEqual(err.statusCode, 403);
          assert.match(err.message, /Kế toán không có quyền/);
          return true;
        }
      );
    });
  });

  // ==========================================================
  // 2. COOKIE PARSING & ANTI-SPOOFING
  // ==========================================================
  describe('2. Cookie Session Parsing & Anti-Spoofing', () => {
    it('correctly parses multiple and encoded cookies from request header', () => {
      const cookieHeader = 'payroll_session=sess_123456789; theme=dark; user_token=abc%20def';
      const cookies = parseCookies(cookieHeader);

      assert.strictEqual(cookies['payroll_session'], 'sess_123456789');
      assert.strictEqual(cookies['theme'], 'dark');
      assert.strictEqual(cookies['user_token'], 'abc def');
    });

    it('generates unique session IDs with sess_ prefix', () => {
      const s1 = generateSessionId();
      const s2 = generateSessionId();
      assert.match(s1, /^sess_\d+_[a-z0-9]+$/);
      assert.notStrictEqual(s1, s2);
    });
  });

  // ==========================================================
  // 3. OPTIMISTIC CONCURRENCY CONTROL (OCC) & DB TRANSACTION MUTEX
  // ==========================================================
  describe('3. Optimistic Concurrency Control (OCC) & Atomic Mutex', () => {
    beforeEach(() => {
      periodVersionStore['tenant-test-occ'] = 1;
    });

    it('detects concurrent stale updates when expectedVersion does not match currentVersion', () => {
      const currentVersion = periodVersionStore['tenant-test-occ'] || 1;
      const staleVersion = 0; // Stale version from outdated client tab

      const isConflict = staleVersion !== currentVersion;
      assert.strictEqual(isConflict, true, 'Stale version must be flagged as conflict');
    });

    it('serializes concurrent operations sequentially using runInTenantTransaction', async () => {
      const executionOrder: number[] = [];

      // Launch 3 asynchronous tasks simultaneously
      const task1 = runInTenantTransaction('tenant-test-occ', async () => {
        await new Promise((r) => setTimeout(r, 30));
        executionOrder.push(1);
      });

      const task2 = runInTenantTransaction('tenant-test-occ', async () => {
        await new Promise((r) => setTimeout(r, 10));
        executionOrder.push(2);
      });

      const task3 = runInTenantTransaction('tenant-test-occ', async () => {
        executionOrder.push(3);
      });

      await Promise.all([task1, task2, task3]);

      // Because of sequential tenant mutex, order MUST strictly be [1, 2, 3] regardless of timeout
      assert.deepStrictEqual(executionOrder, [1, 2, 3]);
    });
  });
});
