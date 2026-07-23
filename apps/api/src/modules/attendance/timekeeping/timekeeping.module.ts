import { Module } from "@nestjs/common";
import { AttendancesModule } from "../attendances/attendances.module";
import { TimekeepingController } from "./timekeeping.controller";
import { AttendanceTimekeepingRepository } from "./repositories/attendance-timekeeping.repository";
import { AttendanceTimeCalculationService } from "./services/attendance-time-calculation.service";
import { AttendanceExceptionDetectorService } from "./services/attendance-exception-detector.service";
import { CreateClockEventUseCase } from "./use-cases/create-clock-event.usecase";
import { CreateManualCorrectionUseCase } from "./use-cases/create-manual-correction.usecase";
import { ListClockEventsUseCase } from "./use-cases/list-clock-events.usecase";
import { ListAttendanceExceptionsUseCase } from "./use-cases/list-attendance-exceptions.usecase";
import { OverrideAttendanceSummaryUseCase } from "./use-cases/override-attendance-summary.usecase";
import { RecomputeAttendanceDayUseCase } from "./use-cases/recompute-attendance-day.usecase";
import { ResolveAttendanceExceptionUseCase } from "./use-cases/resolve-attendance-exception.usecase";
import { QueryAttendanceTimesheetUseCase } from "./use-cases/query-attendance-timesheet.usecase";

@Module({
  imports: [AttendancesModule],
  controllers: [TimekeepingController],
  providers: [
    AttendanceTimekeepingRepository,
    AttendanceTimeCalculationService,
    AttendanceExceptionDetectorService,
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



