import { Injectable } from "@nestjs/common";
import { AttendanceTimekeepingRepository } from "../repositories/attendance-timekeeping.repository";

export type PeriodHealthSummary = {
  period: string;
  status: string;
  totalEmployees: number;
  matchedCount: number;
  mismatchCount: number;
  pendingAdjustments: number;
  latestReconciliationId: string | null;
};

export type AttendanceDashboardHealth = {
  totalOpenPeriods: number;
  totalClosedPeriods: number;
  totalPendingAdjustments: number;
  totalMismatches: number;
  periods: PeriodHealthSummary[];
};

/**
 * Read-only operational dashboard for attendance health.
 * Aggregates period, adjustment, and reconciliation data.
 * Never writes to any table (Rule #2).
 */
@Injectable()
export class AttendanceHealthService {
  constructor(
    private readonly timekeepingRepo: AttendanceTimekeepingRepository,
  ) {}

  async getHealth(): Promise<AttendanceDashboardHealth> {
    // Get all period locks
    const periodLocks = await this.timekeepingRepo.getAllPeriodLocks();

    const periods: PeriodHealthSummary[] = [];
    let totalOpenPeriods = 0;
    let totalClosedPeriods = 0;
    let totalPendingAdjustments = 0;
    let totalMismatches = 0;

    for (const lock of periodLocks) {
      // Count pending adjustments for this period
      const pendingAdjustments = await this.timekeepingRepo.countPendingAdjustments(lock.period);

      // Get latest reconciliation for this period
      const latestRecon = await this.timekeepingRepo.findLatestReconciliation(lock.period);

      if (lock.status === "open" || lock.status === "in_review" || lock.status === "locked") {
        totalOpenPeriods++;
      } else if (lock.status === "closed") {
        totalClosedPeriods++;
      }

      totalPendingAdjustments += pendingAdjustments;

      periods.push({
        period: lock.period,
        status: lock.status,
        totalEmployees: latestRecon?.totalEmployees ?? 0,
        matchedCount: latestRecon?.matchedCount ?? 0,
        mismatchCount: latestRecon?.mismatchCount ?? 0,
        pendingAdjustments,
        latestReconciliationId: latestRecon?.id ?? null,
      });

      totalMismatches += latestRecon?.mismatchCount ?? 0;
    }

    return {
      totalOpenPeriods,
      totalClosedPeriods,
      totalPendingAdjustments,
      totalMismatches,
      periods,
    };
  }
}
