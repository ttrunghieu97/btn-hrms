import { Injectable } from "@nestjs/common";
import { ExpenseClaimRepository } from "../repositories/expense-claim.repository";
import { ClaimResponseDto } from "../../dto/expense.dto";
import { throwNotFound } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
@Injectable()
export class GetClaimUseCase {
  constructor(private readonly repo: ExpenseClaimRepository) {}
  async execute(id: string): Promise<ClaimResponseDto> {
    const r = await this.repo.findById(id);
    if (!r) throwNotFound("Claim not found", ERROR_CODES.NOT_FOUND);
    return { id: r.id, employeeId: r.employeeId, title: r.title, status: r.status, totalAmount: r.totalAmount, currency: r.currency };
  }
}