#!/usr/bin/env node
/**
 * DEPRECATED — use check-direct-db-classified.mjs instead.
 *
 * Architecture guard: enforce that DATABASE_CONNECTION is not directly
 * injected outside the approved allow-list.
 *
 * Approved consumers (system-level, company-scope, infra adapters) may inject
 * DATABASE_CONNECTION directly. Everything else MUST use ScopedDbService.
 *
 * Exit codes:
 *   0 = no violations OR only allow-listed files inject DATABASE_CONNECTION
 *   1 = at least one disallowed file injects DATABASE_CONNECTION
 *
 * Set ALLOW_LEGACY=true to downgrade violations to warnings (used during
 * incremental migration). When ALLOW_LEGACY is unset, the script enforces
 * the allow-list strictly.
 */
import { readFileSync } from "node:fs";
import { resolve, relative } from "node:path";
import { glob } from "glob";




const ROOT = resolve(process.cwd(), "src");

// Files explicitly permitted to inject DATABASE_CONNECTION directly.
// Add new entries with a one-line justification.
const ALLOW_LIST = new Set([
  "core/security/auth/authorization-audit.repository.ts",
  "core/security/roles/roles.repository.ts",
  "infrastructure/security/resource-loader.repository.ts",
  "infrastructure/security/security.repository.ts",
  "modules/analytics/audit-logs/repositories/audit-logs.repository.ts",
  "modules/attendance/overtime/repositories/payroll-lock.repository.ts",
  "modules/chat/repositories/chat.repository.ts",
  "modules/identity/access-control/use-cases/update-user-access-control.usecase.ts",
  "modules/identity/permissions/repositories/permissions.repository.ts",
  "modules/identity/roles/roles-management.repository.ts",
  "modules/integration-hub/integration-hub.repository.ts",
  "modules/platform-approval-engine/repositories/platform-approval-engine.repository.ts",
  "modules/platform-notifications/repositories/platform-notifications.repository.ts",
  "modules/platform-workflow-engine/repositories/platform-workflow-engine.repository.ts",
  "modules/platform-workflow-engine/tasks/repositories/task-workflow.repository.ts",
  "modules/tasks/events/repositories/consumer-idempotency.repository.ts",
  "modules/tasks/events/repositories/task-audit-log.repository.ts",
  "modules/tasks/events/repositories/task-events-metrics.repository.ts",
  "modules/tasks/events/task-event-store.repository.ts",
  "modules/tasks/task-templates/repositories/task-templates.repository.ts",
  "modules/tasks/tasks/notifications/task-notifications.repository.ts",
  "modules/tasks/tasks/repositories/task-activities.repository.ts",
  "modules/tasks/tasks/repositories/task-analytics.repository.ts",
  "modules/tasks/tasks/repositories/task-assignee-performance-report.repository.ts",
  "modules/tasks/tasks/repositories/task-delegations.repository.ts",
  "modules/tasks/tasks/repositories/task-dependencies.repository.ts",
  "modules/tasks/tasks/repositories/task-idempotency.repository.ts",
  "modules/tasks/tasks/repositories/task-recurrence.repository.ts",
  "modules/tasks/tasks/repositories/task-sla.repository.ts",
  "modules/tasks/tasks/repositories/tasks-transactions.repository.ts",
  "modules/tasks/tasks/repositories/tasks.repository.ts",
  "modules/organization/departments/repositories/departments.repository.ts",
  "modules/organization/positions/repositories/positions.repository.ts",
  "modules/organization/locations/repositories/locations.repository.ts",
  "modules/scheduling/shifts/repositories/workforce-shifts.repository.ts",
  "modules/leave/leave-admin/repositories/leave-admin.repository.ts",
  "modules/leave/leave-management/repositories/leave-requests.repository.ts",
  "modules/workforce/employee-assignments/repositories/employee-site-assignments.repository.ts",
  "modules/workforce/gps-logs/repositories/gps-logs.repository.ts",
  "modules/workforce/employee-contracts/repositories/employee-contracts.repository.ts",
  // Provider itself.
  "infrastructure/database/database.provider.ts",
  "infrastructure/database/database.module.ts",
  "infrastructure/database/scoped-db.service.ts",
  "infrastructure/database/database-shutdown.service.ts",
  // System-level: outbox, durable bus, file storage — company-scope by design.
  "core/events/event-outbox.repository.ts",
  "core/events/redis-durable-event-bus.service.ts",
  "core/events/handlers/employee-created.handler.ts",
  "infrastructure/storage/file-access.service.ts",
  "infrastructure/storage/pending-finalize.service.ts",
  "infrastructure/storage/storage-reconcile.service.ts",
  "infrastructure/storage/storage.service.ts",
  "infrastructure/storage/file.repository.ts",
  "infrastructure/storage/scan-queue.service.ts",
  "infrastructure/storage/image-processing.service.ts",
  "infrastructure/storage/processors/image-processor.processor.ts",
  "infrastructure/storage/retention-cleanup.service.ts",
  // Cross-bounded-context adapters.
  "contracts/adapters/workforce-time-management.adapter.ts",
  "contracts/adapters/time-management-payroll.adapter.ts",
  "infrastructure/security/audit-log.adapter.ts",
  // App bootstrap / health infrastructure.
  "app/app.controller.ts",
  "app/main.ts",
  "infrastructure/database/database-health.indicator.ts",
  // Pilot repos: extend ScopedRepository AND inject ScopedDbService.
  // Still need raw DATABASE_CONNECTION for direct `db.query.*` until a
  // wrapper API is built. Company scope is enforced at the helper layer.
  "infrastructure/queries/dashboard.query.ts",
  "infrastructure/idempotency/idempotency.repository.ts",
  "modules/payroll/payroll-runs/repositories/payroll-runs.repository.ts",
  "modules/payroll/payslips/repositories/payslips.repository.ts",
  "modules/payroll/salary-structures/repositories/salary-structures.repository.ts",
  "modules/attendance/attendances/repositories/attendances.repository.ts",
  // Migrated batch #1: now use scoped repository helpers.
    "modules/workforce/employees/repositories/employee-read.repository.ts",
"modules/workforce/employees/repositories/employees.repository.ts",
  "modules/workforce/employees/repositories/employee-document.repository.ts",
  "modules/workforce/employees/repositories/employee-certification.repository.ts",
  "modules/workforce/employees/repositories/employee-equipment.repository.ts",
  "modules/identity/users/repositories/users.repository.ts",
  // Auth flow runs before request scope binding (login/refresh). Refresh tokens
  // are keyed by userId only; approved system-scope access.
  "modules/identity/auth/repositories/auth.repository.ts",
  // Monitoring is system-scope by design: health/data-integrity checks and audit activity reads.
  "modules/monitoring/activity-monitor/repositories/activity.repository.ts",
  "modules/monitoring/data-integrity/repositories/data-integrity.repository.ts",
  "modules/monitoring/system-health/repositories/system-health.repository.ts",
  // Migrated batch #2.
  "modules/payroll/payroll/repositories/payroll.repository.ts",
  "modules/payroll/payroll-periods/repositories/payroll-periods.repository.ts",
  "modules/attendance/timekeeping/repositories/attendance-timekeeping.repository.ts",
  // Migrated batch #3.
  "modules/attendance/overtime/repositories/overtime.repository.ts",
  "modules/attendance/attendance-summaries/repositories/attendance-summaries.repository.ts",
  "modules/scheduling/schedules/repositories/schedules.repository.ts",
  // Migrated batch #6: legacy bi-temporal repos + workflow-engine.

  "modules/platform-workflow-engine/tasks/workflow-engine.ts",
  "integration/leave-approval/leave-trace.repository.ts",
  "integration/leave-approval/approval-inbox.repository.ts",
  "infrastructure/repositories/event-idempotency.repository.ts",
  "contracts/adapters/reconciliation-attendance-reader.adapter.ts",
  "modules/reconciliation/repositories/attendance-violations.repository.ts",
  "modules/workforce/employees/services/education-aggregation.service.ts",
  "modules/workforce/employees/repositories/employee-education.repository.ts",
  "modules/identity/users/use-cases/get-user-security.usecase.ts",
  "modules/identity/auth/use-cases/sso-login.usecase.ts",
  "modules/identity/auth/use-cases/revoke-user-session.usecase.ts",
  "modules/identity/auth/use-cases/list-user-sessions.usecase.ts",
  "modules/identity/auth/use-cases/list-security-timeline.usecase.ts",
  "modules/identity/auth/use-cases/list-login-history.usecase.ts",
  "modules/identity/auth/use-cases/link-email.usecase.ts",
  "modules/identity/auth/services/authorization-version.service.ts",
  "modules/attendance/attendances/use-cases/get-employees-presence.usecase.ts",
  "modules/attendance/attendances/repositories/attendance-session.repository.ts",
  "integration/recruitment-approval/recruitment-approval.listener.ts",
  "integration/recruitment-approval/recruitment-approval-link.repository.ts",
  "integration/recruitment-approval/recruitment-approval-integration.handler.ts",
  "integration/payroll-approval/payroll-decision.handler.service.ts",
  "integration/asset-approval/asset-approval.listener.ts",
  "integration/asset-approval/asset-approval-link.repository.ts",
  "integration/asset-approval/asset-approval-integration.handler.ts",
  "contracts/adapters/payroll-period-reader.adapter.ts",
  "contracts/adapters/leave-reader.adapter.ts",
  "contracts/adapters/employee-shift-reader.adapter.ts",
  "contracts/adapters/attendance-summary-writer.adapter.ts",
  "modules/workforce/documents/repositories/document-query.repository.ts",
  "modules/asset-management/issue/subscribers/employee-terminated.subscriber.ts",
  "modules/workforce/contracts/repositories/contract-query.repository.ts",
]);

// Files currently injecting DATABASE_CONNECTION but NOT yet migrated.
// Listed here as "tolerated debt" so CI does not break the world. Each entry
// SHOULD be removed (i.e. file migrated) over time. Once empty, switch
// `ALLOW_LEGACY` default to false.
const LEGACY_DEBT = new Set([
  "shared/context/trace-exporter.service.ts",
  "shared/context/trace-analytics.service.ts",
  "shared/context/trace-aggregator.service.ts",
  "shared/context/incident-intelligence.service.ts",
  "shared/context/auto-response.service.ts",
  "shared/context/anomaly-detection.service.ts",
  "integration/leave-approval/leave-trace.service.ts",
  "integration/leave-approval/leave-approval.listener.ts",
  "integration/leave-approval/leave-approval-link.repository.ts",
  "integration/leave-approval/leave-approval-integration.handler.ts",
  "integration/leave-approval/approval-inbox.service.ts",
  "core/events/event-dlq.controller.ts",
  "modules/leave/subscribers/employee-lifecycle.subscriber.ts",
  "modules/attendance/subscribers/employee-lifecycle.subscriber.ts",
  "modules/workforce/employee-timeline/providers/system-event.provider.ts",
  "modules/workforce/employee-timeline/providers/status-event.provider.ts",
  "modules/workforce/employee-timeline/providers/position-event.provider.ts",
  "modules/workforce/employee-timeline/providers/contract-event.provider.ts",
  "modules/workforce/employees/use-cases/list-employee-status-history.usecase.ts",
  "modules/tasks/tasks/repositories/my-task-summary.repository.ts",
  "modules/scheduling/schedule-core/use-cases/replace-requirements.usecase.ts",
  "modules/scheduling/schedule-core/repositories/schedule.repository.ts",
  "modules/scheduling/requests/repositories/schedule-requests.repository.ts",
  "modules/scheduling/qualifications/repositories/employee-qualifications.repository.ts",
  "modules/payroll/interfaces/event-subscribers/employee-terminated.subscriber.ts",
  "modules/identity/access-control/handlers/employee-lifecycle.handler.ts",
  "modules/attendance/timekeeping/use-cases/override-attendance-summary.usecase.ts",
  "modules/attendance/attendance-summaries/read-model/attendance-summary-read.service.ts",
  "infrastructure/monitoring/system-health/repositories/system-health.repository.ts",
  "infrastructure/monitoring/data-integrity/repositories/data-integrity.repository.ts",
  "infrastructure/monitoring/activity-monitor/repositories/activity.repository.ts",
  "modules/scheduling/shifts/schedule-roster/services/coverage.service.ts",
  "modules/scheduling/shifts/schedule-roster/repositories/workforce-shifts.repository.ts",
  "modules/workforce/contracts/repositories/contract-query.repository.ts",
]);

const allowLegacy = process.env.ALLOW_LEGACY !== "false";

const files = await new Promise((resolvePromise, rejectPromise) => {
  glob(
    "**/*.ts",
    {
      cwd: ROOT,
      absolute: true,
      ignore: ["**/*.spec.ts", "**/*.test.ts", "**/*.d.ts"],
    }
  ).then(resolvePromise).catch(rejectPromise);
});

const violations = [];
const legacy = [];

for (const file of files) {
  const src = readFileSync(file, "utf8");
  if (!src.includes("DATABASE_CONNECTION")) continue;
  // Filter to actual injections, not type-only imports.
  if (
    !/@Inject\(\s*DATABASE_CONNECTION\s*\)/.test(src) &&
    !/inject:\s*\[[^\]]*DATABASE_CONNECTION/.test(src)
  ) {
    continue;
  }
  const rel = relative(ROOT, file).replaceAll("\\", "/");
  if (ALLOW_LIST.has(rel)) continue;
  if (LEGACY_DEBT.has(rel)) {
    legacy.push(rel);
    continue;
  }
  violations.push(rel);
}

if (legacy.length) {
  console.log(
    `[arch:db-access] ${legacy.length} legacy direct DATABASE_CONNECTION injections (tolerated debt):`,
  );
  for (const f of legacy) console.log(`  - ${f}`);
}

if (violations.length) {
  console.error(
    `\n[arch:db-access] ${violations.length} NEW direct DATABASE_CONNECTION injections (not allow-listed and not legacy):`,
  );
  for (const f of violations) console.error(`  - ${f}`);
  console.error(
    "\nFix: inject ScopedDbService instead, OR add file to ALLOW_LIST in scripts/check-direct-db-access.mjs with justification.",
  );
  process.exit(1);
}

if (!allowLegacy && legacy.length) {
  console.error(
    `\n[arch:db-access] ALLOW_LEGACY=false: ${legacy.length} legacy debt entries must be migrated.`,
  );
  process.exit(1);
}

console.log("[arch:db-access] OK");



