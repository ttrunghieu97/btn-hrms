import { Module } from "@nestjs/common";
import { AttendancesModule } from "../attendances/attendances.module";
import { TimekeepingController } from "./timekeeping.controller";
import { AttendanceTimekeepingRepository } from "./repositories/attendance-timekeeping.repository";
import { AttendancePeriodLockRepository } from "./repositories/attendance-period-lock.repository";
import { AttendanceTimeCalculationService } from "./services/attendance-time-calculation.service";
import { AttendanceExceptionDetectorService } from "./services/attendance-exception-detector.service";
import { AttendancePeriodLockService } from "./services/attendance-period-lock.service";
import { TimesheetService } from "./services/timesheet.service";
import { PeriodLockService } from "./services/period-lock.service";
import { TimesheetSnapshotService } from "./services/timesheet-snapshot.service";
import { CreateClockEventUseCase } from "./use-cases/create-clock-event.usecase";
import { CreateManualCorrectionUseCase } from "./use-cases/create-manual-correction.usecase";
import { ListClockEventsUseCase } from "./use-cases/list-clock-events.usecase";
import { ListAttendanceExceptionsUseCase } from "./use-cases/list-attendance-exceptions.usecase";
import { OverrideAttendanceSummaryUseCase } from "./use-cases/override-attendance-summary.usecase";
import { RecomputeAttendanceDayUseCase } from "./use-cases/recompute-attendance-day.usecase";
import { ResolveAttendanceExceptionUseCase } from "./use-cases/resolve-attendance-exception.usecase";
import { QueryAttendanceTimesheetUseCase } from "./use-cases/query-attendance-timesheet.usecase";
import { QueryTimesheetWorkspaceUseCase } from "./use-cases/query-timesheet-workspace.usecase";

@Module({
  imports: [AttendancesModule],
  controllers: [TimekeepingController],
  providers: [
    AttendanceTimekeepingRepository,
    AttendancePeriodLockRepository,
    AttendanceTimeCalculationService,
    AttendanceExceptionDetectorService,
    AttendancePeriodLockService,
    TimesheetService,
    PeriodLockService,
    TimesheetSnapshotService,
    QueryTimesheetWorkspaceUseCase,
    CreateClockEventUseCase,
    CreateManualCorrectionUseCase,
    ListClockEventsUseCase,
    ListAttendanceExceptionsUseCase,
    OverrideAttendanceSummaryUseCase,
    RecomputeAttendanceDayUseCase,
    ResolveAttendanceExceptionUseCase,
    QueryAttendanceTimesheetUseCase,
  ],
  exports: [AttendanceTimekeepingRepository, RecomputeAttendanceDayUseCase],
})
export class TimekeepingModule {}



