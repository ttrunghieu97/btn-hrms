import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { ScheduleRequestApprovedEvent } from "../../../../core/events/events/schedule-request-approved.event";
import { ScheduleRequestDeniedEvent } from "../../../../core/events/events/schedule-request-denied.event";

@Injectable()
export class ScheduleRequestNotificationHandler {
  private readonly logger = new Logger(ScheduleRequestNotificationHandler.name);

  @OnEvent(ScheduleRequestApprovedEvent.EVENT_NAME, { async: true })
  async handleApproved(event: ScheduleRequestApprovedEvent): Promise<void> {
    const { requestId, employeeId } = event.data;
    this.logger.log(
      `[NotificationHandler] Notification sent: Schedule request ${requestId} for employee ${employeeId} has been APPROVED.`
    );
  }

  @OnEvent(ScheduleRequestDeniedEvent.EVENT_NAME, { async: true })
  async handleDenied(event: ScheduleRequestDeniedEvent): Promise<void> {
    const { requestId, employeeId } = event.data;
    this.logger.log(
      `[NotificationHandler] Notification sent: Schedule request ${requestId} for employee ${employeeId} has been DENIED.`
    );
  }
}
