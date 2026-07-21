import { Injectable } from "@nestjs/common";
import { ExpenseClaimRepository } from "../repositories/expense-claim.repository";
import { CreateClaimDto, ClaimResponseDto } from "../../dto/expense.dto";
import { throwBadRequest } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
@Injectable()
export class CreateClaimUseCase {
  constructor(private readonly repo: ExpenseClaimRepository) {}
  async execute(employeeId: string, dto: CreateClaimDto): Promise<ClaimResponseDto> {
    if (!dto.title?.trim()) throwBadRequest("Title is required", ERROR_CODES.INVALID_REQUEST);
    const r = await this.repo.insert({ employeeId, title: dto.title, description: dto.description ?? null, currency: dto.currency ?? "VND", status: "draft" });
    return { id: r.id, employeeId: r.employeeId, title: r.title, status: r.status, totalAmount: r.totalAmount, currency: r.currency };
  }
}