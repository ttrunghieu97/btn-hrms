# RC-3D Event Validation

**Date:** 2026-07-29  
**Status:** Complete  

## Event Infrastructure

| Component | Description | Status |
|-----------|-------------|--------|
| `EventOutboxService.stage()` | Writes event to outbox table, optionally within caller's transaction | ✅ |
| `EventOutboxDispatcherService` | Polls unpublished events, publishes via Redis Streams | ✅ |
| `RedisDurableEventBus` | Redis Streams with consumer groups, at-least-once delivery | ✅ |
| `InternalEventBus` | In-process EventEmitter2 fallback | ✅ |
| `EventOutboxRepository` | Claim, recordAttempt, recordFailure, markPublished, DLQ | ✅ |

## Event Delivery Guarantees

| Property | Mechanism | Status |
|----------|-----------|--------|
| At-least-once delivery | Outbox pattern + Redis Streams consumer groups | ✅ |
| Transactional atomicity | `stage(event, tx)` — event committed atomically with business logic | ✅ |
| Retry with backoff | 5s→60s exponential, 0.75-1.25x jitter, max 12 attempts | ✅ |
| Dead letter queue | PostgreSQL `failedAt` + Redis Stream DLQ | ✅ |
| Event ordering | FIFO within dispatcher batch (ORDER BY created_at ASC) | ✅ |
| Replay safety | All subscribers use `EventIdempotencyRepository.isProcessed/markProcessed` | ✅ |

## Subscriber Idempotency

| Subscriber | Idempotent? | Mechanism |
|-----------|------------|-----------|
| `PayrollTimesheetPeriodClosedSubscriber` | ✅ | `isProcessed/markProcessed` with consumer key `payroll:timesheet_period_closed` |
| `PayrollOffboardingCompletedSubscriber` | ✅ | Same pattern |
| `PayrollEmployeeTerminatedSubscriber` | ✅ | Same pattern |
| `EmployeeLifecycleSubscriber` (attendance) | ✅ | Same pattern |

## Event Catalog (Attendance + Payroll domain events)

| Event | Producer | Staged within transaction? |
|-------|----------|---------------------------|
| `TimesheetPeriodLockedEvent` | `PeriodLockService.lock()` | ✅ (after RC-2B TC-1 fix) |
| `TimesheetPeriodUnlockedEvent` | `PeriodLockService.unlock()` | ✅ |
| `TimesheetPeriodClosedEvent` | `PeriodLockService.close()` | ✅ |
| `TimesheetPeriodReopenedEvent` | `PeriodLockService.reopen()` | ✅ |
| `AttendanceAdjustmentRequestedEvent` | `AttendanceAdjustmentService.create()` | ✅ (after RC-2B TC-2 fix) |
| `AttendanceAdjustmentApprovedEvent` | `AttendanceAdjustmentService.approve()` | ✅ |
| `AttendanceAdjustmentRejectedEvent` | `AttendanceAdjustmentService.reject()` | ✅ |
| `AttendanceAdjustmentAppliedEvent` | `AttendanceAdjustmentService.apply()` | ✅ |
| `PayrollApprovedEvent` | `ApprovePayrollRunUseCase` | ✅ |
| `PayrollRejectedEvent` | `RejectPayrollRunUseCase` | ✅ |
| `PayrollPostedEvent` | `PostPayrollRunUseCase` | ✅ |
| `PayrollFinancialPublicationCompletedEvent` | Defined, registered | ✅ |

## Failure Isolation

| Scenario | Behavior | Status |
|----------|----------|--------|
| Subscriber throws after event delivery | Idempotency NOT marked → event re-delivered on retry | ✅ (see offboarding subscriber pattern — catch logs error, does NOT markProcessed) |
| Outbox dispatch fails | `recordFailure()` → retry with backoff → DLQ after max attempts | ✅ |
| Transaction rolls back after stage | Event rolled back atomically → never published | ✅ |
| Redis Stream unavailable | Falls to `InternalEventBus` (in-process) | ✅ |
| Duplicate event delivery | Idempotency check prevents duplicate processing | ✅ |

## Validation Status

| Requirement | Status |
|------------|--------|
| Event publication semantics validated | ✅ PASS |
| Subscriber idempotency validated | ✅ PASS |
| Transaction commit ordering validated | ✅ PASS |
| Failure isolation validated | ✅ PASS |
| Replay safety validated | ✅ PASS |
| Audit preservation validated | ✅ PASS |
| Blocking findings | **None** |
