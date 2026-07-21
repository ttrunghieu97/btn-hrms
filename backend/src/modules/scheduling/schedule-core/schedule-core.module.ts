import { Module } from "@nestjs/common";
import { ScheduleCoreController } from "./schedule-core.controller";
import { ScheduleRepository } from "./repositories/schedule.repository";
import { EnsureScheduleUseCase } from "./use-cases/ensure-schedule.usecase";
import { GetRequirementsUseCase } from "./use-cases/get-requirements.usecase";
import { ReplaceRequirementsUseCase } from "./use-cases/replace-requirements.usecase";
import { PublishScheduleUseCase } from "./use-cases/publish-schedule.usecase";
import { LockScheduleUseCase } from "./use-cases/lock-schedule.usecase";
import { GetScheduleDashboardUseCase } from "./use-cases/get-schedule-dashboard.usecase";
import { CoverageService } from "../shifts/schedule-roster/services/coverage.service";
import { ReconciliationService } from "../../attendance/reconciliation/reconciliation.service";
import { ReconciliationCacheService } from "../../attendance/reconciliation/reconciliation-cache.service";
import { WorkforceShiftsRepository } from "../shifts/schedule-roster/repositories/workforce-shifts.repository";

@Module({
  controllers: [ScheduleCoreController],
  providers: [
    ScheduleRepository,
    EnsureScheduleUseCase,
    GetRequirementsUseCase,
    ReplaceRequirementsUseCase,
    PublishScheduleUseCase,
    LockScheduleUseCase,
    GetScheduleDashboardUseCase,
    CoverageService,
    ReconciliationService,
    ReconciliationCacheService,
    WorkforceShiftsRepository,
  ],
  exports: [ScheduleRepository, EnsureScheduleUseCase, CoverageService],
})
export class ScheduleCoreModule {}
