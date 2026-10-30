import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { MOCK_EMPLOYEES, MOCK_SETTINGS } from './mockData.ts';
import { docSo, formatNumber, formatVND } from './utils/docSo.ts';
import {
  calcEmployeePayroll,
  calculateSeniorityYears,
  calculateTax,
} from './utils/payrollEngine.ts';

describe('Vietnamese Number to Words Converter (docSo)', () => {
  it('converts 0 correctly', () => {
    assert.equal(docSo(0), 'Không đồng');
  });

  it('converts round millions', () => {
    const text = docSo(10000000).toLowerCase();
    assert.ok(text.includes('mười triệu'));
  });

  it('converts compound amounts', () => {
    const text = docSo(25450000).toLowerCase();
    assert.ok(text.includes('hai mươi lăm triệu'));
    assert.ok(text.includes('bốn trăm năm mươi nghìn'));
  });

  it('formats currency with symbol', () => {
    assert.equal(formatVND(15000000), '15.000.000 đ');
  });

  it('formats plain number with dots', () => {
    assert.equal(formatNumber(15000000), '15.000.000');
  });
});

describe('Seniority Calculation (calculateSeniorityYears)', () => {
  it('computes 0 years for start dates after or in same year', () => {
    assert.equal(calculateSeniorityYears('2026-05-01', '2026-04'), 0);
  });

  it('computes multiple seniority years accurately', () => {
    const years = calculateSeniorityYears('2020-01-01', '2026-04');
    assert.equal(years, 6);
  });
});

describe('Personal Income Tax (calculateTax)', () => {
  it('returns 0 tax when taxable income <= 0', () => {
    assert.equal(calculateTax(0, '2026_5_TIER'), 0);
    assert.equal(calculateTax(-1000000, '2026_5_TIER'), 0);
  });

  it('computes Tier 1 under 2026 5-tier proposal (5% up to 10M)', () => {
    // 10,000,000 * 5% = 500,000
    assert.equal(calculateTax(10000000, '2026_5_TIER'), 500000);
  });

  it('computes Tier 2 under 2026 5-tier proposal (up to 30M)', () => {
    // 10M * 5% + 20M * 10% = 500,000 + 2,000,000 = 2,500,000
    assert.equal(calculateTax(30000000, '2026_5_TIER'), 2500000);
  });

  it('computes legacy 7-tier tax (5% up to 5M, 10% next 5M)', () => {
    // 5,000,000 * 5% = 250,000
    assert.equal(calculateTax(5000000, 'LEGACY_7_TIER'), 250000);
    // 5M * 5% + 5M * 10% = 750,000
    assert.equal(calculateTax(10000000, 'LEGACY_7_TIER'), 750000);
  });
});

describe('Full Employee Payroll Engine (calcEmployeePayroll)', () => {
  it('calculates full month payroll for time-based standard employee', () => {
    const emp = MOCK_EMPLOYEES[0];
    const rec = calcEmployeePayroll(
      emp,
      {
        actualWorkDays: 24,
        paidLeaveDays: 2,
        unpaidLeaveDays: 0,
        paidDaysCount: 26,
        overtimeHours: 0,
      },
      {
        pieceRateQuantity: 0,
        bonusAmount: 0,
        advancePayment: 0,
      },
      MOCK_SETTINGS,
      '2026-04'
    );

    assert.equal(rec.employeeCode, emp.code);
    assert.ok(rec.grossSalary > rec.netSalary);
    assert.ok(rec.netSalary > 0);
    assert.equal(rec.totalCompanyExpense, rec.grossSalary + rec.totalEmployerCost);
  });

  it('exempts statutory insurance when employee takes >= 14 unpaid leave days (Luật BHXH)', () => {
    const emp = MOCK_EMPLOYEES.find((e) => e.code === 'NV006') || MOCK_EMPLOYEES[0];
    const rec = calcEmployeePayroll(
      emp,
      {
        actualWorkDays: 11,
        paidLeaveDays: 0,
        unpaidLeaveDays: 15,
        paidDaysCount: 11,
        overtimeHours: 0,
      },
      {
        pieceRateQuantity: 0,
        bonusAmount: 0,
        advancePayment: 0,
      },
      MOCK_SETTINGS,
      '2026-04'
    );

    assert.equal(rec.isInsuranceExempt14Days, true);
    assert.equal(rec.totalEmployeeInsurance, 0);
    assert.equal(rec.totalEmployerCost, 0);
  });

  it('correctly calculates piece-rate employee', () => {
    const emp = MOCK_EMPLOYEES.find((e) => (e.pieceRateUnitPrice || 0) > 0) || MOCK_EMPLOYEES[0];
    const quantity = 850;
    const unitPrice = emp.pieceRateUnitPrice || 15000;
    const rec = calcEmployeePayroll(
      { ...emp, pieceRateUnitPrice: unitPrice },
      {
        actualWorkDays: 24,
        paidLeaveDays: 2,
        unpaidLeaveDays: 0,
        paidDaysCount: 26,
        overtimeHours: 10,
      },
      {
        pieceRateQuantity: quantity,
        bonusAmount: 0,
        advancePayment: 0,
      },
      MOCK_SETTINGS,
      '2026-04'
    );

    assert.equal(rec.pieceRateSalary, quantity * unitPrice);
    assert.ok(rec.grossSalary >= rec.pieceRateSalary);
  });

  it('disqualifies attendance bonus if unpaid leave days exceed allowance threshold', () => {
    const emp = { ...MOCK_EMPLOYEES[0], attendanceAllowance: 500000 };
    const recQualified = calcEmployeePayroll(
      emp,
      { actualWorkDays: 26, paidLeaveDays: 0, unpaidLeaveDays: 0, paidDaysCount: 26, overtimeHours: 0 },
      {},
      MOCK_SETTINGS,
      '2026-04'
    );
    assert.equal(recQualified.isAttendanceQualified, true);
    assert.ok(recQualified.attendanceAllowance > 0);

    const recDisqualified = calcEmployeePayroll(
      emp,
      { actualWorkDays: 24, paidLeaveDays: 0, unpaidLeaveDays: 2, paidDaysCount: 24, overtimeHours: 0 },
      {},
      MOCK_SETTINGS,
      '2026-04'
    );
    assert.equal(recDisqualified.isAttendanceQualified, false);
    assert.equal(recDisqualified.attendanceAllowance, 0);
  });

  it('enforces insurance ceiling on high base salaries (20x base salary)', () => {
    const highEarner = { ...MOCK_EMPLOYEES[0], insuranceSalary: 80_000_000 };
    const rec = calcEmployeePayroll(
      highEarner,
      { actualWorkDays: 26, paidLeaveDays: 0, unpaidLeaveDays: 0, paidDaysCount: 26, overtimeHours: 0 },
      {},
      MOCK_SETTINGS,
      '2026-04'
    );

    const expectedCapBHXH = 20 * (MOCK_SETTINGS.baseSalaryForInsuranceCap || 2_530_000);
    // BHXH employee 8% of cap
    assert.equal(rec.bhxhEmployee, Math.round(expectedCapBHXH * 0.08));
    // BHYT employee 1.5% of cap
    assert.equal(rec.bhytEmployee, Math.round(expectedCapBHXH * 0.015));
  });
});

