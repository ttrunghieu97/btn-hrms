import { Injectable } from "@nestjs/common";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { throwBadRequest, throwConflict } from "../../../../shared/utils/http-error";

@Injectable()
export class LeaveApprovalPolicyService {
  assertSufficientBalance(balance: any, requestedUnits: number) {
    if (!balance) {
      throwBadRequest(
        "Leave balance record not found for this year",
        ERROR_CODES.INVALID_REQUEST,
      );
    }

    const available =
      Number(balance.openingBalance) +
      Number(balance.accruedAmount) +
      Number(balance.carriedOverAmount) +
      Number(balance.adjustedAmount) -
      Number(balance.usedAmount);

    if (requestedUnits > available) {
      throwBadRequest(
        "Insufficient leave balance",
        ERROR_CODES.INVALID_REQUEST,
        {
          requested: requestedUnits,
          available,
        },
      );
    }
  }

  assertNoOverlap(overlap: any) {
    if (!overlap) {
      return;
    }

    throwConflict(
      "Leave request overlaps with another approved request",
      ERROR_CODES.SCHEDULE_CONFLICT,
      {
        overlappingRequestId: overlap.id,
      },
    );
  }
}







