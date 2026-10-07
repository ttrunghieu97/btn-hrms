import { Injectable, OnModuleInit } from "@nestjs/common";
import { AttendanceTimekeepingRepository } from "../repositories/attendance-timekeeping.repository";
import { AttendancePeriodLockRepository } from "../repositories/attendance-period-lock.repository";
import { registerCloseValidator } from "./period-lock.service";

/**
 * Registers built-in close validators for attendance periods.
 *
 * Each validator returns null to pass, or a string reason to block close.
 * Running before period CLOSED ensures snapshots contain clean data.
 */

/**
 * Checks for unresolved pending exceptions in the period.
 * A period with pending exceptions should not close — exceptions
 * may affect the resolved truth captured in the snapshot.
 */
@Injectable()
export class PendingExceptionValidator implements OnModuleInit {
  constructor(
    private readonly timekeepingRepo: AttendanceTimekeepingRepository,
  ) {}

  onModuleInit() {
    registerCloseValidator(async (period: string) => {
      const [year, month] = period.split("-").map(Number);
      if (!year || !month) return null;

      const daysInMonth = new Date(year, month, 0).getDate();
      const from = `${period}-01`;
      const to = `${period}-${String(daysInMonth).padStart(2, "0")}`;

      const pendingCount = await this.timekeepingRepo.countPendingExceptionsInRange(from, to);
      if (pendingCount > 0) {
        return `Period has ${pendingCount} unresolved attendance exception(s)`;
      }

      return null;
    });
  }
}

/**
 * Blocks close while any employee with attendance data is still draft.
 * HR must verify (mark done) every employee before the period can close —
 * snapshots only include done employees.
 */
@Injectable()
export class PendingEmployeeVerificationValidator implements OnModuleInit {
  constructor(
    private readonly periodLockRepo: AttendancePeriodLockRepository,
  ) {}

  onModuleInit() {
    registerCloseValidator(async (period: string) => {
      const unverified = await this.periodLockRepo.countUnverifiedInPeriod(period);
      if (unverified > 0) {
        return `Period has ${unverified} employee(s) not yet verified`;
      }
      return null;
    });
  }
}

