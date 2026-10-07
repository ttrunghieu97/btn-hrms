import { DomainEvent } from "../domain-event.base";

export interface ScheduleRequestDeniedPayload {
  requestId: string;
  employeeId: string;
  reviewerId: string;
  reviewedAt: Date;
}

export class ScheduleRequestDeniedEvent extends DomainEvent<ScheduleRequestDeniedPayload> {
  static readonly EVENT_NAME = "scheduling.request.denied.v1";

  constructor(data: ScheduleRequestDeniedPayload, correlationId?: string) {
    super(ScheduleRequestDeniedEvent.EVENT_NAME, "scheduling", data, correlationId);
  }
}
