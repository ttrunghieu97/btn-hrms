import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { ScheduleRequestApprovedEvent } from "../../../../core/events/events/schedule-request-approved.event";
import { ScheduleRequestDeniedEvent } from "../../../../core/events/events/schedule-request-denied.event";

@Injectable()
export class ScheduleRequestAuditLogHandler {
  private readonly logger = new Logger(ScheduleRequestAuditLogHandler.name);

  @OnEvent(ScheduleRequestApprovedEvent.EVENT_NAME, { async: true })
  async handleApproved(event: ScheduleRequestApprovedEvent): Promise<void> {
    const { requestId, reviewerId, reviewedAt } = event.data;
    this.logger.log(
      `[AuditLogHandler] Audit log recorded: Request ${requestId} APPROVED by ${reviewerId} at ${reviewedAt}`
    );
  }

  @OnEvent(ScheduleRequestDeniedEvent.EVENT_NAME, { async: true })
  async handleDenied(event: ScheduleRequestDeniedEvent): Promise<void> {
    const { requestId, reviewerId, reviewedAt } = event.data;
    this.logger.log(
      `[AuditLogHandler] Audit log recorded: Request ${requestId} DENIED by ${reviewerId} at ${reviewedAt}`
    );
  }
}
