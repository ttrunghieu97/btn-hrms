import { Module } from "@nestjs/common";
import { ReconciliationController } from "./reconciliation.controller";
import { ReconciliationService } from "./reconciliation.service";
import { ReconciliationCacheService } from "./reconciliation-cache.service";
import { AttendanceEventRepository } from "./repositories/attendance-event.repository";
import { ViolationRepository } from "./repositories/violation.repository";
import { RecordAttendanceEventUseCase } from "./use-cases/record-attendance-event.usecase";
import { ReconcileAttendanceDayUseCase } from "./use-cases/reconcile-attendance-day.usecase";

@Module({
  controllers: [ReconciliationController],
  providers: [
    ReconciliationService,
    ReconciliationCacheService,
    AttendanceEventRepository,
    ViolationRepository,
    RecordAttendanceEventUseCase,
    ReconcileAttendanceDayUseCase,
  ],
  exports: [
    ReconciliationService,
    ReconciliationCacheService,
    AttendanceEventRepository,
  ],
})
export class ReconciliationModule {}
