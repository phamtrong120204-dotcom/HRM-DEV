/**
 * Bộ kiểm thử tự động xác minh phân tầng 6 chức vụ (RBAC Matrix Verification)
 * Đảm bảo 100% tuân thủ ma trận phân quyền, ngăn chặn rò rỉ dữ liệu (Anti-IDOR)
 * và bảo vệ toàn vẹn kỳ lương doanh nghiệp B2B SaaS.
 */

const BASE_URL = 'http://localhost:3000';

interface TestResult {
  suite: string;
  name: string;
  passed: boolean;
  expected?: any;
  actual?: any;
  error?: string;
}

const results: TestResult[] = [];

function assert(condition: boolean, suite: string, name: string, expected?: any, actual?: any) {
  if (condition) {
    results.push({ suite, name, passed: true });
    console.log(`  ✅ [PASS] ${suite} - ${name}`);
  } else {
    results.push({ suite, name, passed: false, expected, actual });
    console.error(`  ❌ [FAIL] ${suite} - ${name}`);
    console.error(`     Expected: ${JSON.stringify(expected)}`);
    console.error(`     Actual:   ${JSON.stringify(actual)}`);
  }
}

async function request(path: string, options: RequestInit = {}): Promise<{ status: number; body: any }> {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, options);
  let body: any = null;
  try {
    body = await res.json();
  } catch (_) {
    body = null;
  }
  return { status: res.status, body };
}

async function runRbacTests() {
  console.log('========================================================================');
  console.log('🛡️  BẮT ĐẦU KIỂM THỬ PHÂN TẦNG VAI TRÒ & BẢO MẬT RBAC (6 CẤP ĐỘ)');
  console.log('========================================================================\n');

  // Đảm bảo dữ liệu demo chuẩn ban đầu
  await request('/api/data/reset-sample', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userRole: 'ORG_OWNER' }),
  });

  // -------------------------------------------------------------------------
  // TC-RBAC-01: Giám đốc (ORG_OWNER - Level 100) Toàn quyền tối cao
  // -------------------------------------------------------------------------
  console.log('\n--- 1. TC-RBAC-01: Giám đốc (ORG_OWNER) Toàn quyền ---');
  {
    // Xem bảng lương: 8 nhân sự, không bị che số tiền, không bị che CCCD/STK
    const pl = await request('/api/payroll/calculate?tenantId=tenant-alpha-tech&userRole=ORG_OWNER');
    assert(pl.status === 200, 'TC-RBAC-01', 'ORG_OWNER calculate payroll 200 OK');
    assert(pl.body?.payroll?.length === 8, 'TC-RBAC-01', 'ORG_OWNER nhận đủ 8 nhân sự', 8, pl.body?.payroll?.length);
    const nv1 = pl.body?.payroll?.[0];
    assert(typeof nv1?.grossSalary === 'number' && nv1?.grossSalary > 0, 'TC-RBAC-01', 'Số tiền grossSalary không bị mask', 'number', typeof nv1?.grossSalary);
    assert(nv1?.idCardNumber && !nv1.idCardNumber.includes('*'), 'TC-RBAC-01', 'CCCD không bị che', 'unmasked', nv1?.idCardNumber);

    // Khóa kỳ lương
    const lockRes = await request('/api/payroll/lock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId: 'tenant-alpha-tech', userRole: 'ORG_OWNER' }),
    });
    assert(lockRes.status === 200 && lockRes.body?.status === 'LOCKED', 'TC-RBAC-01', 'ORG_OWNER khóa sổ kỳ lương thành công');

    // Mở khóa kỳ lương (Lý do >= 10 ký tự)
    const unlockRes = await request('/api/payroll/unlock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenantId: 'tenant-alpha-tech',
        userRole: 'ORG_OWNER',
        reason: 'Mở khóa để bổ sung giờ làm thêm cho khối kỹ thuật',
      }),
    });
    assert(unlockRes.status === 200 && unlockRes.body?.status === 'DRAFT', 'TC-RBAC-01', 'ORG_OWNER mở khóa kỳ lương thành công');

    // Lưu cài đặt doanh nghiệp
    const setRes = await request('/api/settings/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId: 'tenant-alpha-tech', userRole: 'ORG_OWNER', lunchAllowance: 730000 }),
    });
    assert(setRes.status === 200, 'TC-RBAC-01', 'ORG_OWNER lưu cài đặt thành công');
  }

  // -------------------------------------------------------------------------
  // TC-RBAC-02: Quản trị viên Doanh nghiệp (ORG_ADMIN - Level 80)
  // -------------------------------------------------------------------------
  console.log('\n--- 2. TC-RBAC-02: Quản trị viên (ORG_ADMIN) ---');
  {
    // Xem bảng lương đầy đủ
    const pl = await request('/api/payroll/calculate?tenantId=tenant-alpha-tech&userRole=ORG_ADMIN');
    assert(pl.status === 200 && pl.body?.payroll?.length === 8, 'TC-RBAC-02', 'ORG_ADMIN xem đủ 8 nhân sự unmasked');

    // Khóa kỳ lương: Thành công
    const lockRes = await request('/api/payroll/lock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId: 'tenant-alpha-tech', userRole: 'ORG_ADMIN' }),
    });
    assert(lockRes.status === 200, 'TC-RBAC-02', 'ORG_ADMIN khóa sổ kỳ lương thành công');

    // Mở khóa kỳ lương: BỊ TỪ CHỐI 403 Forbidden (Chỉ ORG_OWNER được mở khóa)
    const unlockRes = await request('/api/payroll/unlock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenantId: 'tenant-alpha-tech',
        userRole: 'ORG_ADMIN',
        reason: 'Quản trị viên muốn mở khóa sổ',
      }),
    });
    assert(unlockRes.status === 403, 'TC-RBAC-02', 'ORG_ADMIN bị từ chối mở khóa sổ (403)', 403, unlockRes.status);

    // Reset sample data: BỊ TỪ CHỐI 403 Forbidden
    const resetRes = await request('/api/data/reset-sample', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userRole: 'ORG_ADMIN' }),
    });
    assert(resetRes.status === 403, 'TC-RBAC-02', 'ORG_ADMIN bị từ chối reset sample data (403)', 403, resetRes.status);

    // Mở lại sổ bằng ORG_OWNER để tiếp tục test
    await request('/api/payroll/unlock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId: 'tenant-alpha-tech', userRole: 'ORG_OWNER', reason: 'Tiếp tục chuỗi kiểm thử tự động' }),
    });
  }

  // -------------------------------------------------------------------------
  // TC-RBAC-03: Trưởng phòng Nhân sự (HR_MANAGER - Level 60)
  // -------------------------------------------------------------------------
  console.log('\n--- 3. TC-RBAC-03: Trưởng phòng Nhân sự (HR_MANAGER) ---');
  {
    // Xem bảng lương: 8 nhân sự, NHƯNG các số tiền nhạy cảm BỊ CHE '******'
    const pl = await request('/api/payroll/calculate?tenantId=tenant-alpha-tech&userRole=HR_MANAGER');
    assert(pl.status === 200 && pl.body?.payroll?.length === 8, 'TC-RBAC-03', 'HR_MANAGER xem đủ 8 nhân sự trong bảng');
    const nv1 = pl.body?.payroll?.[0];
    assert(nv1?.baseSalary === '******', 'TC-RBAC-03', 'Lương cơ bản bị che mask ******', '******', nv1?.baseSalary);
    assert(nv1?.grossSalary === '******', 'TC-RBAC-03', 'Tổng thu nhập gross bị che mask ******', '******', nv1?.grossSalary);
    assert(nv1?.netSalary === '******', 'TC-RBAC-03', 'Lương thực lĩnh net bị che mask ******', '******', nv1?.netSalary);
    assert(nv1?.docSoText === 'Đã che theo phân quyền bảo mật Nhân sự', 'TC-RBAC-03', 'Đọc số bằng chữ bị che an toàn');
    assert(typeof nv1?.actualWorkDays === 'number', 'TC-RBAC-03', 'Số ngày công thực tế vẫn hiển thị rõ', 'number', typeof nv1?.actualWorkDays);

    // Chấm công và duyệt OT: Thành công
    const attRes = await request('/api/timekeeping/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId: 'tenant-alpha-tech', userRole: 'HR_MANAGER', employeeId: 'emp_alpha_001', day: 15, code: 'CT' }),
    });
    assert(attRes.status === 200, 'TC-RBAC-03', 'HR_MANAGER chấm công thành công (200)');

    // Tạo nhân viên mới: Thành công
    const saveEmp = await request('/api/employees/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenantId: 'tenant-alpha-tech',
        userRole: 'HR_MANAGER',
        code: `NV_TEST_${Date.now().toString().slice(-4)}`,
        fullName: 'Nhân viên Thử nghiệm HR',
        baseSalary: 12000000,
      }),
    });
    assert(saveEmp.status === 200, 'TC-RBAC-03', 'HR_MANAGER tạo hồ sơ nhân viên thành công (200)');

    // Xóa nhân viên: BỊ TỪ CHỐI 403 Forbidden (Chỉ Owner/Admin được xóa)
    const delEmp = await request('/api/employees/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId: 'tenant-alpha-tech', userRole: 'HR_MANAGER', employeeId: 'emp_alpha_008' }),
    });
    assert(delEmp.status === 403, 'TC-RBAC-03', 'HR_MANAGER bị từ chối xóa nhân viên (403)', 403, delEmp.status);

    // Điều chỉnh tạm ứng / thưởng lương: BỊ TỪ CHỐI 403 Forbidden (Chỉ Kế toán / Owner)
    const adjRes = await request('/api/payroll/adjustments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId: 'tenant-alpha-tech', userRole: 'HR_MANAGER', employeeId: 'emp_alpha_003', thuong: 2000000 }),
    });
    assert(adjRes.status === 403, 'TC-RBAC-03', 'HR_MANAGER bị từ chối sửa điều chỉnh lương (403)', 403, adjRes.status);
  }

  // -------------------------------------------------------------------------
  // TC-RBAC-04: Kế toán trưởng (ACCOUNTANT - Level 60)
  // -------------------------------------------------------------------------
  console.log('\n--- 4. TC-RBAC-04: Kế toán trưởng (ACCOUNTANT) ---');
  {
    // Xem bảng lương đầy đủ không che
    const pl = await request('/api/payroll/calculate?tenantId=tenant-alpha-tech&userRole=ACCOUNTANT');
    assert(pl.status === 200, 'TC-RBAC-04', 'ACCOUNTANT xem bảng lương 200 OK');
    const nv2 = pl.body?.payroll?.[1];
    assert(typeof nv2?.netSalary === 'number' && nv2?.netSalary > 0, 'TC-RBAC-04', 'ACCOUNTANT xem số liệu thực lĩnh rõ ràng', 'number', typeof nv2?.netSalary);

    // Điều chỉnh thưởng & tạm ứng: Thành công (200)
    const adjRes = await request('/api/payroll/adjustments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenantId: 'tenant-alpha-tech',
        userRole: 'ACCOUNTANT',
        employeeId: 'emp_alpha_003',
        thuong: 1500000,
        tamUng: 500000,
      }),
    });
    assert(adjRes.status === 200, 'TC-RBAC-04', 'ACCOUNTANT cập nhật điều chỉnh lương thành công (200)');

    // Chấm công: BỊ TỪ CHỐI 403 Forbidden (Kế toán không được tự sửa ngày công)
    const tkRes = await request('/api/timekeeping/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId: 'tenant-alpha-tech', userRole: 'ACCOUNTANT', employeeId: 'emp_alpha_003', day: 10, code: 'X' }),
    });
    assert(tkRes.status === 403, 'TC-RBAC-04', 'ACCOUNTANT bị từ chối sửa ngày công (403)', 403, tkRes.status);

    // Duyệt OT: BỊ TỪ CHỐI 403 Forbidden
    const otRes = await request('/api/timekeeping/ot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId: 'tenant-alpha-tech', userRole: 'ACCOUNTANT', employeeId: 'emp_alpha_003', otHours: 4 }),
    });
    assert(otRes.status === 403, 'TC-RBAC-04', 'ACCOUNTANT bị từ chối duyệt OT (403)', 403, otRes.status);

    // Thêm/Xóa nhân sự: BỊ TỪ CHỐI 403 Forbidden
    const saveEmp = await request('/api/employees/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId: 'tenant-alpha-tech', userRole: 'ACCOUNTANT', code: 'NV_ACC', fullName: 'Test' }),
    });
    assert(saveEmp.status === 403, 'TC-RBAC-04', 'ACCOUNTANT bị từ chối tạo nhân viên (403)', 403, saveEmp.status);
  }

  // -------------------------------------------------------------------------
  // TC-RBAC-05: Trưởng bộ phận (DEPARTMENT_MANAGER - Level 40)
  // -------------------------------------------------------------------------
  console.log('\n--- 5. TC-RBAC-05: Trưởng bộ phận (DEPARTMENT_MANAGER) ---');
  {
    // Bảng lương: BỊ GIỚI HẠN (không xem bảng lương tài chính)
    const pl = await request('/api/payroll/calculate?tenantId=tenant-alpha-tech&userRole=DEPARTMENT_MANAGER');
    assert(pl.status === 200, 'TC-RBAC-05', 'DEPARTMENT_MANAGER truy vấn payroll 200 OK');
    assert(pl.body?.restricted === true, 'TC-RBAC-05', 'Bị đánh dấu restricted: true');
    assert(pl.body?.payroll?.length === 0, 'TC-RBAC-05', 'Bảng lương trả về rỗng [] để bảo vệ tài chính');

    // Chấm công: CHỈ XEM nhân sự trong phòng ban mình (dept_alpha_tech: emp_alpha_003, emp_alpha_006, emp_alpha_008)
    const tk = await request('/api/timekeeping?tenantId=tenant-alpha-tech&userRole=DEPARTMENT_MANAGER');
    assert(tk.status === 200, 'TC-RBAC-05', 'DEPARTMENT_MANAGER xem bảng công phòng ban');
    const attKeys = Object.keys(tk.body?.attendance || {});
    assert(attKeys.includes('emp_alpha_003'), 'TC-RBAC-05', 'Thấy nhân sự NV003 trong phòng ban');
    assert(attKeys.includes('emp_alpha_006'), 'TC-RBAC-05', 'Thấy nhân sự NV006 trong phòng ban');
    assert(!attKeys.includes('emp_alpha_001'), 'TC-RBAC-05', 'KHÔNG thấy Giám đốc NV001 (khác phòng ban)');
    assert(!attKeys.includes('emp_alpha_002'), 'TC-RBAC-05', 'KHÔNG thấy Kế toán NV002 (khác phòng ban)');

    // Chấm công cho nhân viên TRONG phòng ban: Thành công (200)
    const attInDept = await request('/api/timekeeping/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId: 'tenant-alpha-tech', userRole: 'DEPARTMENT_MANAGER', employeeId: 'emp_alpha_006', day: 20, code: 'X' }),
    });
    assert(attInDept.status === 200, 'TC-RBAC-05', 'Sửa công nhân viên trong phòng ban thành công (200)');

    // Chấm công cho nhân viên NGOÀI phòng ban: BỊ TỪ CHỐI 403 Forbidden (Anti-IDOR)
    const attOutDept = await request('/api/timekeeping/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId: 'tenant-alpha-tech', userRole: 'DEPARTMENT_MANAGER', employeeId: 'emp_alpha_002', day: 20, code: 'X' }),
    });
    assert(attOutDept.status === 403, 'TC-RBAC-05', 'Bị từ chối chấm công cho nhân viên ngoài phòng ban (403)', 403, attOutDept.status);
  }

  // -------------------------------------------------------------------------
  // TC-RBAC-06: Nhân viên (EMPLOYEE / Self-Service - Level 20)
  // -------------------------------------------------------------------------
  console.log('\n--- 6. TC-RBAC-06: Nhân viên (EMPLOYEE / Self-Service) ---');
  {
    // Bảng lương: CHỈ NHẬN 1 bản ghi của chính mình (emp_alpha_003 / NV003)
    const pl = await request('/api/payroll/calculate?tenantId=tenant-alpha-tech&userRole=EMPLOYEE');
    assert(pl.status === 200, 'TC-RBAC-06', 'EMPLOYEE calculate payroll 200 OK');
    assert(pl.body?.payroll?.length === 1, 'TC-RBAC-06', 'Chỉ nhận DUY NHẤT 1 bản ghi lương của bản thân', 1, pl.body?.payroll?.length);
    const selfRecord = pl.body?.payroll?.[0];
    assert(selfRecord?.employeeId === 'emp_alpha_003', 'TC-RBAC-06', 'Đúng ID cá nhân emp_alpha_003');
    assert(selfRecord?.idCardNumber && selfRecord.idCardNumber.includes('*'), 'TC-RBAC-06', 'CCCD bị che mask an toàn');
    assert(selfRecord?.bankAccountNumber && selfRecord.bankAccountNumber.includes('*'), 'TC-RBAC-06', 'STK bị che mask an toàn');

    // Chấm công: CHỈ NHẬN dòng công của chính mình
    const tk = await request('/api/timekeeping?tenantId=tenant-alpha-tech&userRole=EMPLOYEE');
    assert(tk.status === 200, 'TC-RBAC-06', 'EMPLOYEE xem bảng công 200 OK');
    const attKeys = Object.keys(tk.body?.attendance || {});
    assert(attKeys.length === 1 && attKeys[0] === 'emp_alpha_003', 'TC-RBAC-06', 'Chỉ thấy duy nhất ngày công của mình', ['emp_alpha_003'], attKeys);

    // Tự sửa ngày công: BỊ TỪ CHỐI 403 Forbidden
    const updateTk = await request('/api/timekeeping/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId: 'tenant-alpha-tech', userRole: 'EMPLOYEE', employeeId: 'emp_alpha_003', day: 1, code: 'X' }),
    });
    assert(updateTk.status === 403, 'TC-RBAC-06', 'Nhân viên bị từ chối tự sửa ngày công (403)', 403, updateTk.status);

    // Tự sửa OT: BỊ TỪ CHỐI 403 Forbidden
    const updateOt = await request('/api/timekeeping/ot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId: 'tenant-alpha-tech', userRole: 'EMPLOYEE', employeeId: 'emp_alpha_003', otHours: 10 }),
    });
    assert(updateOt.status === 403, 'TC-RBAC-06', 'Nhân viên bị từ chối tự sửa OT (403)', 403, updateOt.status);

    // Tự điều chỉnh thưởng / tạm ứng: BỊ TỪ CHỐI 403 Forbidden
    const updateAdj = await request('/api/payroll/adjustments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId: 'tenant-alpha-tech', userRole: 'EMPLOYEE', employeeId: 'emp_alpha_003', thuong: 5000000 }),
    });
    assert(updateAdj.status === 403, 'TC-RBAC-06', 'Nhân viên bị từ chối sửa thưởng lương (403)', 403, updateAdj.status);
  }

  // -------------------------------------------------------------------------
  // TC-RBAC-07: Bảo vệ Kỳ lương đã khóa sổ (LOCKED Protection)
  // -------------------------------------------------------------------------
  console.log('\n--- 7. TC-RBAC-07: Bảo vệ Kỳ lương đã khóa sổ (LOCKED) ---');
  {
    // Khóa sổ
    await request('/api/payroll/lock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId: 'tenant-alpha-tech', userRole: 'ORG_OWNER' }),
    });

    // Thử sửa ngày công khi đã khóa: BỊ TỪ CHỐI (400)
    const tkLocked = await request('/api/timekeeping/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId: 'tenant-alpha-tech', userRole: 'ORG_OWNER', employeeId: 'emp_alpha_001', day: 1, code: 'P' }),
    });
    assert(tkLocked.status === 400, 'TC-RBAC-07', 'Chặn sửa công khi kỳ lương đã khóa (400)', 400, tkLocked.status);

    // Thử sửa OT khi đã khóa: BỊ TỪ CHỐI (400)
    const otLocked = await request('/api/timekeeping/ot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId: 'tenant-alpha-tech', userRole: 'ORG_OWNER', employeeId: 'emp_alpha_001', otHours: 5 }),
    });
    assert(otLocked.status === 400, 'TC-RBAC-07', 'Chặn sửa OT khi kỳ lương đã khóa (400)', 400, otLocked.status);

    // Thử sửa điều chỉnh lương khi đã khóa: BỊ TỪ CHỐI (400)
    const adjLocked = await request('/api/payroll/adjustments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId: 'tenant-alpha-tech', userRole: 'ORG_OWNER', employeeId: 'emp_alpha_001', thuong: 1000000 }),
    });
    assert(adjLocked.status === 400, 'TC-RBAC-07', 'Chặn sửa thưởng/khấu trừ khi kỳ lương đã khóa (400)', 400, adjLocked.status);

    // Mở khóa với lý do không đủ 10 ký tự: BỊ TỪ CHỐI (400)
    const unlockShort = await request('/api/payroll/unlock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId: 'tenant-alpha-tech', userRole: 'ORG_OWNER', reason: 'ngắn' }),
    });
    assert(unlockShort.status === 400, 'TC-RBAC-07', 'Chặn mở khóa nếu lý do < 10 ký tự (400)', 400, unlockShort.status);

    // Mở khóa thành công
    await request('/api/payroll/unlock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId: 'tenant-alpha-tech', userRole: 'ORG_OWNER', reason: 'Hoàn tất kiểm thử tự động RBAC' }),
    });
  }

  // -------------------------------------------------------------------------
  // TC-RBAC-08: Cô lập dữ liệu Đa tổ chức (Multi-Tenant Isolation)
  // -------------------------------------------------------------------------
  console.log('\n--- 8. TC-RBAC-08: Cô lập Đa tổ chức (Multi-Tenant Isolation) ---');
  {
    // Đặt lại dữ liệu chuẩn trước khi kiểm tra số lượng nhân sự tổ chức
    await request('/api/data/reset-sample', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userRole: 'ORG_OWNER' }),
    });

    const plAlpha = await request('/api/payroll/calculate?tenantId=tenant-alpha-tech&userRole=ORG_OWNER');
    const plBeta = await request('/api/payroll/calculate?tenantId=tenant-beta-logistics&userRole=ORG_OWNER');

    assert(plAlpha.body?.payroll?.length === 8, 'TC-RBAC-08', 'Tân Phát Digital có 8 nhân sự', 8, plAlpha.body?.payroll?.length);
    assert(plBeta.body?.payroll?.length === 4, 'TC-RBAC-08', 'Bắc Nam Logistics có 4 nhân sự', 4, plBeta.body?.payroll?.length);

    // Nhân sự của Beta không xuất hiện trong Alpha
    const alphaIds = plAlpha.body?.payroll?.map((p: any) => p.employeeId) || [];
    const betaIds = plBeta.body?.payroll?.map((p: any) => p.employeeId) || [];
    const crossLeak = alphaIds.some((id: string) => betaIds.includes(id));
    assert(!crossLeak, 'TC-RBAC-08', 'Không có rò rỉ ID nhân sự chéo giữa 2 doanh nghiệp');
  }

  // -------------------------------------------------------------------------
  // TỔNG KẾT
  // -------------------------------------------------------------------------
  console.log('\n========================================================================');
  const total = results.length;
  const passed = results.filter(r => r.passed).length;
  const failed = total - passed;
  console.log(`📊 TỔNG KẾT KIỂM THỬ PHÂN TẦNG VAI TRÒ RBAC:`);
  console.log(`   - Tổng số kiểm thử: ${total}`);
  console.log(`   - Thành công (PASS): ${passed}`);
  console.log(`   - Thất bại   (FAIL): ${failed}`);
  console.log(`   - Tỷ lệ đạt:        ${((passed / total) * 100).toFixed(1)}%`);
  console.log('========================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runRbacTests().catch(err => {
  console.error('Fatal Test Runner Error:', err);
  process.exit(1);
});
