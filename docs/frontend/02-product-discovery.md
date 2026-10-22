# Phase 1 — Product Discovery, User Model & Capability Matrix

## 1. Product Vision & Domain Scope

**BTN-HRMS** (`Bình Trần HRMS`) is a unified, Vietnamese-first enterprise Human Resource Management System designed for small-to-midsize and growing enterprises operating under Vietnamese labor, social insurance (BHXH/BHYT/BHTN), personal income tax (PIT), and multi-shift attendance regulations.

It unifies **six operational pillars** in a single web workspace:
1. **Personal Workspace & Collaboration** — Self-service dashboard, tasks, real-time internal chat, and multi-channel notifications.
2. **Time, Attendance & Shift Scheduling** — Camera/GPS web timekeeping, multi-session attendance (morning/noon/afternoon + lunch duty), shift rostering, leave balances, and multi-step leave approvals.
3. **Workforce & Organizational Lifecycle** — 360° employee profiles, org chart, contracts, probation evaluations, internal transfers, onboarding checklists, and structured offboarding/final settlement.
4. **Compensation & Benefits** — Provisional and locked payroll runs, statutory tax/insurance calculations, payslip distribution, expense reimbursements, and benefit plan enrollments.
5. **Talent Acquisition, Performance & Growth** — Headcount requisitions, job postings, candidate pipeline, interviews, offers, OKR/goal tracking, 360/manager performance reviews, LMS courses/certifications, and IT/office asset management.
6. **Governance, Integrations & System Observability** — Dynamic RBAC roles, configurable approval workflows, immutable audit logs, outbound webhook subscriptions, and BullMQ/system health monitoring.

---

## 2. User Model & Personas

All personas derive directly from the backend RBAC role seeds (`ADMIN`, `HR_ADMIN`, `MANAGER`, `EMPLOYEE`) and permission scopes (`own`, `department`, `all`).

### 2.1 Persona Matrix

| Persona | System Role(s) | Primary Goals | High-Frequency Workflows | Low-Frequency / Periodic Workflows | Key Pain Points Addressed |
| --- | --- | --- | --- | --- | --- |
| **1. General Employee** (*Nhân viên*) | `EMPLOYEE` (`*:own` scope) | Track daily attendance, request leave/overtime/expenses/assets, view payslips, complete onboarding/learning tasks | - Daily web check-in/out (`/attendance/my-attendance`)<br>- Viewing shift schedule (`/schedule/my-schedule`)<br>- Submitting leave or expense claims<br>- Checking tasks & notifications | - Updating personal/emergency contact info (`/account/profile`)<br>- Completing self-reviews & OKRs (`/performance/*`)<br>- Enrolling in benefit plans & adding dependents<br>- Requesting IT equipment (`/assets/requests`) | - Unclear approval status (solved by `LeaveTraceTimeline` & approval inbox)<br>- Seeing admin buttons they cannot use (fixed via strict RBAC action gating) |
| **2. Department Manager** (*Trưởng bộ phận*) | `MANAGER` (`*:department` scope) | Maintain team coverage, approve time-off/shift/expense/asset requests, evaluate probation & performance | - Reviewing team attendance & shift roster (`/attendance/management`, `/schedule/roster`)<br>- Approving team leave, shift swaps, and expenses (`/administration/approval`, `/leave/requests`) | - Creating headcount requisitions (`/recruitment/requisitions`)<br>- Conducting probation & cycle performance reviews (`/performance/reviews`)<br>- Approving employee goals (`/performance/goals`) | - Having to look up raw Department or Employee UUIDs when requesting headcount or assigning reviews |
| **3. HR Specialist / C&B Officer** (*Chuyên viên Nhân sự & C&B*) | `HR_ADMIN` (`*:all` on HR/Payroll/Talent modules) | Manage full employee lifecycle, run accurate monthly payroll, drive recruitment, onboarding, benefits, and asset allocation | - Managing employee records & contracts (`/employees/*`)<br>- Tracking onboarding/offboarding (`/onboarding`, `/offboarding`)<br>- Managing job postings, candidates, interviews & offers (`/recruitment/*`)<br>- Allocating/receiving equipment (`/assets/*`) | - Running & locking monthly payroll (`/payroll/runs`)<br>- Publishing benefit plans & learning courses/certifications (`/benefits/plans`, `/learning/*`)<br>- Auditing workforce health KPIs (`/workspace/hr`) | - Missing UI forms to register candidates directly, issue employee certificates, or receive initial stock for newly created asset catalog items |
| **4. System Administrator** (*Quản trị hệ thống*) | `ADMIN` (`*` / full platform access) | Govern user access, configure multi-step approval workflows, monitor system health, and manage external webhooks | - Managing user accounts & RBAC roles (`/administration/users`, `/administration/roles`)<br>- Reviewing audit trails (`/administration/audit-logs`) | - Configuring dynamic workflows (`/administration/workflows`)<br>- Managing outbound webhooks (`/admin/integrations`)<br>- Checking BullMQ queues & system health (`/monitoring/*`) | - `/admin/integrations` and `/admin/settings` were disconnected from the Administration tab bar and had un-wired configuration buttons |

---

## 3. Comprehensive Capability Matrix

Classification key:
- **Already Supported**: Backend API and frontend UI are both implemented and verified end-to-end.
- **Supported (Frontend Enhancement Needed)**: Backend API is live and tested, but the frontend is missing a form, field, human-readable selector, or action trigger.
- **Partially Supported**: UI exists with local/partial behavior; needs wiring or refinement.

| Domain Capability | Backend Support (`@project/api`) | Frontend Requirement (`apps/web`) | Status | Dependencies & Action Plan |
| --- | --- | --- | --- | --- |
| **Authentication & Session Management** | `/api/v1/auth/*` (login, refresh, logout, password reset, sessions) | Sign-in, password recovery, session revocation in `/account/profile` | **Already Supported** | Verified by `e2e/auth-rbac.spec.ts` |
| **Personal Workspace & HR Executive Hub** | `/api/v1/dashboard/*`, `/api/v1/reports/*` | `/workspace` Bento hub & `/workspace/hr` KPIs/charts | **Already Supported** | Verified by `e2e/workspace-notifications.spec.ts` |
| **Employee 360° Directory & Lifecycle** | `/api/v1/employees/*`, `/contracts`, `/documents`, `/probation`, `/transfers` | `/employees`, Quick-Peek drawer, `/employees/[id]`, lifecycle dialogs | **Already Supported** | Verified by `e2e/workforce-lifecycle.spec.ts` |
| **Organization Structure & Positions** | `/api/v1/departments/*`, `/api/v1/positions/*` | `/organization/departments`, `/organization/chart`, `/organization/positions` | **Already Supported** | Exported hooks reused across modules |
| **Onboarding & Offboarding Checklists** | `/api/v1/onboarding/*`, `/api/v1/offboarding/*` | `/onboarding`, `/onboarding/templates`, `/offboarding`, `/offboarding/[id]` | **Already Supported** | Verified by `e2e/onboarding-tasks.spec.ts` |
| **Attendance & Web Timekeeping** | `/api/v1/attendance/*` (camera/GPS check-in, monthly grid, timesheet, GPS logs) | `/attendance/my-attendance`, `/history`, `/management`, `/summary`, `/analytics`, `/timesheet-editor`, `/gps-logs` | **Already Supported** | Verified by `e2e/attendance-leave-payroll.spec.ts` |
| **Shift Scheduling & Roster** | `/api/v1/shifts/*`, `/api/v1/schedules/*` | `/schedule/my-schedule`, `/calendar`, `/management`, `/roster`, `/requests` | **Already Supported** | Verified by `e2e/attendance-leave-payroll.spec.ts` |
| **Leave Management & Trace Timeline** | `/api/v1/leave-requests/*`, `/leave-balances`, `/leave-policies` | `/leave/requests`, `/leave/approvals`, `/leave/balance`, `/leave/policies` | **Already Supported** | Verified by `e2e/attendance-leave-payroll.spec.ts` |
| **Payroll Runs, Periods & Payslips** | `/api/v1/payroll/*` (periods, runs, calculate, lock, mark-paid, payslips, structures) | `/payroll/dashboard`, `/periods`, `/runs`, `/runs/[id]`, `/payslips`, `/salary-structures` | **Already Supported** | Verified by `e2e/attendance-leave-payroll.spec.ts` |
| **Expense Claims & Reimbursements** | `/api/v1/expenses/*` (create, submit, approve, reject, reimburse) | `/expenses` (`ExpensesView`) | **Already Supported** | Complete CRUD + workflow transitions |
| **Recruitment — Requisitions & Postings** | `/api/v1/recruitment/requisitions/*`, `/postings/*` | `/recruitment/requisitions`, `/recruitment/postings` | **Supported (Frontend Enhancement Needed)** | Replace raw `departmentId` & `requisitionId` UUID inputs with `<Select>` pickers; add status filter in Requisitions |
| **Recruitment — Candidate Applications & CV** | `POST /api/v1/recruitment/applications`, `POST .../cv`, stage transitions | `/recruitment/candidates` (`CandidatesView`) | **Supported (Frontend Enhancement Needed)** | Add "Thêm ứng viên" dialog (`POST /recruitment/applications`) and CV URL attachment dialog (`POST .../cv`); allow selecting posting via dropdown |
| **Recruitment — Interviews & Offers** | `/api/v1/recruitment/interviews/*`, `/offers/*` | `/recruitment/interviews`, `/recruitment/offers` | **Supported (Frontend Enhancement Needed)** | Fix broken `/approvals` link in `offers-view.tsx` $\rightarrow$ `/administration/approval` + add proxy redirect |
| **Performance — Cycles, Reviews & Goals** | `/api/v1/performance/cycles/*`, `/reviews/*`, `/goals/*` | `/performance/cycles`, `/performance/reviews`, `/performance/goals` | **Supported (Frontend Enhancement Needed)** | Fix `goals-view.tsx` hardcoded `'—'` description bug; replace raw `employeeId`/`reviewerId` UUID inputs in `reviews-view.tsx` with employee `<Select>` pickers; gate admin buttons with `performance:manage` |
| **Learning — Courses, Enrollments & Paths** | `/api/v1/learning/courses/*`, `/enrollments/*`, `/assignments`, `/paths/*` | `/learning/courses`, `/learning/paths` | **Supported (Frontend Enhancement Needed)** | Add `estimatedHours` to course creation; display "Khóa học của tôi" enrollments (`GET /learning/enrollments`) with "Hoàn thành" (`POST /learning/enrollments/:id/complete`); add path assignment (`POST /learning/paths/assign`) & completion (`POST /learning/paths/:id/complete`); gate admin buttons with `learning:manage` |
| **Learning — Employee Certifications** | `/api/v1/learning/certifications` (create, issue, list by employee, renew, revoke) | `/learning/certifications` (`CertificationsView`) | **Supported (Frontend Enhancement Needed)** | Add "Cấp chứng chỉ cho nhân viên" (`POST /learning/certifications/issue`) and employee certificate lookup (`GET /learning/certifications/employee/:employeeId`) with Renew/Revoke actions |
| **Benefits — Plans, Enrollments & Dependents** | `/api/v1/benefits/plans/*`, `/enrollments/*`, `POST /api/v1/benefits/dependents` | `/benefits/plans`, `/benefits/enrollments` | **Supported (Frontend Enhancement Needed)** | Add `employerContribution`, `employeeContribution`, and `description` fields to `PlansView` dialog; add "Đăng ký người phụ thuộc" (`POST /benefits/dependents`) dialog in `EnrollmentsView`; gate admin buttons with `benefits:manage` |
| **Asset Management — Catalog, Stock, Requests & Issues** | `/api/v1/assets/catalog`, `/inventory`, `/requests`, `/issues` | `/assets/catalog`, `/assets/inventory`, `/assets/requests`, `/assets/issues` | **Supported (Frontend Enhancement Needed)** | Resolve `assetTypeId` and `employeeId` UUIDs to human-readable names/SKUs; add top-level "Nhập kho thiết bị" dialog in `InventoryView`; add status filter `<Select>` in `RequestsView` |
| **Administration, Webhooks & Settings** | `/api/v1/users`, `/roles`, `/approvals`, `/workflows`, `/audit-logs`, `/integration-hub/webhooks`, `/monitoring/system-health` | `/administration/*`, `/admin/integrations`, `/admin/settings`, `/monitoring/*` | **Partially Supported** | Add Integrations & Settings tabs to `AdministrationLayout`; wire dead "Save" buttons in `/admin/settings` with persisted preferences + toast feedback; wire `/admin/integrations` "Configure" dialog & live health check |

---

## 4. Prioritized Feature & UX Improvements

We rank all identified frontend improvements by **User Value**, **Implementation Effort**, **Dependency Risk**, and **Business Importance**:

| Priority | Improvement | User Value | Effort | Risk | Rationale |
| --- | --- | --- | --- | --- | --- |
| **P0 (Critical)** | Fix broken `/approvals` link in Recruitment Offers + add `/approvals` $\rightarrow$ `/administration/approval` redirect in `proxy.ts` | High | Low | Very Low | Eliminates a hard `404` during offer approval workflows |
| **P0 (Critical)** | Replace raw UUID inputs & table cells across Recruitment, Performance, and Asset Management with human-readable `<Select>` dropdowns and lookup maps | Very High | Medium | Low | Users cannot memorize 36-char UUIDs for departments, requisitions, employees, or asset types |
| **P0 (Critical)** | Fix `performance/components/goals-view.tsx` hardcoded `'—'` description cell | High | Very Low | Very Low | Data already returned by API was hidden by a hardcoded placeholder |
| **P0 (Critical)** | Wire dead/no-op buttons in `/admin/settings` and `/admin/integrations`, and expose Integrations & Settings in `AdministrationLayout` tabs | High | Low | Low | Eliminates dead controls and makes Webhook Subscriptions & System Settings discoverable |
| **P1 (High)** | Complete Recruitment Candidate creation (`POST /recruitment/applications`) & CV attachment (`POST .../cv`) in `candidates-view.tsx` | High | Medium | Low | Allows HR to register candidates and attach CVs directly in the UI |
| **P1 (High)** | Complete Learning workflows: My Enrollments + Complete Course, Issue/Lookup/Renew/Revoke Employee Certifications, Assign/Complete Learning Paths | High | Medium | Low | Unlocks the full LMS lifecycle already built in `@project/api` |
| **P1 (High)** | Complete Benefits workflows: Contribution & description inputs in Plan creation + Dependent registration (`POST /benefits/dependents`) in Enrollments | High | Low | Low | Aligns Plan creation form with table columns and unlocks dependent management |
| **P1 (High)** | Enforce RBAC permission gating (`learning:manage`, `benefits:manage`, `performance:manage`, `assets:manage`) on admin-only mutation buttons | High | Low | Low | Prevents standard employees from seeing management buttons that fail with `403` |
