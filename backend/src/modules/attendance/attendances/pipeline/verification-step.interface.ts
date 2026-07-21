import type { AttendanceVerificationContext, VerificationStatus } from "./verification-context";

/**
 * StepResult — returned only on success (ok implied).
 * Blocking failures must throw via throwBadRequest / throwForbidden etc.
 * Non-blocking issues (e.g. low-confidence selfie) set flags + verificationStatus.
 */
export interface StepResult {
  flags?: Record<string, boolean>;
  verificationStatus?: VerificationStatus;
}

export interface VerificationStep {
  readonly name: string;
  execute(ctx: AttendanceVerificationContext): Promise<StepResult>;
}
