import { Injectable } from "@nestjs/common";
import { ExpenseClaimRepository } from "../repositories/expense-claim.repository";
import { throwBadRequest, throwNotFound } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { EventOutboxService } from "../../../../core/events/event-outbox.service";
import { ExpenseClaimSubmittedEvent } from "../../../../core/events/events/expense-claim-submitted.event";
@Injectable()
export class SubmitClaimUseCase {
  constructor(private readonly repo: ExpenseClaimRepository, private readonly eventOutbox: EventOutboxService) {}
  async execute(id: string): Promise<void> {
    const claim = await this.repo.findById(id);
    if (!claim) throwNotFound("Claim not found", ERROR_CODES.NOT_FOUND);
    if (claim.status !== "draft") throwBadRequest("Only draft claims can be submitted", ERROR_CODES.INVALID_REQUEST);
    const items = await this.repo.findItems(id);
    if (items.length === 0) throwBadRequest("Claim must have at least one item", ERROR_CODES.INVALID_REQUEST);
    const total = items.reduce((s, i) => s + Number(i.amount), 0).toFixed(2);
    await this.repo.update(id, { status: "submitted", totalAmount: total, submittedAt: new Date() });
    await this.eventOutbox.stage(new ExpenseClaimSubmittedEvent({ claimId: id, employeeId: claim.employeeId, totalAmount: total }));
  }
}