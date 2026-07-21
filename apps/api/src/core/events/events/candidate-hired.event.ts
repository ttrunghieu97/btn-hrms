import { DomainEvent } from "../domain-event.base";

export type CandidateHiredPayload = {
  /** Semantic idempotency key: `${offerId}:recruitment.candidate.hired` */
  idempotencyKey: string;
  offerId: string;
  applicationId: string;
  candidateId: string;
  postingId: string;
  candidateEmail: string;
  candidateName: string;
  startDate: string;
  compensation: string;
  hiredAt: string;
};

/**
 * Emitted when a candidate accepts an approved offer. Consumed by onboarding /
 * workforce through a contracts port to provision a new employee. Publishing
 * must not fail when no subscriber is registered.
 */
export class CandidateHiredEvent extends DomainEvent<CandidateHiredPayload> {
  static readonly eventType = "recruitment.candidate.hired.v1";
  static readonly eventVersion = 1;

  constructor(payload: CandidateHiredPayload, correlationId?: string) {
    super(
      CandidateHiredEvent.eventType,
      "recruitment",
      payload,
      correlationId,
    );
  }
}
