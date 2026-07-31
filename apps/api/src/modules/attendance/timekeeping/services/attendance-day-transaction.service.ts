import { Injectable } from "@nestjs/common";
import type { AppDatabase } from "../../../../infrastructure/database/database-client.type";
import { AttendanceTimekeepingRepository } from "../repositories/attendance-timekeeping.repository";

/**
 * Attendance-day transaction boundary.
 *
 * Serializes ALL mutations of a given (employeeId, workDate) via a
 * transaction-scoped advisory lock, then runs the mutation inside the
 * same transaction. Every recompute path (clock event, batch save,
 * exception resolve, correction, override) must flow through here.
 *
 * Invariant: at any instant, at most one transaction may write
 * (employeeId, workDate) — prevents lost updates on attendance_summary.
 */
@Injectable()
export class AttendanceDayTransactionService {
  constructor(private readonly repo: AttendanceTimekeepingRepository) {}

  async execute<T>(
    employeeId: string,
    workDate: string,
    fn: (tx: AppDatabase) => Promise<T>,
  ): Promise<T> {
    return this.repo.transaction(async (tx) => {
      await this.repo.acquireAttendanceDayLock(employeeId, workDate, tx);
      return fn(tx);
    });
  }
}
