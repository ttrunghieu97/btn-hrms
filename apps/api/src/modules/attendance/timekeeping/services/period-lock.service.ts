import { Inject, Injectable } from "@nestjs/common";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { throwBadRequest, throwForbidden } from "../../../../shared/utils/http-error";
import { AttendancePeriodLockRepository } from "../repositories/attendance-period-lock.repository";
import { AttendancePeriodLockService, AttendancePeriodLock } from "../services/attendance-period-lock.service";
import { EventOutboxService } from "../../../../core/events/event-outbox.service";
import { TimesheetPeriodLockedEvent } from "../../../../core/events/events/timesheet-period-locked.event";
import { TimesheetPeriodUnlockedEvent } from "../../../../core/events/events/timesheet-period-unlocked.event";
import { TimesheetPeriodClosedEvent } from "../../../../core/events/events/timesheet-period-closed.event";
import { TimesheetSnapshotService } from "./timesheet-snapshot.service";

@Injectable()
export class PeriodLockService {
  constructor(
    private readonly periodLockRepo: AttendancePeriodLockRepository,
    private readonly periodLockService: AttendancePeriodLockService,
    private readonly eventOutbox: EventOutboxService,
    private readonly snapshotService: TimesheetSnapshotService,
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

    const result = await this.periodLockRepo.upsert({
      period,
      status: "locked",
      userId: actorUserId,
      remarks,
    });

    await this.eventOutbox.stage(
      new TimesheetPeriodLockedEvent({ period, actorUserId, remarks }),
    );

    return result;
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

    const result = await this.periodLockRepo.upsert({
      period,
      status: "open",
      userId: actorUserId,
      remarks,
    });

    await this.eventOutbox.stage(
      new TimesheetPeriodUnlockedEvent({ period, actorUserId, remarks }),
    );

    return result;
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
    const result = await this.periodLockRepo.upsert({
      period,
      status: "closed",
      userId: actorUserId,
      remarks,
    });

    // Create immutable snapshot before publishing event
    const snapshotCount = await this.snapshotService.createSnapshotForPeriod(period, "closed");

    await this.eventOutbox.stage(
      new TimesheetPeriodClosedEvent({ period, actorUserId, remarks, snapshotCount }),
    );

    return result;
  }

  async getPeriodLock(period: string): Promise<AttendancePeriodLock | null> {
    return this.periodLockRepo.findByPeriod(period);
  }
}
