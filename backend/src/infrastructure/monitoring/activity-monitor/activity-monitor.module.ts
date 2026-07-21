import { Module } from "@nestjs/common";
import { ActivityMonitorController } from "./activity-monitor.controller";
import { ListActivitiesUseCase } from "./use-cases/list-activities.usecase";
import { ActivityRepository } from "./repositories/activity.repository";
import { ListDistinctActivityActionsUseCase } from "./use-cases/list-distinct-activity-actions.usecase";
import { ListDistinctActivityEntitiesUseCase } from "./use-cases/list-distinct-activity-entities.usecase";

@Module({
  controllers: [ActivityMonitorController],
  providers: [
    ActivityRepository,
    ListActivitiesUseCase,
    ListDistinctActivityActionsUseCase,
    ListDistinctActivityEntitiesUseCase,
  ],
})
export class ActivityMonitorModule {}
