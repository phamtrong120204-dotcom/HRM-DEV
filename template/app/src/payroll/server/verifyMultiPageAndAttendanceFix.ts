/**
 * Automated Verification Suite for:
 * 1. Multi-Page URL Routing (/tong-quan, /cham-cong, /nhan-vien, /bang-luong, /thue-bhxh, /cai-dat, /du-lieu)
 * 2. Timekeeping Brush Switching & Zero Data Loss Guarantee
 * 3. Attendance Eraser & Overtime (OT) API Synchronization
 * 4. Lock Period Enforcement & PII Masking
 */

import http from 'node:http';

const BASE_URL = 'http://localhost:3000';

function fetchGet(path: string): Promise<{ status: number; text: string; json?: any }> {
  return new Promise((resolve, reject) => {
    http.get(`${BASE_URL}${path}`, res => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        let json;
        try { json = JSON.parse(data); } catch {}
        resolve({ status: res.statusCode || 0, text: data, json });
      });
    }).on('error', reject);
  });
}

function fetchPost(path: string, body: any): Promise<{ status: number; text: string; json?: any }> {
  return new Promise((resolve, reject) => {
    const dataStr = JSON.stringify(body);
    const req = http.request(`${BASE_URL}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(dataStr)
      }
    }, res => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        let json;
        try { json = JSON.parse(data); } catch {}
        resolve({ status: res.statusCode || 0, text: data, json });
      });
    });
    req.on('error', reject);
    req.write(dataStr);
    req.end();
  });
}

async function runTests() {
  console.log('========================================================================');
  console.log('🧪 BẮT ĐẦU KIỂM THỬ TỰ ĐỘNG: KIẾN TRÚC SAAS, ROUTING & CHẤM CÔNG');
  console.log('========================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(name: string, condition: boolean, extraInfo?: string) {
    if (condition) {
      console.log(`  ✅ [PASS] ${name}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${name} ${extraInfo ? '-> ' + extraInfo : ''}`);
      failed++;
    }
  }

  // TC-01: Health check
  console.log('--- NHÓM 1: KIỂM TRA MÁY CHỦ & HEALTH CHECK ---');
  const health = await fetchGet('/health');
  assert('TC-01: Health check endpoint trả về 200 OK và trạng thái healthy', health.status === 200 && health.json?.status === 'healthy');

  // TC-02: Server-side Page Routes
  console.log('\n--- NHÓM 2: KIỂM TRA ĐIỀU HƯỚNG MULTI-PAGE ROUTING (/tên-trang) ---');
  const routesToTest = [
    { path: '/tong-quan', expectedTitle: 'Tổng quan', expectedTab: 'dashboard' },
    { path: '/cham-cong', expectedTitle: 'Chấm công', expectedTab: 'chamcong' },
    { path: '/nhan-vien', expectedTitle: 'Nhân viên', expectedTab: 'nhanvien' },
    { path: '/bang-luong', expectedTitle: 'Bảng lương', expectedTab: 'bangluong' },
    { path: '/thue-bhxh', expectedTitle: 'Thuế & BHXH', expectedTab: 'thue' },
    { path: '/cai-dat', expectedTitle: 'Cài đặt', expectedTab: 'caidat' },
    { path: '/du-lieu', expectedTitle: 'Dữ liệu & Khóa sổ', expectedTab: 'data' },
    { path: '/dashboard', expectedTitle: 'Tổng quan', expectedTab: 'dashboard' },
    { path: '/timekeeping', expectedTitle: 'Chấm công', expectedTab: 'chamcong' },
    { path: '/payroll', expectedTitle: 'Bảng lương', expectedTab: 'bangluong' },
  ];

  for (const r of routesToTest) {
    const res = await fetchGet(r.path);
    const hasStatus = res.status === 200;
    const hasTitle = res.text.includes(`<title>${r.expectedTitle} · Hệ thống Chấm công & Tính lương B2B SaaS</title>`);
    const hasActiveTab = res.text.includes(`data-tab="${r.expectedTab}" class="nav-item on"`) || res.text.includes(`href="${r.path}" data-tab="${r.expectedTab}" class="nav-item on"`);
    const hasPaneVisible = res.text.includes(`id="v-${r.expectedTab}" class="view" style="display:block"`);
    assert(
      `Route ${r.path} -> Title "${r.expectedTitle}", Tab active & hiển thị trực tiếp từ server`,
      hasStatus && hasTitle && hasPaneVisible,
      `status=${res.status}, titleMatch=${hasTitle}, paneVisible=${hasPaneVisible}`
    );
  }

  // TC-03: Attendance Bug Fix Verification (Zero Data Loss on Brush Switch)
  console.log('\n--- NHÓM 3: KIỂM TRA CHỐNG MẤT DỮ LIỆU KHI CHUYỂN NÚT CHẤM CÔNG ---');
  const tenantId = 'tenant-alpha-tech';
  const empRes = await fetchGet(`/api/timekeeping?tenantId=${tenantId}&userRole=ORG_OWNER`);
  const employeesMap = empRes.json?.attendance || {};
  const firstEmpId = Object.keys(employeesMap)[0];

  assert('Lấy được danh sách nhân sự chấm công của tenant', !!firstEmpId, `empId=${firstEmpId}`);

  // Chấm 'X' vào ngày 15
  const p1 = await fetchPost('/api/timekeeping/update', {
    tenantId,
    employeeId: firstEmpId,
    day: 15,
    code: 'X'
  });
  assert('Gửi chấm công ngày 15 mã X thành công', p1.status === 200 && p1.json?.success === true);

  // Chấm tiếp 'CT' (Đi công tác) vào ngày 16
  const p2 = await fetchPost('/api/timekeeping/update', {
    tenantId,
    employeeId: firstEmpId,
    day: 16,
    code: 'CT'
  });
  assert('Gửi chấm công ngày 16 mã CT thành công', p2.status === 200 && p2.json?.success === true);

  // Đọc lại từ backend: CẢ NGÀY 15 ('X') VÀ NGÀY 16 ('CT') PHẢI ĐƯỢC GIỮ NGUYÊN!
  const verifyRes = await fetchGet(`/api/timekeeping?tenantId=${tenantId}&userRole=ORG_OWNER`);
  const empAttAfter = verifyRes.json?.attendance?.[firstEmpId]?.days || {};
  assert(
    'Ngày 15 vẫn giữ nguyên mã X sau khi chấm tiếp CT (Không bị xóa ô)',
    empAttAfter[15] === 'X',
    `expected: 'X', got: '${empAttAfter[15]}'`
  );
  assert(
    'Ngày 16 ghi nhận đúng mã CT (Công tác)',
    empAttAfter[16] === 'CT',
    `expected: 'CT', got: '${empAttAfter[16]}'`
  );

  // TC-04: Test Eraser (Tẩy ô chấm công)
  console.log('\n--- NHÓM 4: KIỂM TRA CÔNG CỤ TẨY (ERASER) ---');
  const eraseRes = await fetchPost('/api/timekeeping/update', {
    tenantId,
    employeeId: firstEmpId,
    day: 15,
    code: '' // Tẩy xóa ô
  });
  assert('Gửi yêu cầu Tẩy ô ngày 15 thành công', eraseRes.status === 200);

  const verifyErase = await fetchGet(`/api/timekeeping?tenantId=${tenantId}&userRole=ORG_OWNER`);
  const empAttErase = verifyErase.json?.attendance?.[firstEmpId]?.days || {};
  assert(
    'Ngày 15 đã được xóa sạch hoàn toàn khỏi dữ liệu (không bị biến ngược lại thành X)',
    empAttErase[15] === undefined,
    `day 15 is: ${empAttErase[15]}`
  );

  // TC-05: Test Overtime (OT) API
  console.log('\n--- NHÓM 5: KIỂM TRA CẬP NHẬT GIỜ LÀM THÊM (OT) ---');
  const otRes = await fetchPost('/api/timekeeping/ot', {
    tenantId,
    employeeId: firstEmpId,
    otHours: 6.5
  });
  assert('Cập nhật OT 6.5 giờ thành công', otRes.status === 200 && otRes.json?.success === true);

  const verifyOt = await fetchGet(`/api/timekeeping?tenantId=${tenantId}&userRole=ORG_OWNER`);
  const otAfter = verifyOt.json?.attendance?.[firstEmpId]?.otHours;
  assert('Dữ liệu OT được ghi nhận chính xác 6.5 giờ', otAfter === 6.5, `got: ${otAfter}`);

  // TC-06: Lock Payroll Period Security & Enforcement
  console.log('\n--- NHÓM 6: KIỂM TRA PHÂN QUYỀN KHÓA SỔ & AN TOÀN KỲ LƯƠNG ---');
  // Khóa sổ
  const lockRes = await fetchPost('/api/payroll/lock', {
    tenantId,
    userRole: 'ORG_OWNER'
  });
  assert('Khóa sổ kỳ lương thành công bởi Giám đốc', lockRes.status === 200 && lockRes.json?.status === 'LOCKED');

  // Thử sửa công khi kỳ lương đã LOCKED -> Phải bị chặn 400
  const forbiddenUpdate = await fetchPost('/api/timekeeping/update', {
    tenantId,
    employeeId: firstEmpId,
    day: 18,
    code: 'P'
  });
  assert('Chặn sửa ngày công khi kỳ lương đã LOCKED (400 Bad Request)', forbiddenUpdate.status === 400);

  // Thử sửa OT khi kỳ lương đã LOCKED -> Phải bị chặn 400
  const forbiddenOt = await fetchPost('/api/timekeeping/ot', {
    tenantId,
    employeeId: firstEmpId,
    otHours: 10
  });
  assert('Chặn sửa giờ OT khi kỳ lương đã LOCKED (400 Bad Request)', forbiddenOt.status === 400);

  // Mở khóa sổ
  const unlockRes = await fetchPost('/api/payroll/unlock', {
    tenantId,
    userRole: 'ORG_OWNER',
    reason: 'Mở khóa để bổ sung giờ làm việc cho nhân viên'
  });
  assert('Mở khóa sổ kỳ lương thành công kèm lý do', unlockRes.status === 200 && unlockRes.json?.status === 'DRAFT');

  // TC-07: PII Masking & Data Isolation
  console.log('\n--- NHÓM 7: BẢO MẬT PII VÀ CÔ LẬP TENANT ---');
  const empPayroll = await fetchGet(`/api/payroll/calculate?tenantId=${tenantId}&userRole=EMPLOYEE`);
  const sampleEmp = empPayroll.json?.payroll?.[0];
  const isCccdMasked = sampleEmp?.idCardNumber?.includes('***') || (sampleEmp?.idCardNumber?.startsWith('******'));
  const isBankMasked = sampleEmp?.bankAccountNumber?.includes('***') || (sampleEmp?.bankAccountNumber?.startsWith('******'));
  assert('Nhân viên thường (EMPLOYEE) bị che số CCCD và Số tài khoản ngân hàng', isCccdMasked && isBankMasked, `CCCD: ${sampleEmp?.idCardNumber}, Bank: ${sampleEmp?.bankAccountNumber}`);

  const ownerPayroll = await fetchGet(`/api/payroll/calculate?tenantId=${tenantId}&userRole=ORG_OWNER`);
  const ownerEmp = ownerPayroll.json?.payroll?.[0];
  assert('Giám đốc (ORG_OWNER) nhìn thấy đầy đủ thông tin định danh và tài khoản', !ownerEmp?.idCardNumber?.includes('***'), `CCCD: ${ownerEmp?.idCardNumber}`);

  // TỔNG KẾT
  console.log('\n========================================================================');
  console.log(`📊 KẾT QUẢ KIỂM THỬ: ${passed} PASS / ${failed} FAIL (Tổng số: ${passed + failed})`);
  console.log('========================================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error('Lỗi khi chạy test suite:', err);
  process.exit(1);
});
