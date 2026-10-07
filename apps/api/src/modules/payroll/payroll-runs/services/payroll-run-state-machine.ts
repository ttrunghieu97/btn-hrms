import { Injectable } from "@nestjs/common";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { throwBadRequest } from "../../../../shared/utils/http-error";

export type PayrollRunStatus = "draft" | "processing" | "pending_approval" | "approved" | "posted";

const VALID_TRANSITIONS: Record<PayrollRunStatus, PayrollRunStatus[]> = {
  draft: ["processing"],
  processing: ["draft", "pending_approval"],
  pending_approval: ["approved", "draft"],
  approved: ["posted", "pending_approval"],
  posted: [],
};

/**
 * Explicit state machine for payroll run lifecycle.
 *
 * Ensures every status transition is validated before execution.
 * Financial posting is the terminal state — once posted, a run
 * cannot be modified. Corrections create new adjustment runs.
 */
@Injectable()
export class PayrollRunStateMachine {
  canTransition(from: PayrollRunStatus, to: PayrollRunStatus): boolean {
    const allowed = VALID_TRANSITIONS[from];
    if (!allowed) return false;
    return allowed.includes(to);
  }

  assertTransition(from: PayrollRunStatus, to: PayrollRunStatus): void {
    if (!this.canTransition(from, to)) {
      throwBadRequest(
        `Invalid payroll run transition: ${from} → ${to}`,
        ERROR_CODES.INVALID_STATUS_TRANSITION,
        { from, to },
      );
    }
  }

  isTerminal(status: PayrollRunStatus): boolean {
    return status === "posted";
  }

  isEditable(status: PayrollRunStatus): boolean {
    return status === "draft";
  }

  isApproved(status: PayrollRunStatus): boolean {
    return status === "approved" || status === "posted";
  }

  isPostable(status: PayrollRunStatus): boolean {
    return status === "approved";
  }
}
