import { Module } from "@nestjs/common";
import { ScheduleRequestsController } from "./schedule-requests.controller";
import { ScheduleRequestsRepository } from "./repositories/schedule-requests.repository";
import { CreateScheduleRequestUseCase } from "./use-cases/create-schedule-request.usecase";
import { ListScheduleRequestsUseCase } from "./use-cases/list-schedule-requests.usecase";
import { ReviewScheduleRequestUseCase } from "./use-cases/review-schedule-request.usecase";

@Module({
  controllers: [ScheduleRequestsController],
  providers: [
    ScheduleRequestsRepository,
    CreateScheduleRequestUseCase,
    ListScheduleRequestsUseCase,
    ReviewScheduleRequestUseCase,
  ],
  exports: [ScheduleRequestsRepository],
})
export class ScheduleRequestsModule {}
