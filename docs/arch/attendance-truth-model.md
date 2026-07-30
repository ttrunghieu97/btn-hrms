# Attendance Truth Model

**Status:** Final (Sprint 1 Complete)  
**Date:** 2026-07-29  
**Context:** Sprint 0 Business Workflow Audit + Platform Capability Mapping  
**Applies ADR-007:** Rules #5 (SSOT), #6 (Published Contracts), #7 (One Owner per Value)

---

## 1. What Is Attendance Truth?

Attendance Truth is the **resolved, final value** of an employee's attendance for a given work date, after applying all policies, computations, overrides, and exception resolutions.

**Attendance Truth is NOT:**

- Raw clock events (these are inputs)
- Unresolved daily summaries (policies applied but overrides not yet merged)
- Payroll-derived values (salary, deductions — owned by Payroll)

### Core Invariant (S1-1)

> **`EffectiveAttendanceSummary` is the ONLY definition of Resolved Attendance Truth.**
>
> Every other artifact (snapshots, events, payroll inputs, analytics models) is
> merely a **publication** or **consumption** of that truth.
>
> No module may derive, calculate, or redefine Attendance Truth from raw data.

### Truth → Publication → Consumption Chain

```
                        Attendance Truth
                              │
              EffectiveAttendanceSummary
          (AttendanceSummaryReadService)
                              │
                    ┌─────────┼─────────┐
                    │         │         │
               Snapshot    Events     Ports
            (publication) (stream)  (query)
                    │         │         │
               immutable   async     sync
                    │         │         │
               Payroll    Analytics  Workflow
               consumes   consumes   consumes
                    │         │         │
               DONE       DONE       DONE
```

- **Truth** is owned and resolved by `AttendanceSummaryReadService` only
- **Publication** is a frozen copy of truth at a point in time
- **Consumption** reads truth; never derives or recalculates it

### Invariant: Derivation vs Transformation

> **Attendance Truth may be transformed, but it may never be re-derived.**

- **Transformation** (allowed): resolvedMinutes → payrollHours (unit conversion);
  resolvedTruth → snapshot (immutable copy)
- **Derivation** (forbidden): raw `attendances` → calculateMinutes() → snapshot.
  This bypasses the precedence chain and may produce different results.

### Two Publication Models

```
Attendance Truth
        │
        ├── LIVE ─────── EffectiveAttendanceSummary ──── Correction, Analytics, UI
        │                  (always current, sync query)
        │
        └── SNAPSHOT ── timesheetSnapshots ──────────── Payroll, Settlement
                           (immutable, versioned, frozen at period close)
```

| Model | Freshness | Consumer |
|-------|-----------|----------|
| LIVE | Always current (latest resolved) | Correction, Analytics, UI |
| SNAPSHOT | Frozen at period close | Payroll, Settlement, Reports |

### One Authority

```
WRONG — three authorities:

  TimesheetSnapshotService    ⇢  derives truth (BUG — base summaries only)
  TimeManagementPayrollAdapter ⇢  derives truth (BUG — raw clock events)
  AttendanceSummaryReadService ⇢  derives truth (CORRECT)

RIGHT — one authority:

  AttendanceSummaryReadService ⇢  owns truth
  TimesheetSnapshotService     ⇢  consumes truth from ReadService
  TimeManagementPayrollAdapter ⇢  consumes truth from ReadService
```

---

## 2. Truth Precedence Chain

```
Raw Clock Events (attendances table)
        │
        ▼
Time Calculation Service (compute())
        │
        ▼
Attendance Policies (grace period, late rule, early leave, OT)
        │
        ▼
Daily Summary (attendanceDailySummaries table)
  - status
  - workedMinutes / breakMinutes / lateMinutes
  - earlyLeaveMinutes / overtimeMinutes
  - anomalyFlags
        │
        ▼
Exception Detection (attendanceExceptions table)
  - missing_punch, invalid_sequence, off_shift
  - Status: pending → resolved / closed
        │
        ▼
HR Override (attendanceSummaryOverrides table)
  - overriddenStatus
  - overriddenWorkedMinutes
  - overriddenLateMinutes / overriddenEarlyLeaveMinutes
  - overriddenOvertimeMinutes
  - Reason: manual_correction / policy_exception / data_fix / reconciliation
        │
        ▼
Exception State Aggregation (derived from exceptions join)
  - "none" | "pending" | "resolved" | "closed"
        │
        ▼
RESOLVED ATTENDANCE TRUTH
  (EffectiveAttendanceSummary / AttendanceSummaryWithOverride)
        │
        ▼
Attendance Snapshot (timesheetSnapshots table)
  - Immutable freeze of resolved truth at a point in time
```

### Precedence Rules

| Level | Wins Over | Rule |
|-------|-----------|------|
| Override | Summary, Computation, Raw events | Override replaces the corresponding field entirely |
| Exception state | Individual exception status | Highest-pending exception determines state: pending > resolved > closed > none |
| Resolved calculation | Base summary | `resolvedX = override?.overriddenX ?? base.x` |
| Snapshot | Live data | Once period closed, snapshot is authoritative; live data may diverge |

### Current Implementation (mergeOverride in AttendanceSummaryReadService)

The `mergeOverride()` function implements correct precedence:

```typescript
resolvedStatus:              override?.overriddenStatus ?? base.status
resolvedWorkedMinutes:       override?.overriddenWorkedMinutes ?? (base.workedMinutes ?? 0)
resolvedLateMinutes:         override?.overriddenLateMinutes ?? (base.lateMinutes ?? 0)
resolvedEarlyLeaveMinutes:   override?.overriddenEarlyLeaveMinutes ?? (base.earlyLeaveMinutes ?? 0)
resolvedOvertimeMinutes:     override?.overriddenOvertimeMinutes ?? (base.overtimeMinutes ?? 0)
```

**Override is optional.** If no override exists, resolved = base summary.

---

## 3. Snapshot Semantics

### Current Behavior

`TimesheetSnapshotService.createSnapshotForPeriod()` reads `attendanceDailySummaries` directly:

```typescript
const summaries = await db.select()
  .from(schema.attendanceDailySummaries)
  .where(/* period range */);
```

**BUG:** Snapshot reads base values only. Does NOT join `attendance_summary_overrides`.

If HR applied an override before period close, snapshot records the **unresolved** value — violating Rule #5 (Attendance owns truth; snapshot must be truth).

### Required Fix

Snapshot service must read **resolved values** via `AttendanceSummaryReadService.getEffectiveSummaries()` — which applies `mergeOverride()` — instead of querying `attendanceDailySummaries` directly.

### Snapshot Invariants (Target)

```
IF snapshot exists for period P, employee E
THEN snapshot is the authoritative Attendance Truth for E in P

Snapshot MUST contain:
  - resolvedStatus (override-aware)
  - resolvedWorkedMinutes (override-aware)
  - resolvedLateMinutes (override-aware)
  - resolvedEarlyLeaveMinutes (override-aware)
  - resolvedOvertimeMinutes (override-aware)
  - workingDays (override-aware)
  - periodStatusAtSnapshot (immutable provenance)

Snapshot MUST NOT contain:
  - pending corrections (not yet approved)
  - partially resolved values
  - unresolved exceptions (exceptionState != "pending" — must be resolved)

Snapshot MUST be:
  - Immutable (no UPDATE after creation)
  - Versioned (snapshotVersion increments on re-snapshot)
  - Reproducible (same inputs + same period → same snapshot)
```

---

## 4. Publication Contract Matrix

### Invariant

> **Attendance publishes Truth. Consumers choose how to consume it.**
>
> Publications must never be designed for a single consumer.

### Three Publication Models

| Model | Contract | Semantics | Consumer |
|-------|----------|-----------|----------|
| **LIVE** | `AttendanceReadPort` | Always-current resolved truth, sync query | Correction, Analytics, UI |
| **SNAPSHOT** | `AttendanceSnapshotPort` | Immutable frozen truth, period-centric, versioned | Payroll, Settlement, Reports |
| **EVENT** | `AttendanceEventPort` | Async notification of truth changes | Workflow, Notifications, Integrations |

### Contract: `AttendanceReadPort` (LIVE — exists, correct)

```typescript
interface AttendanceReadPort {
  getEffectiveDailySummaries(
    employeeIds: string[],
    startDate: string,
    endDate: string,
  ): Promise<EffectiveAttendanceSummary[]>;
}
```

Truth: `EffectiveAttendanceSummary` (resolved via `mergeOverride`)
Status: ✅ Already correct. No changes needed in S1.

### Contract: `AttendanceSnapshotPort` (SNAPSHOT — proposed, frozen)

```typescript
interface AttendanceSnapshotPort {
  /** Publish snapshot for a period. Returns snapshot metadata. */
  publishPeriodSnapshot(period: string): Promise<SnapshotPublication>;

  /** Get snapshot publication metadata for a period. */
  getPeriodPublication(period: string): Promise<SnapshotPublication | null>;

  /** Get snapshot data for one employee in a period. */
  getEmployeePublication(
    period: string,
    employeeId: string,
  ): Promise<EmployeeSnapshot | null>;

  /** List all employee snapshots in a period (batch ingestion). */
  getPeriodEmployeeSnapshots(period: string): Promise<EmployeeSnapshot[]>;
}

type SnapshotPublication = {
  period: string;
  version: number;
  status: string;           // closed | reopened
  employeeCount: number;
  publishedAt: string;
  periodStatusAtSnapshot: string;
};

type EmployeeSnapshot = {
  period: string;
  employeeId: string;
  version: number;
  workingDays: number;
  workedMinutes: number;
  lateMinutes: number;
  earlyLeaveMinutes: number;
  overtimeMinutes: number;
};
```

Design principles:
- **Period-centric** — primary lookup is by period, not employee
- **Consumer-agnostic** — no Payroll-specific fields; only resolved attendance truth
- **Immutable** — no update methods on reader interface
- **Versioned** — publication metadata includes version

### Contract: `AttendanceEventPort` (EVENT — proposed, frozen)

```typescript
interface AttendanceEventPort {
  /** Subscribe to attendance domain events. */
  onAttendanceCorrected(handler: (event: AttendanceCorrectedEvent) => void): void;
  onPeriodClosed(handler: (event: PeriodClosedEvent) => void): void;
  onPeriodPublished(handler: (event: PeriodPublishedEvent) => void): void;
}
```

Events (S1 scope, conservative — 4 events only):

| Event | Payload | When |
|-------|---------|------|
| `AttendanceCheckedEvent` | ✅ EXISTS | Check-in/out |
| `TimesheetPeriodClosedEvent` | ✅ EXISTS | Period closed |
| `AttendanceCorrectedEvent` | ❌ NEW | Override applied after snapshot |
| `AttendancePublishedEvent` | ❌ NEW | Period published (HR review complete) |

### Existing Contract Inventory (Pre-S1)

| Contract | Type | Resolved? | Consumer | Status |
|----------|------|-----------|----------|--------|
| `AttendanceReadPort.getEffectiveDailySummaries()` | LIVE | ✅ Yes | Payroll Path A | ✅ Active |
| `AttendanceSummariesReaderPort` | LIVE | ❌ No (base only, `unknown`) | Unknown | ⚠️ Weak type — fix in S2 |
| `TimesheetPeriodClosedEvent` | EVENT | N/A | No subscriber | ❌ Must wire in S1-4 |
| `AttendanceCheckedEvent` | EVENT | N/A | Logging only | ⚠️ Underutilized |

### Path B — Architectural Violation

```typescript
// TimeManagementPayrollAdapter — reads raw attendances table
// Derives truth instead of consuming published truth
// Violates: Rule #5 (SSOT), Rule #6 (Published Contracts), Rule #7 (One Owner)
// Status: ❌ ACTIVE — must be killed in S1-4
```

---

## 5. Who Owns What

| Value | Owner | Source of Truth |
|-------|-------|-----------------|
| Clock events (check_in/out) | Attendance | `attendances` table |
| Daily summary (base) | Attendance | `attendanceDailySummaries` table |
| Exceptions (detected) | Attendance | `attendanceExceptions` table |
| Overrides (HR corrections) | Attendance | `attendanceSummaryOverrides` table |
| **Resolved Attendance Truth** | **Attendance** | `mergeOverride(base, override)` |
| Snapshot (frozen truth) | Attendance | `timesheetSnapshots` table |
| Salary, deductions | Payroll | Payroll tables |
| Settlement | Payroll | Payroll tables |
| Approval states | Approval Engine | Approval tables |
| Workflow states | Workflow Engine | Workflow tables |

**Boundary: Payroll may NOT derive attendance truths.**

---

## 6. Identified Gaps

| # | Gap | Impact | Severity | Status |
|---|-----|--------|----------|--------|
| 1 | Snapshot reads base summaries, ignores overrides | Payroll consumes unresolved truth | **P0 (data integrity)** | ✅ **Fixed S1-4 PR-1** — reads resolved truth |
| 2 | `IAttendanceSummariesReader` returns `unknown` — no resolved type | Consumers interpret raw data differently | P3 | ✅ **Fixed S1-4 PR-4** — typed as `AttendanceSummaryRecord` |
| 3 | `timesheetSnapshots` has zero consumers | Payroll cannot consume snapshots | P0 | ✅ **Fixed S1-4 PR-2** — Path B killed, snapshot is only path |
| 4 | `TimeManagementPayrollAdapter` reads raw `attendances` table | Path B produces different numbers than Path A | **P0 (data integrity)** | ✅ **Fixed S1-4 PR-2** — deleted |
| 5 | `TimesheetPeriodClosedEvent` has no payroll subscriber | Payroll runs unaware of period closure | P1 | ✅ **Fixed S1-4 PR-3** — subscriber registered |
| 6 | No delta/correction event for post-snapshot changes | Retroactive correction cannot trigger payroll reconcile | P1 | 🔲 Sprint 2 |
| 7 | `AttendanceCheckedHandler` only logs | No analytics or notification subscribers | P2 | 🔲 Sprint 3 |

---

## 7. Reconciliation Semantics (Target)

### Normal Flow

```
Period ends
  → HR reviews & closes period
    → TimesheetSnapshotService.createSnapshotForPeriod()
      → snapshot uses resolved truth (override-aware) ← FIX NEEDED
        → TimesheetPeriodClosedEvent published
          → Payroll subscriber receives event
            → Payroll reads timesheetSnapshots
              → Payroll runs
                → Payroll posted
```

### Retroactive Correction Flow

```
After period closed / payroll posted:
  → HR applies override to summary
    → AttendanceCorrectedEvent published
      → Payroll subscriber:
        → IF payroll not yet posted → auto-reconcile
        → IF payroll posted → flag for manual review
```

### Snapshot Re-creation (Re-open)

```
Period reopened:
  → TimesheetSnapshotService.createSnapshotForPeriod()
    → snapshotVersion increments
    → Old snapshot preserved (audit trail)
    → New snapshot contains resolved truth at re-close time
```

---

## 8. Current Implementation Scorecard

| Component | Correct? | Detail |
|-----------|----------|--------|
| Check-in pipeline | ✅ Yes | Pipeline validation → persist → recompute |
| `AttendanceTimeCalculationService.compute()` | ✅ Yes | Policy-driven computation |
| `RecomputeAttendanceDayUseCase` | ✅ Yes | Orchestrates compute + exception detect + upsert |
| `attendanceDailySummaries` base values | ✅ Yes | Computed correctly |
| `attendanceSummaryOverrides` | ✅ Yes | Non-destructive patch layer |
| `mergeOverride()` precedence | ✅ Yes | Override > Summary |
| `AttendanceReadPort.getEffectiveDailySummaries()` | ✅ Yes | Returns resolved truth |
| `timesheetSnapshots` | ❌ **BUG** | Ignores overrides |
| `IAttendanceSummariesReader` | ⚠️ Weak type | Returns `unknown` |
| `TimeManagementPayrollAdapter` (Path B) | ❌ **BUG** | Raw clock events, naive calc |
| `AttendanceCheckedHandler` | ⚠️ Only logs | No downstream subscribers |
| `TimesheetPeriodClosedEvent` handler | ❌ Missing | No payroll consumer |

---

## 9. Sprint 1 Plan (Frozen)

### S1-1 (Truth Audit) — ✅ DONE
- [x] Truth precedence chain documented
- [x] Core invariant: `EffectiveAttendanceSummary` is ONLY truth definition
- [x] Truth → Publication → Consumption chain defined
- [x] Gaps identified and prioritized

### S1-2 (Truth Publication Model) — ✅ DONE
- [x] **Q1: Who owns resolved Attendance Truth?** → **Attendance Domain**, published via `EffectiveAttendanceSummary`
- [x] **Q2: Who publishes Attendance Truth?** → `AttendanceSummaryReadService.getEffectiveSummaries()` as **LIVE** model; `TimesheetSnapshotService` as **SNAPSHOT** model
- [x] **Q3: May anyone derive Attendance Truth?** → **NO.** Transformation allowed; derivation forbidden
- [x] **Q4: Who consumes LIVE truth?** → Correction, Analytics, UI (sync query via `AttendanceReadPort`)
- [x] **Q5: Who consumes IMMUTABLE truth?** → Payroll, Settlement (snapshot, event-triggered)
- [x] **Invariant frozen:** Truth may be transformed, never re-derived
- [x] **Invariant frozen:** Two publication models (LIVE + SNAPSHOT) with distinct consumers

### S1-3 (Publication Contracts) — ✅ DONE
- [x] **3-contract publication matrix frozen**: LIVE (`AttendanceReadPort`) + SNAPSHOT (`AttendanceSnapshotPort`) + EVENT (`AttendanceEventPort`)
- [x] **`AttendanceReadPort`** — frozen as-is (no changes needed in S1)
- [x] **`AttendanceSnapshotPort`** — frozen (period-centric, consumer-agnostic, immutable)
- [x] **`AttendanceEventPort`** — frozen (4 events, 2 existing + 2 new)
- [x] **Path B** — documented as architectural violation (to kill in S1-4)
- [x] **SNAPSHOT invariant frozen**: Publications never designed for single consumer
- [x] **`IAttendanceSummariesReader`** — deferred to S2 (weak return type, not blocking S1-4)

### S1-4 (Payroll Bridge) — ✅ COMPLETE
- [x] **PR-1**: Snapshot reads resolved truth (via `AttendanceReadPort` + `timekeepingRepo`) — ✅
- [x] **PR-2**: Path B deleted — `TimeManagementPayrollAdapter`, port, ACL removed — ✅
- [x] **PR-2**: Payroll now consumes ONLY immutable snapshots — ✅
- [x] **PR-3**: `TimesheetPeriodClosedEvent` → payroll subscriber wired (fact-only, no orchestration) — ✅
- [x] **PR-4**: `IAttendanceSummariesReader` typed as `AttendanceSummaryRecord` — ✅
- [x] **PR-4**: Forbidden paths documented — ✅

### Scorecard After Sprint 1

| Component | Before | After |
|-----------|--------|-------|
| Snapshot source | Base summaries (overrides ignored) | **Resolved truth (override-aware)** |
| Payroll Path A | `AttendanceReadPort` + `payPolicy.evaluate()` | ✅ Kept (was correct) |
| Payroll Path B | Raw `attendances` DB + naive heuristic | ✅ **Deleted** |
| ACL (`attendance_hours`, `overtime_hours`) | Duplicate/incorrect line items | ✅ **Deleted** |
| Payroll consumption | 2 parallel paths → inconsistent numbers | **1 immutable path → consistent** |
| `TimesheetPeriodClosedEvent` | No subscriber | **Payroll subscriber registered** |
| `IAttendanceSummariesReader` | Returns `unknown` | **Returns `AttendanceSummaryRecord`** |
| Attendance emits commands? | Not applicable | ✅ **Facts only — verified** |
| Forbidden paths | Undocumented | **Documented + enforceable** |

---

## 10. Forbidden Paths

These patterns MUST NOT appear in any module outside the Attendance Domain.
If found, they are architectural violations of Rule #5, Rule #6, or Rule #7.

| Path | Violation | Status |
|------|-----------|--------|
| `payroll` → raw `attendances` table | Derives attendance truth (was Path B) | ✅ DELETED S1-4 PR-2 |
| `payroll` → `attendanceDailySummaries` table | Bypasses resolved truth publication | ❌ Forbidden |
| `analytics` → raw `attendances` table (aggregate count) | Acceptable for counting, NOT for deriving values | ⚠️ Reviewed — simple count only |
| Any consumer casts `unknown` summary type | Bypasses typed contract (Rule #6) | ✅ FIXED S1-4 PR-4 |
| Attendance emits commands (`startPayroll`, `notifyHR`) | Turns facts into orchestration (Rule #2) | ❌ Forbidden |
| Consumer re-calculates attendance values | Violates Rule #7 — one owner per value | ❌ Forbidden |
| Feature flag dual-path consumption | Violates invariant of one consumption path | ❌ Forbidden |

---

## 11. Sprint 2 Hardening Items (Post-Sprint 1 Review)

Not blockers — operational maturity gaps surfaced during Sprint 1 closure review.

| # | Item | Priority | Detail |
|---|------|----------|--------|
| 1 | Period locking enforcement (domain guard) | P1 | `TimesheetPeriodClosedEvent` exists, but no `assertPeriodEditable(period)` guard at the domain layer. Period mutation must be prevented at the domain boundary, not just UI disable. |
| 2 | Snapshot versioning | P2 | Payroll data has long lifetime. Snapshot overwrite loses history. Should preserve `version` chain: v1 → payroll processed → correction approved → v2 → adjustment payroll. |
| 3 | Reconciliation read model | P3 | Production audit requires query showing: `Attendance: 176h → Payroll Snapshot: 176h → Payroll Result: 176h`. Observability only, not transaction logic. |

---

*This document is a living invariant. Changes require ADR.*
