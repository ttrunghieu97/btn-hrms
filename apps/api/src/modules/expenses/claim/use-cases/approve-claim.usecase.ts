import { Injectable } from "@nestjs/common";
import { ExpenseClaimRepository } from "../repositories/expense-claim.repository";
import { throwBadRequest, throwNotFound } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { EventOutboxService } from "../../../../core/events/event-outbox.service";
import { ExpenseClaimApprovedEvent } from "../../../../core/events/events/expense-claim-approved.event";
@Injectable()
export class ApproveClaimUseCase {
  constructor(private readonly repo: ExpenseClaimRepository, private readonly eventOutbox: EventOutboxService) {}
  async execute(id: string, approvedByUserId: string): Promise<void> {
    const claim = await this.repo.findById(id);
    if (!claim) throwNotFound("Claim not found", ERROR_CODES.NOT_FOUND);
    if (claim.status !== "submitted") throwBadRequest("Only submitted claims can be approved", ERROR_CODES.INVALID_REQUEST);
    await this.repo.update(id, { status: "approved", approvedByUserId, approvedAt: new Date() });
    await this.eventOutbox.stage(new ExpenseClaimApprovedEvent({ claimId: id, employeeId: claim.employeeId, approvedByUserId }));
  }
}