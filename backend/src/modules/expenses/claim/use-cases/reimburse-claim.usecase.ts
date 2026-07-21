import { Injectable } from "@nestjs/common";
import { ExpenseClaimRepository } from "../repositories/expense-claim.repository";
import { throwBadRequest, throwNotFound } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { EventOutboxService } from "../../../../core/events/event-outbox.service";
import { ExpenseClaimReimbursedEvent } from "../../../../core/events/events/expense-claim-reimbursed.event";
@Injectable()
export class ReimburseClaimUseCase {
  constructor(private readonly repo: ExpenseClaimRepository, private readonly eventOutbox: EventOutboxService) {}
  async execute(id: string): Promise<void> {
    const claim = await this.repo.findById(id);
    if (!claim) throwNotFound("Claim not found", ERROR_CODES.NOT_FOUND);
    if (claim.status !== "approved") throwBadRequest("Only approved claims can be reimbursed", ERROR_CODES.INVALID_REQUEST);
    await this.repo.update(id, { status: "reimbursed", reimbursedAt: new Date() });
    await this.eventOutbox.stage(new ExpenseClaimReimbursedEvent({ claimId: id, employeeId: claim.employeeId, totalAmount: claim.totalAmount }));
  }
}