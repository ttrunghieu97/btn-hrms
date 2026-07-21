import { Injectable } from "@nestjs/common";
import { ExpenseClaimRepository } from "../repositories/expense-claim.repository";
import { ClaimResponseDto } from "../../dto/expense.dto";
@Injectable()
export class ListClaimsUseCase {
  constructor(private readonly repo: ExpenseClaimRepository) {}
  async execute(employeeId?: string): Promise<ClaimResponseDto[]> {
    const rows = await this.repo.findMany(employeeId);
    return rows.map((r) => ({ id: r.id, employeeId: r.employeeId, title: r.title, status: r.status, totalAmount: r.totalAmount, currency: r.currency }));
  }
}