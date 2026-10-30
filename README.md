 <div align="center">

  <img src="docs/assets/elvo-logo.png" alt="elvo" width="280" />

  <h1>HRM-DEV</h1>

  **Human Resource Management System**

  A workforce management solution by **elvo**.

  <p>
    <img src="https://img.shields.io/badge/PRODUCT-HRM--DEV-0F1B33?style=flat-square" alt="Product" />
    <img src="https://img.shields.io/badge/BUILT%20BY-elvo-FF6B3D?style=flat-square" alt="Built by elvo" />
    <img src="https://img.shields.io/badge/RUNTIME-Node.js-0F1B33?style=flat-square" alt="Node.js" />
    <img src="https://img.shields.io/badge/LANGUAGE-TypeScript-3178C6?style=flat-square" alt="TypeScript" />
  </p>

  [Overview](#-overview) · [Features](#-core-features) · [Architecture](#-architecture) · [Getting Started](#-getting-started)

</div>

---

## Overview

**HRM-DEV** is a Human Resource Management System developed by **elvo**, designed to support essential workforce operations through a structured and integrated software platform.

The system focuses on employee administration, department organization, attendance tracking, and payroll processing.

Our goal is to simplify HR operations, improve data consistency, and provide a foundation for more efficient workforce management.

### Product Direction

- **Simplify** — Reduce repetitive administrative work.
- **Organize** — Centralize workforce information and operations.
- **Calculate** — Support structured and consistent payroll processing.
- **Protect** — Apply tenant-scoped data access and personal information safeguards.

## Core Features

### 1. Employee Management
- Employee records and personal information.
- Employee identification and data handling.
- Department assignment and workforce organization.

### 2. Department Management
- Department structure.
- Employee organization by department.
- Tenant-scoped data access.

### 3. Attendance Management
- Daily attendance records.
- Working days and leave tracking.
- Business trips and overtime.
- Attendance-related payroll inputs.

### 4. Payroll Management
- Payroll period management.
- Payroll review and processing states.
- Salary calculation and breakdown.
- Allowances, bonuses, and deductions.
- Net salary calculation.

### 5. Payroll Calculation Engine

The payroll engine supports calculation scenarios including:

- Time-based and piece-rate compensation.
- Working days and attendance inputs.
- Paid and unpaid leave.
- Overtime and allowances.
- Social insurance-related calculations.
- Personal income tax calculations.
- Salary advances and net pay.

> Payroll formulas, tax brackets, insurance rates, and statutory thresholds must be reviewed against applicable Vietnamese regulations before production use.

## Architecture

HRM-DEV separates business calculations, application services, data access, and security-related utilities.

```text
HRM-DEV
│
├── Application Layer
│   ├── Employee Management
│   ├── Department Management
│   ├── Attendance Management
│   └── Payroll Management
│
├── Business Logic Layer
│   ├── Payroll Calculation
│   ├── Attendance Processing
│   └── Financial Calculations
│
├── Data Access Layer
│   ├── Tenant-scoped Repository
│   └── In-memory Database Store
│
├── Security Layer
│   ├── Session Handling
│   ├── Personal Data Masking
│   └── Input Sanitization
│
└── Quality Assurance
    ├── Unit Tests
    ├── Regression Tests
    └── Security Tests
```

### Multi-Tenant Design

The system includes tenant-scoped repository logic to separate data between organizations.

The current standalone implementation uses an **in-memory data store**. Persistent database integration and production infrastructure should be configured separately before deployment.

### Security & Data Protection

Current source code includes utilities for:

- Masking identification card numbers.
- Masking bank account numbers.
- Sanitizing employee personal information.
- HTML escaping.
- CSV cell sanitization.
- Session and tenant-scoped data handling.

These mechanisms are implementation-level safeguards and should not be interpreted as a completed production security certification.

## Technology Stack

| Technology | Purpose |
|---|---|
| Node.js | Runtime environment |
| TypeScript | Application and business logic |
| React | Frontend foundation |
| Wasp / Open SaaS | Original project foundation |
| Node.js Test Runner | Automated testing |
| ESLint | Code quality |
| Prettier | Code formatting |

The standalone payroll server is currently executed directly through Node.js with TypeScript type stripping.

## Getting Started

### Prerequisites

- Node.js with support for `--experimental-strip-types`.
- npm.

### Installation

```bash
git clone https://github.com/phamtrong120204-dotcom/HRM-DEV.git

cd HRM-DEV

npm install
```

### Run Development Server

```bash
npm run dev
```

The default server address is:

```text
http://localhost:3000
```

To use another port:

```bash
PORT=4000 npm run dev
```

### Production Start Command

```bash
npm start
```

> The current standalone server uses in-memory storage and demo data. Restarting the server may reset application data. Configure persistent storage before using real organizational data.

## Testing & Code Quality

Run the automated test suite:

```bash
npm test
```

Run ESLint:

```bash
npm run lint
```

Automatically fix lint issues:

```bash
npm run lint:fix
```

Check code formatting:

```bash
npm run prettier:check
```

Format the codebase:

```bash
npm run prettier:format
```

## Project Structure

```text
HRM-DEV/
│
├── template/
│   └── app/
│       └── src/
│           └── payroll/
│               ├── server/
│               │   ├── standaloneAppServer.ts
│               │   ├── engine/
│               │   ├── backendEngine.test.ts
│               │   ├── multiTenantSecurity.test.ts
│               │   ├── qaRegression.test.ts
│               │   └── securityAudit.test.ts
│               │
│               ├── utils/
│               │   ├── payrollEngine.ts
│               │   └── docSo.ts
│               │
│               └── payrollEngine.test.ts
│
├── package.json
└── README.md
```

## Project Status

HRM-DEV is under active development.

The repository currently contains payroll calculation logic, a standalone Node.js server, tenant-scoped data access, security utilities, and automated tests.

Production deployment requires further work on persistent database integration, authentication and authorization configuration, infrastructure, and security validation.

---

## About elvo

**elvo** is a technology brand focused on building modern digital products, business software, websites, and automation solutions.

We combine thoughtful product design, engineering, and practical technology to help businesses operate more efficiently.

**Build better systems. Move business forward.**

<div align="center">

  **elvo**

  <sub>Technology · Software · Automation</sub>

  <br />

  [Website](https://elvo.com.vn)

  <br />

  <sub>© elvo. All rights reserved.</sub>

</div>