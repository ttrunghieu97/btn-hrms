import { Injectable } from "@nestjs/common";
import { throwConflict } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";

export type LeaveRequestStatus =
  | "draft"
  | "pending"
  | "approved"
  | "rejected"
  | "cancelled";

export type LeaveLifecycleStatus =
  | "draft"
  | "submitted"
  | "approved"
  | "rejected"
  | "canceled";

@Injectable()
export class LeaveLifecycleService {
  private readonly allowedTransitions: Readonly<
    Record<LeaveRequestStatus, LeaveRequestStatus[]>
  > = {
    draft: ["pending", "cancelled"],
    pending: ["approved", "rejected", "cancelled"],
    approved: ["cancelled"],
    rejected: ["cancelled"],
    cancelled: [],
  };

  toLifecycleStatus(status: LeaveRequestStatus): LeaveLifecycleStatus {
    if (status === "pending") {
      return "submitted";
    }

    if (status === "cancelled") {
      return "canceled";
    }

    return status;
  }

  assertTransition(
    from: LeaveRequestStatus,
    to: LeaveRequestStatus,
    leaveRequestId: string,
  ) {
    const allowedTargets = this.allowedTransitions[from] ?? [];
    if (allowedTargets.includes(to)) {
      return;
    }

    throwConflict(
      "Invalid leave request status transition",
      ERROR_CODES.INVALID_STATUS_TRANSITION,
      {
        leaveRequestId,
        from,
        to,
        fromLifecycle: this.toLifecycleStatus(from),
        toLifecycle: this.toLifecycleStatus(to),
      },
    );
  }

  isTerminalState(status: LeaveRequestStatus): boolean {
    return ["approved", "rejected", "cancelled"].includes(status);
  }
}


