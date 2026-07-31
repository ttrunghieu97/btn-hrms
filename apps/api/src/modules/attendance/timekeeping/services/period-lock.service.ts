import { Inject, Injectable } from "@nestjs/common";
import { Permissions } from "../../../../core/security/permissions/permissions.registry";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { throwBadRequest, throwForbidden } from "../../../../shared/utils/http-error";
import { AttendancePeriodLockRepository, type PeriodTransitionRecord } from "../repositories/attendance-period-lock.repository";
import { AttendancePeriodLockService, AttendancePeriodLock } from "../services/attendance-period-lock.service";
import { EventOutboxService } from "../../../../core/events/event-outbox.service";
import { TimesheetPeriodLockedEvent } from "../../../../core/events/events/timesheet-period-locked.event";
import { TimesheetPeriodUnlockedEvent } from "../../../../core/events/events/timesheet-period-unlocked.event";
import { TimesheetPeriodClosedEvent } from "../../../../core/events/events/timesheet-period-closed.event";
import { TimesheetPeriodReopenedEvent } from "../../../../core/events/events/timesheet-period-reopened.event";
import { TimesheetPeriodApprovedEvent } from "../../../../core/events/events/timesheet-period-approved.event";
import { TimesheetPeriodReviewedEvent } from "../../../../core/events/events/timesheet-period-reviewed.event";
import { TimesheetSnapshotService } from "./timesheet-snapshot.service";
import { PayrollReconciliationService } from "./payroll-reconciliation.service";

export type CloseValidationResult = {
  valid: boolean;
  reasons: string[];
};

export type PeriodAction = "review" | "approve" | "lock" | "unlock" | "close" | "reopen";

const PERIOD_CLOSE_VALIDATORS: ((period: string) => Promise<string | null>)[] = [];

/**
 * Register a close validator. Called before a period transitions to CLOSED.
 * Return null to pass, or a reason string to fail.
 */
export function registerCloseValidator(
  validator: (period: string) => Promise<string | null>,
): void {
  PERIOD_CLOSE_VALIDATORS.push(validator);
}

/**
 * Unified transition map: action → allowed from-states.
 * Single source of truth for all period state transitions.
 */
const TRANSITION_MAP: Record<PeriodAction, { from: string[]; to: string }> = {
  review: { from: ["open"], to: "in_review" },
  approve: { from: ["in_review"], to: "locked" },
  lock: { from: ["in_review"], to: "locked" },
  unlock: { from: ["locked"], to: "open" },
  close: { from: ["payroll_posted"], to: "closed" },
  reopen: { from: ["closed"], to: "open" },
};

const ACTION_PERMISSIONS: Record<string, string> = {
  save: Permissions.ATTENDANCE_TIMESHEET_MANAGE,
  review: Permissions.ATTENDANCE_PERIOD_REVIEW,
  approve: Permissions.ATTENDANCE_PERIOD_APPROVE,
  lock: Permissions.ATTENDANCE_PERIOD_LOCK,
  unlock: Permissions.ATTENDANCE_PERIOD_UNLOCK,
  close: Permissions.ATTENDANCE_PERIOD_CLOSE,
  reopen: Permissions.ATTENDANCE_PERIOD_CLOSE,
};

/** Derive available actions for a given status + actor permissions. */
export function computeAvailableActions(status: string, permissions: string[] = []): string[] {
  const actions: PeriodAction[] = ["review", "approve", "lock", "unlock", "close", "reopen"];
  let transitions = actions.filter((a) => TRANSITION_MAP[a].from.includes(status));
  // "save" is an edit action, not a period transition
  if (status === "open" || status === "in_review") (transitions as string[]).unshift("save");

  const isSuper = permissions.includes("sys:all");
  if (!isSuper) {
    transitions = transitions.filter((a) => permissions.includes(ACTION_PERMISSIONS[a] ?? ""));
  }
  return transitions;
}

@Injectable()
export class PeriodLockService {
  constructor(
    private readonly periodLockRepo: AttendancePeriodLockRepository,
    private readonly periodLockService: AttendancePeriodLockService,
    private readonly eventOutbox: EventOutboxService,
    private readonly snapshotService: TimesheetSnapshotService,
    private readonly reconciliationService: PayrollReconciliationService,
  ) {}

  private assertCan(action: PeriodAction, status: string): void {
    const allowed = TRANSITION_MAP[action].from;
    if (!allowed.includes(status)) {
      throwBadRequest(
        `Period cannot transition via "${action}" from status ${status}`,
        ERROR_CODES.INVALID_REQUEST,
        { action, status, allowedFrom: allowed },
      );
    }
  }

  async lock(actorUserId: string, period: string, remarks?: string): Promise<AttendancePeriodLock> {
    const lock = await this.periodLockRepo.ensurePeriod(period);
    this.assertCan("lock", lock.status);

    return this.periodLockRepo.transaction(async (tx) => {
      const result = await this.periodLockRepo.upsert({
        period,
        status: "locked",
        userId: actorUserId,
        remarks,
      });

      await this.periodLockRepo.recordTransition({
        period,
        fromStatus: lock.status,
        toStatus: "locked",
        changedByUserId: actorUserId,
        reason: remarks,
      });

      await this.eventOutbox.stage(
        new TimesheetPeriodLockedEvent({ period, actorUserId, remarks }),
      );

      return result;
    });
  }

  async unlock(actorUserId: string, period: string, remarks: string): Promise<AttendancePeriodLock> {
    const lock = await this.periodLockRepo.ensurePeriod(period);
    this.assertCan("unlock", lock.status);

    return this.periodLockRepo.transaction(async (tx) => {
      const result = await this.periodLockRepo.upsert({
        period,
        status: "open",
        userId: actorUserId,
        remarks,
      });

      await this.periodLockRepo.recordTransition({
        period,
        fromStatus: lock.status,
        toStatus: "open",
        changedByUserId: actorUserId,
        reason: remarks,
      });

      await this.eventOutbox.stage(
        new TimesheetPeriodUnlockedEvent({ period, actorUserId, remarks }),
      );

      return result;
    });
  }

  async close(actorUserId: string, period: string, remarks: string): Promise<AttendancePeriodLock> {
    const lock = await this.periodLockRepo.ensurePeriod(period);
    this.assertCan("close", lock.status);

    // Run close validation pipeline (side-effect-free)
    const validation = await this.validateClose(period);
    if (!validation.valid) {
      throwBadRequest(
        `Period ${period} cannot be closed: ${validation.reasons.join("; ")}`,
        ERROR_CODES.INVALID_REQUEST,
        { period, status: lock.status, reasons: validation.reasons },
      );
    }

    // Create immutable snapshot before status transition
    // If this fails, period remains unchanged — safe to retry
    const snapshotCount = await this.snapshotService.createSnapshotForPeriod(period, "closed");

    // Atomically commit status transition + history + event
    const result = await this.periodLockRepo.transaction(async (tx) => {
      const r = await this.periodLockRepo.upsert({
        period,
        status: "closed",
        userId: actorUserId,
        remarks,
      });

      await this.periodLockRepo.recordTransition({
        period,
        fromStatus: lock.status,
        toStatus: "closed",
        changedByUserId: actorUserId,
        reason: remarks,
        metadata: { snapshotCount },
      });

      await this.eventOutbox.stage(
        new TimesheetPeriodClosedEvent({ period, actorUserId, remarks, snapshotCount }),
      );

      return r;
    });

    // Auto-trigger reconciliation (fire-and-forget — never blocks period close)
    this.reconciliationService.runReconciliation(period, actorUserId).catch(() => {
      // Reconciliation failures are logged by the service and visible
      // via GET /reconciliation. They do not block period closure.
    });

    return result;
  }

  async review(actorUserId: string, period: string): Promise<AttendancePeriodLock> {
    const lock = await this.periodLockRepo.ensurePeriod(period);
    this.assertCan("review", lock.status);

    return this.periodLockRepo.transaction(async (tx) => {
      const result = await this.periodLockRepo.upsert({
        period,
        status: "in_review",
        userId: actorUserId,
      });

      await this.periodLockRepo.recordTransition({
        period,
        fromStatus: lock.status,
        toStatus: "in_review",
        changedByUserId: actorUserId,
        reason: "Reviewed",
      });

      await this.eventOutbox.stage(
        new TimesheetPeriodReviewedEvent({ period, actorUserId }),
      );

      return result;
    });
  }

  async approve(actorUserId: string, period: string): Promise<AttendancePeriodLock> {
    const lock = await this.periodLockRepo.ensurePeriod(period);
    this.assertCan("approve", lock.status);

    return this.periodLockRepo.transaction(async (tx) => {
      const result = await this.periodLockRepo.upsert({
        period,
        status: "locked",
        userId: actorUserId,
      });

      await this.periodLockRepo.recordTransition({
        period,
        fromStatus: lock.status,
        toStatus: "locked",
        changedByUserId: actorUserId,
        reason: "Approved",
      });

      await this.eventOutbox.stage(
        new TimesheetPeriodApprovedEvent({ period, actorUserId }),
      );

      return result;
    });
  }

  async validateClose(period: string): Promise<CloseValidationResult> {
    const reasons: string[] = [];
    for (const validator of PERIOD_CLOSE_VALIDATORS) {
      const result = await validator(period);
      if (result !== null) {
        reasons.push(result);
      }
    }
    return { valid: reasons.length === 0, reasons };
  }

  async getPeriodLock(period: string): Promise<AttendancePeriodLock | null> {
    return this.periodLockRepo.findByPeriod(period);
  }

  async getPeriodHistory(period: string): Promise<PeriodTransitionRecord[]> {
    return this.periodLockRepo.getHistory(period);
  }

  async reopen(actorUserId: string, period: string, remarks: string): Promise<AttendancePeriodLock> {
    const lock = await this.periodLockRepo.ensurePeriod(period);
    this.assertCan("reopen", lock.status);

    return this.periodLockRepo.transaction(async (tx) => {
      const result = await this.periodLockRepo.upsert({
        period,
        status: "open",
        userId: actorUserId,
        remarks,
      });

      await this.periodLockRepo.recordTransition({
        period,
        fromStatus: lock.status,
        toStatus: "open",
        changedByUserId: actorUserId,
        reason: remarks,
        metadata: { reopened: true },
      });

      await this.eventOutbox.stage(
        new TimesheetPeriodReopenedEvent({ period, actorUserId, remarks }),
      );

      return result;
    });
  }
}
