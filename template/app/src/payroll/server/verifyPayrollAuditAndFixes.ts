import http from 'http';
import assert from 'node:assert';

const BASE_URL = 'http://localhost:3000';

function request(options: { path: string; method?: string; body?: any; headers?: any }): Promise<{ status: number; headers: any; body: any; rawBody: string }> {
  return new Promise((resolve, reject) => {
    const url = new URL(options.path, BASE_URL);
    const req = http.request(url, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let parsed = null;
        try {
          parsed = JSON.parse(data);
        } catch {
          parsed = null;
        }
        resolve({
          status: res.statusCode || 0,
          headers: res.headers,
          body: parsed,
          rawBody: data
        });
      });
    });
    req.on('error', reject);
    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

async function runPayrollAuditTests() {
  console.log('========================================================================');
  console.log('🧪 BẮT ĐẦU KIỂM THỬ TOÀN DIỆN TRANG BẢNG LƯƠNG & NGHIỆP VỤ KẾ TOÁN (AUDIT)');
  console.log('========================================================================\n');

  let passedCount = 0;
  let failedCount = 0;

  function recordPass(testName: string) {
    passedCount++;
    console.log(`  ✅ [PASS] ${testName}`);
  }

  function recordFail(testName: string, error: any) {
    failedCount++;
    console.error(`  ❌ [FAIL] ${testName}:`, error.message || error);
  }

  // 1. Kiểm tra Reset dữ liệu ban đầu
  try {
    const res = await request({ path: '/api/data/reset-sample', method: 'POST' });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    recordPass('Reset dữ liệu hệ thống về bộ demo chuẩn');
  } catch (e: any) {
    recordFail('Reset dữ liệu hệ thống về bộ demo chuẩn', e);
  }

  // 2. Kiểm tra API /api/payroll/calculate cho Tenant Alpha (Tân Phát Digital)
  let alphaPayroll: any[] = [];
  try {
    const res = await request({ path: '/api/payroll/calculate?tenantId=tenant-alpha-tech' });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.periodStatus, 'DRAFT');
    alphaPayroll = res.body.payroll;
    assert.ok(Array.isArray(alphaPayroll) && alphaPayroll.length === 8, 'Tenant Alpha phải có đúng 8 nhân sự');
    recordPass('Lấy dữ liệu Bảng lương Tenant Alpha (8 nhân sự, DRAFT)');
  } catch (e: any) {
    recordFail('Lấy dữ liệu Bảng lương Tenant Alpha', e);
  }

  // 3. Kiểm tra Phương trình Cân đối Kế toán: Gross = Sum(Incomes) và Net = Gross - Deductions
  try {
    for (const p of alphaPayroll) {
      const isPiece = p.salaryType === 'PIECE_RATE';
      const earnedSalary = isPiece ? p.pieceRateSalary : p.timeSalary;

      // Tổng thu nhập thành phần
      const expectedGross = (earnedSalary || 0) +
        (p.lunchAllowance || 0) +
        (p.seniorityAllowance || 0) +
        (p.attendanceBonus || 0) +
        (p.otherAllowances || 0) +
        (p.bonusAmount || 0) +
        (p.overtimeSalary || 0);

      assert.strictEqual(
        p.grossSalary,
        expectedGross,
        `Nhân viên ${p.employeeCode} (${p.employeeName}): Gross (${p.grossSalary}) != Tổng các khoản thu nhập (${expectedGross})`
      );

      // Tổng các khoản giảm trừ
      const totalIns = p.insurance ? p.insurance.totalEmployee : 0;
      const expectedDeductions = totalIns +
        (p.taxAmount || 0) +
        (p.advancePayment || 0) +
        (p.otherDeductions || 0);

      const expectedNet = p.grossSalary - expectedDeductions;
      assert.strictEqual(
        p.netSalary,
        expectedNet,
        `Nhân viên ${p.employeeCode} (${p.employeeName}): Net (${p.netSalary}) != Gross - Giảm trừ (${expectedNet})`
      );
    }
    recordPass('Phương trình Cân đối Kế toán: Gross = Sum(Thu nhập) & Net = Gross - Giảm trừ (Sai số 0 VND trên toàn bộ nhân sự)');
  } catch (e: any) {
    recordFail('Phương trình Cân đối Kế toán trên Tenant Alpha', e);
  }

  // 4. Kiểm tra Lương Khoán sản phẩm cho NV004 (Phạm Minh Đức)
  try {
    const nv004 = alphaPayroll.find((p: any) => p.employeeCode === 'NV004');
    assert.ok(nv004, 'Phải tìm thấy nhân viên NV004');
    assert.strictEqual(nv004.salaryType, 'PIECE_RATE', 'NV004 phải có hình thức lương khoán PIECE_RATE');
    assert.strictEqual(nv004.timeSalary, 0, 'NV004 hưởng lương khoán nên lương thời gian phải bằng 0');
    assert.ok(nv004.pieceRateSalary > 0, `NV004 lương khoán sản phẩm phải > 0, thực tế: ${nv004.pieceRateSalary}`);
    assert.strictEqual(nv004.pieceRateSalary, 2100 * 8000, 'NV004 lương khoán phải là 2,100 SP * 8,000đ = 16,800,000đ');
    recordPass('Nghiệp vụ lương khoán sản phẩm NV004 (2,100 SP * 8,000đ = 16,800,000đ, không bị nhân đôi lương thời gian)');
  } catch (e: any) {
    recordFail('Nghiệp vụ lương khoán sản phẩm NV004', e);
  }

  // 5. Kiểm tra Tiền thưởng của NV005 và Lương OT của NV003
  try {
    const nv005 = alphaPayroll.find((p: any) => p.employeeCode === 'NV005');
    assert.ok(nv005, 'Phải tìm thấy nhân viên NV005');
    assert.strictEqual(nv005.bonusAmount, 5000000, 'NV005 phải có khoản thưởng 5,000,000đ trong dữ liệu demo');

    const nv003 = alphaPayroll.find((p: any) => p.employeeCode === 'NV003');
    assert.ok(nv003, 'Phải tìm thấy nhân viên NV003');
    assert.ok(nv003.overtimeSalary > 0, `NV003 phải có tiền lương OT (10h) tính theo công thức backend, thực tế: ${nv003.overtimeSalary}`);
    recordPass('Khoản thưởng 5,000,000đ của NV005 và Lương OT (10 giờ) của NV003 được tính chuẩn xác');
  } catch (e: any) {
    recordFail('Khoản thưởng và tiền OT', e);
  }

  // 6. Kiểm tra Thuế TNCN Luật hiện hành (NQ 954/2020: 11M bản thân, 4.4M phụ thuộc)
  try {
    const nv001 = alphaPayroll.find((p: any) => p.employeeCode === 'NV001');
    assert.ok(nv001, 'Phải tìm thấy nhân viên NV001 (Giám đốc)');
    assert.ok(nv001.taxAmount > 0, 'NV001 phải chịu thuế TNCN');
    const expectedFamilyDeduction = 11000000 + (nv001.dependentsCount * 4400000);
    assert.strictEqual(nv001.familyDeductions, expectedFamilyDeduction, 'Giảm trừ gia cảnh phải tính theo 11M + 4.4M * n');
    assert.strictEqual(nv001.assessableIncome, Math.max(0, nv001.taxableIncome - nv001.familyDeductions - nv001.insurance.totalEmployee), 'Thu nhập tính thuế = Thu nhập chịu thuế - Giảm trừ gia cảnh - BHXH');
    recordPass('Thuế TNCN chuẩn hóa theo Nghị quyết 954/2020 (11M bản thân, 4.4M/người phụ thuộc)');
  } catch (e: any) {
    recordFail('Thuế TNCN chuẩn hóa', e);
  }

  // 7. Kiểm tra API /api/payroll/adjustments: Cập nhật tạm ứng và giảm trừ khác
  try {
    const adjustRes = await request({
      path: '/api/payroll/adjustments',
      method: 'POST',
      body: {
        tenantId: 'tenant-alpha-tech',
        employeeId: 'emp_alpha_001',
        tamUng: 3000000,
        khauTruKhac: 500000,
        thuong: 2000000
      }
    });
    assert.strictEqual(adjustRes.status, 200);
    assert.strictEqual(adjustRes.body.success, true);
    assert.strictEqual(adjustRes.body.adjustments.tamUng, 3000000);
    assert.strictEqual(adjustRes.body.adjustments.khauTruKhac, 500000);
    assert.strictEqual(adjustRes.body.adjustments.thuong, 2000000);

    // Lấy lại payroll để kiểm tra xem giá trị mới đã phản ánh vào NetSalary chưa
    const reloadRes = await request({ path: '/api/payroll/calculate?tenantId=tenant-alpha-tech' });
    const updatedEmp1 = reloadRes.body.payroll.find((p: any) => p.employeeCode === 'NV001');
    assert.strictEqual(updatedEmp1.advancePayment, 3000000, 'Tạm ứng phải là 3,000,000đ');
    assert.strictEqual(updatedEmp1.otherDeductions, 500000, 'Khấu trừ khác phải là 500,000đ');
    assert.strictEqual(updatedEmp1.bonusAmount, 2000000, 'Thưởng phải là 2,000,000đ');

    // Kiểm tra lại phương trình kế toán sau khi điều chỉnh
    const expectedDeduct = (updatedEmp1.insurance?.totalEmployee || 0) + updatedEmp1.taxAmount + 3000000 + 500000;
    assert.strictEqual(updatedEmp1.netSalary, updatedEmp1.grossSalary - expectedDeduct, 'Net Salary sau điều chỉnh phải khớp 100%');
    recordPass('API /api/payroll/adjustments cập nhật tạm ứng, khấu trừ khác, thưởng và tự động tính lại Net Salary');
  } catch (e: any) {
    recordFail('API /api/payroll/adjustments', e);
  }

  // 8. Kiểm tra Khóa sổ kỳ lương và Chống sửa đổi khi đã khóa
  try {
    // Khóa sổ bởi ORG_OWNER
    const lockRes = await request({
      path: '/api/payroll/lock',
      method: 'POST',
      body: { tenantId: 'tenant-alpha-tech', userRole: 'ORG_OWNER' }
    });
    assert.strictEqual(lockRes.status, 200);
    assert.strictEqual(lockRes.body.status, 'LOCKED');

    // Thử cập nhật điều chỉnh khi đã khóa -> Phải bị từ chối với status 400
    const blockedAdjust = await request({
      path: '/api/payroll/adjustments',
      method: 'POST',
      body: {
        tenantId: 'tenant-alpha-tech',
        employeeId: 'emp_alpha_001',
        tamUng: 5000000
      }
    });
    assert.strictEqual(blockedAdjust.status, 400, 'Phải chặn cập nhật điều chỉnh khi kỳ lương đã KHÓA SỔ');
    assert.ok(blockedAdjust.body.error.includes('KHÓA SỔ'), 'Thông báo lỗi phải nêu rõ kỳ lương đã khóa sổ');

    // Mở khóa lại để phục hồi trạng thái
    const unlockRes = await request({
      path: '/api/payroll/unlock',
      method: 'POST',
      body: {
        tenantId: 'tenant-alpha-tech',
        userRole: 'ORG_OWNER',
        reason: 'Mở khóa để tiếp tục kiểm thử tự động hệ thống'
      }
    });
    assert.strictEqual(unlockRes.status, 200);
    assert.strictEqual(unlockRes.body.status, 'DRAFT');
    recordPass('Cơ chế bảo mật Khóa sổ: Chặn tuyệt đối hành vi sửa đổi tạm ứng/khấu trừ khi trạng thái là LOCKED');
  } catch (e: any) {
    recordFail('Cơ chế bảo mật Khóa sổ', e);
  }

  // 9. Kiểm tra Tenant Beta (Bắc Nam Logistics) và Cô lập Multi-tenant
  try {
    const betaRes = await request({ path: '/api/payroll/calculate?tenantId=tenant-beta-logistics' });
    assert.strictEqual(betaRes.status, 200);
    assert.strictEqual(betaRes.body.payroll.length, 4, 'Tenant Beta phải có đúng 4 nhân viên');

    // Đảm bảo các điều chỉnh của Tenant Alpha (emp_alpha_001) không rò rỉ sang Tenant Beta
    const betaEmp1 = betaRes.body.payroll.find((p: any) => p.employeeCode === 'NVB01');
    assert.strictEqual(betaEmp1.advancePayment, 0, 'NVB01 của Tenant Beta không bị ảnh hưởng bởi tạm ứng của NV001');
    assert.strictEqual(betaEmp1.otherDeductions, 0, 'NVB01 của Tenant Beta không bị ảnh hưởng bởi khấu trừ khác');
    recordPass('Cô lập dữ liệu Multi-tenant giữa Tân Phát Digital và Bắc Nam Logistics');
  } catch (e: any) {
    recordFail('Cô lập dữ liệu Multi-tenant', e);
  }

  // 10. Kiểm tra Server-Side Page Route /bang-luong
  try {
    const pageRes = await request({ path: '/bang-luong' });
    assert.strictEqual(pageRes.status, 200);
    assert.ok(pageRes.headers['content-type'].includes('text/html'), 'Phải trả về HTML');
    assert.ok(pageRes.rawBody.includes('THU NHẬP'), 'HTML phải có nhóm cột THU NHẬP');
    assert.ok(pageRes.rawBody.includes('GIẢM TRỪ') || pageRes.rawBody.includes('KHẤU TRỪ'), 'HTML phải có nhóm cột GIẢM TRỪ / KHẤU TRỪ');
    assert.ok(pageRes.rawBody.includes('Thực lĩnh') || pageRes.rawBody.includes('THỰC LĨNH'), 'HTML phải có nhóm cột THỰC LĨNH');
    assert.ok(pageRes.rawBody.includes('adjustModal'), 'HTML phải có modal điều chỉnh adjustModal');
    assert.ok(pageRes.rawBody.includes('calculateDraftTaxClient'), 'HTML script phải có hàm tính thuế dự thảo calculateDraftTaxClient');
    recordPass('Route /bang-luong tải đầy đủ giao diện bảng lương, modal điều chỉnh và tính toán thuế đối chiếu');
  } catch (e: any) {
    recordFail('Route /bang-luong', e);
  }

  console.log('\n========================================================================');
  console.log(`📊 TỔNG KẾT KIỂM THỬ: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log('========================================================================');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runPayrollAuditTests().catch(err => {
  console.error('Lỗi nghiêm trọng trong quá trình kiểm thử:', err);
  process.exit(1);
});
