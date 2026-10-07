import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { ScheduleRequestApprovedEvent } from "../../../../core/events/events/schedule-request-approved.event";
import { ScheduleRequestDeniedEvent } from "../../../../core/events/events/schedule-request-denied.event";

@Injectable()
export class ScheduleRequestShiftAssignmentHandler {
  private readonly logger = new Logger(ScheduleRequestShiftAssignmentHandler.name);

  @OnEvent(ScheduleRequestApprovedEvent.EVENT_NAME, { async: true })
  async handleApproved(event: ScheduleRequestApprovedEvent): Promise<void> {
    const { requestId, employeeId, reviewerId } = event.data;
    this.logger.log(
      `[ShiftAssignmentHandler] Schedule request ${requestId} approved for employee ${employeeId} by reviewer ${reviewerId}`
    );
  }

  @OnEvent(ScheduleRequestDeniedEvent.EVENT_NAME, { async: true })
  async handleDenied(event: ScheduleRequestDeniedEvent): Promise<void> {
    const { requestId, employeeId, reviewerId } = event.data;
    this.logger.log(
      `[ShiftAssignmentHandler] Schedule request ${requestId} denied for employee ${employeeId} by reviewer ${reviewerId}`
    );
  }
}
