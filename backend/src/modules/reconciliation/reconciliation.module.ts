import { Module } from "@nestjs/common";
import { AttendanceViolationEngine } from "./violation-engine/violation-engine";
import { AttendanceViolationsRepository } from "./repositories/attendance-violations.repository";
import { ReconcileAttendanceDayUseCase } from "./use-cases/reconcile-attendance-day.usecase";

@Module({
  providers: [
    AttendanceViolationEngine,
    AttendanceViolationsRepository,
    ReconcileAttendanceDayUseCase,
  ],
  exports: [
    ReconcileAttendanceDayUseCase,
    AttendanceViolationsRepository,
  ],
})
export class ReconciliationModule {}
