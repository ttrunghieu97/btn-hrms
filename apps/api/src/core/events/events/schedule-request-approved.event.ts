import { DomainEvent } from "../domain-event.base";

export interface ScheduleRequestApprovedPayload {
  requestId: string;
  employeeId: string;
  reviewerId: string;
  reviewedAt: Date;
}

export class ScheduleRequestApprovedEvent extends DomainEvent<ScheduleRequestApprovedPayload> {
  static readonly EVENT_NAME = "scheduling.request.approved.v1";

  constructor(data: ScheduleRequestApprovedPayload, correlationId?: string) {
    super(ScheduleRequestApprovedEvent.EVENT_NAME, "scheduling", data, correlationId);
  }
}
