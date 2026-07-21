import { Module } from "@nestjs/common";
import { RouterModule } from "@nestjs/core";
import { AttendancesModule } from "./attendances/attendances.module";
import { AttendanceSummariesModule } from "./attendance-summaries/attendance-summaries.module";
import { TimekeepingModule } from "./timekeeping/timekeeping.module";
import { AttendanceOvertimeModule } from "./overtime/attendance-overtime.module";
import { ReconciliationModule } from "./reconciliation/reconciliation.module";

@Module({
  imports: [
    AttendancesModule,
    AttendanceSummariesModule,
    TimekeepingModule,
    AttendanceOvertimeModule,
    ReconciliationModule,
    RouterModule.register([
      { path: "attendances", module: AttendancesModule },
      { path: "attendance-summaries", module: AttendanceSummariesModule },
      { path: "timekeeping", module: TimekeepingModule },
      { path: "overtime", module: AttendanceOvertimeModule },
      { path: "workforce/schedules/reconciliation", module: ReconciliationModule },
    ]),
  ],
})
export class AttendanceDomainModule {}



