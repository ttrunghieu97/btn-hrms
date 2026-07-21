import { Injectable } from "@nestjs/common";
import { ExpenseClaimRepository } from "../repositories/expense-claim.repository";
import { AddItemDto } from "../../dto/expense.dto";
import { throwBadRequest, throwNotFound } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
@Injectable()
export class AddItemUseCase {
  constructor(private readonly repo: ExpenseClaimRepository) {}
  async execute(dto: AddItemDto): Promise<void> {
    const claim = await this.repo.findById(dto.claimId);
    if (!claim) throwNotFound("Claim not found", ERROR_CODES.NOT_FOUND);
    if (claim.status !== "draft") throwBadRequest("Can only add items to draft claims", ERROR_CODES.INVALID_REQUEST);
    await this.repo.addItem({ claimId: dto.claimId, categoryId: dto.categoryId ?? null, description: dto.description, amount: String(dto.amount), expenseDate: dto.expenseDate, receiptRequired: dto.receiptRequired ?? false });
  }
}