# ADR-007: Attendance Module Governance Rules

**Status:** Accepted  
**Date:** 2026-07-29  
**Context:** Business Workflow Audit + Sprint 0 Platform Capability Mapping  
**Author:** Principal HRMS Architect  

## Decision

Attendance Module adopts 7 governance rules to maintain bounded context integrity
and prevent architectural drift toward becoming a mini-platform.

## Rules

### RULE-1: Request, not Implement

Attendance may **request** Platform capabilities.
Attendance may **never implement** Platform capabilities.

| Attendance MAY | Attendance MAY NOT |
|----------------|--------------------|
| `approvalService.requestApproval()` | `approvalService.approve()` |
| `workflowService.startWorkflow()` | `workflowService.transition()` |
| `notificationService.requestNotification()` | `notificationService.send()` |

### RULE-2: Publish, not Orchestrate

Attendance may **publish domain events** for downstream consumption.
Attendance may **never orchestrate** cross-domain workflows.

```typescript
// GOOD — Attendance publishes; subscribers react
eventOutbox.stage(new AttendanceCheckedEvent(...))

// BAD — Attendance orchestrates
await payrollService.recompute()
await notificationService.send()
await workflowService.transition()
```

### RULE-3: Ownership Boundary

Attendance owns **exactly** five things:

1. Attendance records (check-in/check-out events)
2. Attendance summaries (daily resolved summaries)
3. Attendance exceptions (missing punch, invalid sequence)
4. Attendance periods (review lifecycle)
5. Attendance policies (grace period, late rules, etc.)

Everything else must answer "Who owns this?" before implementation.

### RULE-4: Feature Ownership

Every new feature MUST answer:

> **Who owns this capability?**

| Answer | Action |
|--------|--------|
| Attendance | Implement within boundary |
| Platform (Approval/Workflow/Permission/etc.) | Configure; never re-implement |
| Unclear | ADR required before implementation |

### RULE-5: Single Source of Attendance Truth

Attendance is the **only owner** of Attendance Truth.
No other domain may derive, re-calculate, or persist attendance truths.

- Attendance truth includes: resolved summaries, resolved snapshots, exceptions, policies
- Other domains consume attendance truth via published contracts only
- Implementation completeness does not affect ownership—Attendance owns truth even
  when snapshot/port surface is incomplete

### RULE-6: Published Contracts Only

Cross-domain access MUST use **published contracts only**.

| Published Contracts | Direct Access (Forbidden) |
|---------------------|---------------------------|
| Ports (interfaces) | Tables |
| Read Models | Repositories |
| Snapshots | Internal services |
| Events | Internal calculations |
| ACLs (Anti-Corruption Layers) | Raw `SELECT *` |

### RULE-7: One Owner per Business Value

Every business value has exactly **one** owner.

| Value | Owner |
|-------|-------|
| workingMinutes, overtimeMinutes | Attendance |
| attendanceOutcome, exceptions | Attendance |
| salary, allowances, deductions | Payroll |
| settlement, payrollRuns | Payroll |
| approvalPolicies, approvalStates | Approval Engine |
| workflowTransitions | Workflow Engine |

No domain may calculate or override another domain's values.

## Enforcement Strategy

### Tier 1 — CI Enforceable (lintable)

| Rule | Enforcement |
|------|-------------|
| R1 | Import rules: attendance use-cases may not import from payroll/workflow/approval/notification modules |
| R2 | Handler pattern: handlers must not orchestrate cross-domain logic |
| R6 | Dependency-cruiser: cross-module dependency graph validation |
| R7 | Repository access: no direct table access across domain boundaries |

### Tier 2 — ADR Required (architectural concern)

| Rule | Criteria |
|------|----------|
| R3 | Any new domain object outside the 5 owned things |
| R4 | Every feature T-shirt > S |
| R5 | Any proposal changing truth ownership |

### Tier 3 — PR Review (human judgment)

| Pattern | Reviewer flag |
|---------|---------------|
| God handler | Handler with >3 cross-domain calls |
| Orchestrator | Use-case calling multiple domain services |
| Path-B | Cross-module direct table/repository access |
| Domain calc | Computing another domain's business value |

## PR Checklist

Every Attendance PR must answer 8 questions:

```
1.  Who owns this capability?
2.  Is Attendance implementing it?
3.  Should Platform own it?
4.  Does this introduce a new truth?
5.  Is there already a published contract?
6.  Does this introduce cross-domain calculations?
7.  Does this make Attendance an orchestrator?
8.  Does this violate Attendance boundaries?
```

If any answer suggests Attendance becomes owner/orchestrator/calculator/platform
of something outside RULE-3 → ADR required before merge.

## Consequences

| Positive | Negative |
|----------|----------|
| Prevents architectural drift | Slows down quick-fix cross-domain workarounds |
| Clear module boundary | Requires Platform enhancements for cross-cutting needs |
| Reusable Platform capabilities | Learning curve for new team members |
| SSOT for attendance data | – |

## Audit References

This ADR is informed by the 2026-07-29 Attendance Business Workflow Audit and
Sprint 0 Platform Capability Mapping:

- Sprint 0 mapped: Approval Engine, Workflow Engine, Payroll Bridge,
  Event Infrastructure, Permission System
- Key finding: Platform is 90-100% capable; Attendance is 60-70% wired
- Payroll Bridge data integrity issue identified as P0 (two parallel data paths)
- Approval Engine exists but attendance never integrates
- Workflow Engine exists but no attendance workflows registered
