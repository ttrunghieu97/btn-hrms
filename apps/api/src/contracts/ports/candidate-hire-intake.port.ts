export const CANDIDATE_HIRE_INTAKE_PORT = "CANDIDATE_HIRE_INTAKE_PORT";

/**
 * Stable hand-off contract emitted by recruitment when a candidate accepts an
 * approved offer. Recruitment publishes this as the `recruitment.candidate.hired`
 * domain event through the transactional outbox; onboarding/workforce consume it
 * by implementing {@link ICandidateHireIntakePort} and binding it to the token.
 *
 * This payload is FROZEN — it is the versioned boundary between recruitment and
 * downstream provisioning. Add fields additively; never repurpose existing ones.
 */
export interface CandidateHireHandoff {
  offerId: string;
  applicationId: string;
  candidateId: string;
  postingId: string;
  candidateEmail: string;
  candidateName: string;
  /** ISO date (YYYY-MM-DD) the hire is expected to start. */
  startDate: string;
  /** Decimal string, e.g. "2000.00". */
  compensation: string;
  /** ISO timestamp of offer acceptance. */
  hiredAt: string;
}

/**
 * Implemented by the onboarding/workforce context to receive a hired candidate.
 * No implementation is registered yet (onboarding is not built); publishing the
 * hire event must not fail when no subscriber is present.
 */
export interface ICandidateHireIntakePort {
  onCandidateHired(handoff: CandidateHireHandoff): Promise<void>;
}
