import { routes } from "wasp/client/router";
import { BlogUrl, DocsUrl } from "../../../shared/common";
import type { NavigationItem } from "./NavBar";

const staticNavigationItems: NavigationItem[] = [
  { name: "Documentation", to: DocsUrl },
  { name: "Blog", to: BlogUrl },
];

export const marketingNavigationItems: NavigationItem[] = [
  { name: "Features", to: "/#features" },
  { name: "Pricing", to: routes.PricingPageRoute.to },
  ...staticNavigationItems,
] as const;

export const demoNavigationitems: NavigationItem[] = [
  { name: "Tổng quan", to: "/payroll" },
  { name: "Nhân sự", to: "/payroll/employees" },
  { name: "Chấm công", to: "/payroll/timekeeping" },
  { name: "Bảng lương", to: "/payroll/spreadsheet" },
  { name: "Thuế & BHXH", to: "/payroll/tax-insurance" },
  { name: "Cài đặt", to: "/payroll/settings" },
  { name: "AI Scheduler", to: routes.DemoAppRoute.to },
  ...staticNavigationItems,
] as const;
