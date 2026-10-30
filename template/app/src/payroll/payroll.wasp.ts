import { action, page, query, route, type Spec } from "@wasp.sh/spec";

import { CompanySettingsPage } from "./pages/CompanySettingsPage" with { type: "ref" };
import { EmployeeManagementPage } from "./pages/EmployeeManagementPage" with { type: "ref" };
import { PayrollDashboardPage } from "./pages/PayrollDashboardPage" with { type: "ref" };
import { PayrollSpreadsheetPage } from "./pages/PayrollSpreadsheetPage" with { type: "ref" };
import { TaxInsuranceReportsPage } from "./pages/TaxInsuranceReportsPage" with { type: "ref" };
import { TimekeepingPage } from "./pages/TimekeepingPage" with { type: "ref" };

import {
  getPayrollSpreadsheet,
  getEmployeeSalarySlip,
  getTimekeepingGrid,
  getCompanySettings,
  calculatePayrollPeriod,
  updatePayrollAdjustment,
  transitionPayrollStatus,
  updateAttendanceCell,
  updateOvertimeHours,
  updateCompanySettings,
} from "./server/operations/waspPayrollOperations" with { type: "ref" };

export const payrollSpec: Spec = [
  // 1. Phân hệ các trang giao diện (UI Routes)
  route(
    "PayrollDashboardRoute",
    "/payroll",
    page(PayrollDashboardPage, { authRequired: true }),
  ),
  route(
    "EmployeeManagementRoute",
    "/payroll/employees",
    page(EmployeeManagementPage, { authRequired: true }),
  ),
  route(
    "TimekeepingRoute",
    "/payroll/timekeeping",
    page(TimekeepingPage, { authRequired: true }),
  ),
  route(
    "PayrollSpreadsheetRoute",
    "/payroll/spreadsheet",
    page(PayrollSpreadsheetPage, { authRequired: true }),
  ),
  route(
    "TaxInsuranceReportsRoute",
    "/payroll/tax-insurance",
    page(TaxInsuranceReportsPage, { authRequired: true }),
  ),
  route(
    "CompanySettingsRoute",
    "/payroll/settings",
    page(CompanySettingsPage, { authRequired: true }),
  ),

  // 2. Phân hệ Truy vấn Dữ liệu Bảo mật (Secure Queries)
  query(getPayrollSpreadsheet, {
    entities: ["Tenant", "Employee", "PayrollPeriod", "PayrollRecord", "CompanySetting", "Membership"],
  }),
  query(getEmployeeSalarySlip, {
    entities: ["Tenant", "Employee", "PayrollPeriod", "PayrollRecord", "CompanySetting", "Membership"],
  }),
  query(getTimekeepingGrid, {
    entities: ["Tenant", "Employee", "AttendanceRecord", "PayrollPeriod", "Membership"],
  }),
  query(getCompanySettings, {
    entities: ["Tenant", "CompanySetting", "Membership"],
  }),

  // 3. Phân hệ Tác vụ Biến đổi & Chốt lương An toàn (Secure Actions & Transactions)
  action(calculatePayrollPeriod, {
    entities: [
      "Tenant",
      "Employee",
      "PayrollPeriod",
      "PayrollRecord",
      "CompanySetting",
      "AttendanceRecord",
      "Membership",
    ],
  }),
  action(updatePayrollAdjustment, {
    entities: ["Tenant", "PayrollPeriod", "PayrollRecord", "Membership"],
  }),
  action(transitionPayrollStatus, {
    entities: ["Tenant", "PayrollPeriod", "PayrollRecord", "AuditLog", "Membership"],
  }),
  action(updateAttendanceCell, {
    entities: ["Tenant", "Employee", "AttendanceRecord", "PayrollPeriod", "Membership"],
  }),
  action(updateOvertimeHours, {
    entities: ["Tenant", "Employee", "AttendanceRecord", "PayrollPeriod", "Membership"],
  }),
  action(updateCompanySettings, {
    entities: [
      "Tenant",
      "CompanySetting",
      "ConfigurationVersion",
      "AuditLog",
      "Membership",
    ],
  }),
];
