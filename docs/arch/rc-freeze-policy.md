# RC-1 Architecture Freeze Policy

**Date:** 2026-07-29  
**Scope:** Attendance, Payroll, and Platform integration contracts  

## Classification Rules

Every proposed change during the RC phase must be classified as:

### ALLOWED (No review required for small changes)

| Category | Examples |
|----------|----------|
| Bug fix | Snapshot reads wrong field; correction state machine missing transition |
| Performance | Query optimization, index addition, batch size tuning |
| Test addition | Missing coverage for period close, reconciliation edge cases |
| Observability | Logging, metrics, health endpoint enhancement |
| Documentation | Readme, ADR updates, architecture description sync |
| Dead code removal | Unused methods, deprecated imports, commented blocks |

### ALLOWED (Requires RC lead approval)

| Category | Examples |
|----------|----------|
| Port extension | Adding a query method to an existing port interface |
| Event addition | New domain event for an existing state transition |
| Schema addition | New index on existing table, adding nullable column |
| Migration fix | Correcting a schema migration that fails on upgrade |

### NOT ALLOWED (Bypasses RC freeze)

| Category | Examples |
|----------|----------|
| New truth model | Second attendance resolution path, alternative payroll input |
| New consumption path | Payroll bypassing snapshot, attendance writing to payroll tables |
| Mutable history | `UPDATE` on posted payroll, `UPDATE` on closed snapshot |
| Cross-domain shortcut | Direct `schema.payrollItems` query from attendance (V1) |
| Contract redesign | Changing port interface signature, removing event fields |
| Feature addition | New attendance workflow, new payroll calculation rule |

## Current Accepted Debt

| ID | Description | Risk | Remediation | Target |
|----|-------------|------|-------------|--------|
| V1 | `attendance-timekeeping.repository.ts` queries `schema.payrollItems` directly for reconciliation | Low — read-only, bounded to reconciliation service | Create `IPayrollResultReader` port + adapter | RC-2 or RC-3 |

## Process

1. All RC-phase PRs must label themselves with `[RC-safe]`, `[RC-approval]`, or `[RC-blocked]`
2. Any change classified as NOT ALLOWED must be rejected at review
3. Accepted debt must be documented with risk assessment and remediation target
