# ADR-001: Canonical RBAC Permission Resolution & Scope Isolation Across HRMS Bounded Contexts

## Status
Accepted

## Date
2026-10-19

## Context
During Phase 0 reconnaissance of `btn-hrms`, we audited all 77 backend controllers (`apps/api/src/modules/`) and 37 frontend routes (`apps/web/src/app/`) against the canonical permission catalog in `@project/permissions` (`packages/permissions/src/modules/`).

We identified four classes of authorization defects where modules bypassed `@project/permissions` constants or hierarchical resolution:
1. **Unregistered Permission Strings (`PlatformNotificationsController`)**: Endpoints required `"manage:platform"`, `"notifications:preferences:view:self"`, and `"notifications:preferences:edit:self"`, none of which exist in `@project/permissions` (`notifications:manage:all` and `notifications:view:self` are the canonical codes). As a result, regular employees received `403 Forbidden` when viewing/updating their notification preferences, and notification admins without `sys:all` were blocked from template management.
2. **Raw Array `.includes()` on Non-Existent Permission (`ScheduleRequestsController`)**: `GET /schedule-requests` checked `req.user.permissions?.includes("schedule:manage")`. Because `"schedule:manage"` is not in `@project/permissions` and `.includes()` bypasses `hasPermission()` (ignoring `sys:all` and scope hierarchies), HR/Admin users had their queries forcibly restricted to their own `employeeId`, while non-HR users without an `employeeId` fell through with `filters.employeeId = undefined` (leaking all schedule requests).
3. **Unscoped Company-Wide Aggregation (`DashboardController.getAttendanceStats`)**: `GET /dashboard/attendance-stats` was protected only by `AttendancePolicies.view` (satisfied by `attendance:view:self`), exposing company-wide headcount, department breakdowns, and attendance exception counts to any self-service employee.
4. **Horizontal Scope Leakage in Performance Queries (`PerformanceController`)**: `GET /performance/cycles/:cycleId/goals` and `GET /performance/cycles/:cycleId/reviews/summary` only checked `performance:view` without enforcing `employeeId === req.user.employeeId` when the caller lacks `performance:manage`.

## Decision
1. **Single Source of Truth (`@project/permissions`)**: Every `@RequirePermission` decorator, policy handler, and seed script MUST use canonical constants from `@project/permissions` (`Permissions.*` and `ALL_PERMISSIONS`).
2. **Hierarchical Evaluation (`hasPermission` / `PolicyService`)**: Controllers and use-cases must never call `req.user.permissions?.includes(...)` directly for authorization decisions. All checks must use `hasPermission()` from `@project/permissions` or `PolicyService` so `sys:all` and scope hierarchies (`all > company > department > self`) are honored.
3. **Fail-Closed Self-Scope Isolation**: Whenever an endpoint supports both manager/HR access (`*:all` / `*:department` / `*:manage`) and employee self-service (`*:self` / `*:view`), callers who only hold self-scoped permissions MUST have their `employeeId` filter forcibly bound to `req.user.employeeId`. If `req.user.employeeId` is missing for a self-scoped caller, the endpoint MUST fail closed with `403 Forbidden` (`throwForbidden`) rather than returning unscoped records.

## Alternatives Considered

### Alternative A: Add legacy alias strings (`"manage:platform"`, `"schedule:manage"`) to `@project/permissions`
- **Pros**: Requires fewer controller edits.
- **Cons**: Pollutes the permission catalog with redundant, non-standard permission codes that do not match the `<module>:<action>:<scope>` taxonomy or the frontend route registry.
- **Rejected**: Aligning controllers to canonical `@project/permissions` constants preserves a clean, auditable RBAC matrix.

### Alternative B: Restrict `GET /dashboard/attendance-stats` exclusively to `attendance:view:all`
- **Pros**: Simple single-permission check.
- **Cons**: Blocks department managers (`attendance:view:department` or `attendance:report`) from viewing attendance statistics.
- **Rejected**: Allowing `attendance:report`, `attendance:view:all`, or `attendance:view:department` (and scoping to the manager's department when the caller only has `attendance:view:department`) supports both HR and department managers while blocking `attendance:view:self` escalation.

## Consequences
- Regular employees (`notifications:view:self`) can read and update their own notification preferences, while template administration is properly gated by `notifications:manage:all` on both API and UI.
- Schedule requests, performance goals/reviews, and attendance analytics enforce fail-closed RBAC boundaries.
- Fresh database seeds (`seed.ts`) automatically register every permission defined in `@project/permissions`.
