import { Module } from "@nestjs/common";
import { ScheduleRequestsController } from "./schedule-requests.controller";
import { ScheduleRequestsRepository } from "./repositories/schedule-requests.repository";
import { CreateScheduleRequestUseCase } from "./use-cases/create-schedule-request.usecase";
import { ListScheduleRequestsUseCase } from "./use-cases/list-schedule-requests.usecase";
import { ReviewScheduleRequestUseCase } from "./use-cases/review-schedule-request.usecase";
import { ScheduleRequestAuthorizationService } from "./services/schedule-request-authorization.service";
import { ScheduleRequestShiftAssignmentHandler } from "./handlers/schedule-request-shift-assignment.handler";
import { ScheduleRequestNotificationHandler } from "./handlers/schedule-request-notification.handler";
import { ScheduleRequestAuditLogHandler } from "./handlers/schedule-request-audit-log.handler";

@Module({
  controllers: [ScheduleRequestsController],
  providers: [
    ScheduleRequestsRepository,
    CreateScheduleRequestUseCase,
    ListScheduleRequestsUseCase,
    ReviewScheduleRequestUseCase,
    ScheduleRequestAuthorizationService,
    ScheduleRequestShiftAssignmentHandler,
    ScheduleRequestNotificationHandler,
    ScheduleRequestAuditLogHandler,
  ],
  exports: [ScheduleRequestsRepository],
})
export class ScheduleRequestsModule {}


