import { Inject, Injectable } from "@nestjs/common";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { throwBadRequest, throwForbidden } from "../../../../shared/utils/http-error";
import { AttendancePeriodLockRepository } from "../repositories/attendance-period-lock.repository";
import { AttendancePeriodLockService, AttendancePeriodLock } from "../services/attendance-period-lock.service";
import { EventOutboxService } from "../../../../core/events/event-outbox.service";
import { TimesheetPeriodLockedEvent } from "../../../../core/events/events/timesheet-period-locked.event";
import { TimesheetPeriodUnlockedEvent } from "../../../../core/events/events/timesheet-period-unlocked.event";
import { TimesheetPeriodClosedEvent } from "../../../../core/events/events/timesheet-period-closed.event";
import { TimesheetPeriodReopenedEvent } from "../../../../core/events/events/timesheet-period-reopened.event";
import { TimesheetSnapshotService } from "./timesheet-snapshot.service";
import { PayrollReconciliationService } from "./payroll-reconciliation.service";

export type CloseValidationResult = {
  valid: boolean;
  reasons: string[];
};

const PERIOD_CLOSE_VALIDATORS: Array<(period: string) => Promise<string | null>> = [];

/**
 * Register a close validator. Called before a period transitions to CLOSED.
 * Return null to pass, or a reason string to fail.
 */
export function registerCloseValidator(
  validator: (period: string) => Promise<string | null>,
): void {
  PERIOD_CLOSE_VALIDATORS.push(validator);
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

  async lock(actorUserId: string, period: string, remarks?: string): Promise<AttendancePeriodLock> {
    const lock = await this.periodLockRepo.ensurePeriod(period);

    if (!this.periodLockService.canLock(lock.status)) {
      throwBadRequest(
        `Period ${period} cannot be locked from status ${lock.status}`,
        ERROR_CODES.INVALID_REQUEST,
        { period, status: lock.status },
      );
    }

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

    if (!this.periodLockService.canUnlock(lock.status)) {
      throwBadRequest(
        `Period ${period} cannot be unlocked from status ${lock.status}`,
        ERROR_CODES.INVALID_REQUEST,
        { period, status: lock.status },
      );
    }

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
    if (!this.periodLockService.canClose(lock.status)) {
      throwBadRequest(
        `Period ${period} cannot be closed from status ${lock.status}`,
        ERROR_CODES.INVALID_REQUEST,
        { period, status: lock.status },
      );
    }

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

  async getPeriodHistory(period: string): Promise<import("../repositories/attendance-period-lock.repository").PeriodTransitionRecord[]> {
    return this.periodLockRepo.getHistory(period);
  }

  async reopen(actorUserId: string, period: string, remarks: string): Promise<AttendancePeriodLock> {
    const lock = await this.periodLockRepo.ensurePeriod(period);
    if (!this.periodLockService.canReopen(lock.status)) {
      throwBadRequest(
        `Period ${period} cannot be reopened from status ${lock.status}`,
        ERROR_CODES.INVALID_REQUEST,
        { period, status: lock.status },
      );
    }

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
