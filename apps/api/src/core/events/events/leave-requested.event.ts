import { DomainEvent } from "../domain-event.base";

export type LeaveRequestedPayload = {
  scopeId: string;
  leaveRequestId: string;
  employeeId: string;
  userId: string;
  approverUserId?: string | null;
};

export class LeaveRequestedEvent extends DomainEvent<LeaveRequestedPayload> {
  static readonly eventType = "time.leave.requested.v1";
  static readonly eventVersion = 1;

  constructor(payload: LeaveRequestedPayload, correlationId?: string) {
    super(LeaveRequestedEvent.eventType, "workforce", payload, correlationId);
  }
}
