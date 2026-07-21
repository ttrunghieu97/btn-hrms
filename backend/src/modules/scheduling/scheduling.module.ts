import { Module } from "@nestjs/common";
import { RouterModule } from "@nestjs/core";
import { WorkforceShiftsModule } from "./shifts/workforce-shifts.module";
import { QualificationsModule } from "./qualifications/qualifications.module";
import { ScheduleRequestsModule } from "./requests/schedule-requests.module";
import { ScheduleCoreModule } from "./schedule-core/schedule-core.module";

@Module({
  imports: [
    WorkforceShiftsModule,
    QualificationsModule,
    ScheduleRequestsModule,
    ScheduleCoreModule,
    RouterModule.register([
      { path: "workforce/schedules", module: WorkforceShiftsModule },
      { path: "workforce/schedules/employees/:employeeId", module: QualificationsModule },
      { path: "workforce/schedules", module: ScheduleRequestsModule },
      { path: "workforce/schedules", module: ScheduleCoreModule },
    ]),
  ],
  exports: [WorkforceShiftsModule, QualificationsModule, ScheduleRequestsModule, ScheduleCoreModule],
})
export class SchedulingDomainModule {}
