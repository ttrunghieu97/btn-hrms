import { Injectable } from "@nestjs/common";
import { ExpenseClaimRepository } from "../repositories/expense-claim.repository";
import { throwBadRequest, throwNotFound } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { EventOutboxService } from "../../../../core/events/event-outbox.service";
import { ExpenseClaimRejectedEvent } from "../../../../core/events/events/expense-claim-rejected.event";
@Injectable()
export class RejectClaimUseCase {
  constructor(private readonly repo: ExpenseClaimRepository, private readonly eventOutbox: EventOutboxService) {}
  async execute(id: string, rejectionReason?: string): Promise<void> {
    const claim = await this.repo.findById(id);
    if (!claim) throwNotFound("Claim not found", ERROR_CODES.NOT_FOUND);
    if (claim.status !== "submitted") throwBadRequest("Only submitted claims can be rejected", ERROR_CODES.INVALID_REQUEST);
    await this.repo.update(id, { status: "rejected", rejectionReason: rejectionReason ?? null });
    await this.eventOutbox.stage(new ExpenseClaimRejectedEvent({ claimId: id, employeeId: claim.employeeId, rejectionReason: rejectionReason ?? null }));
  }
}