import { Module } from "@nestjs/common";
import { ExpensesController } from "./expenses.controller";
import { ExpenseClaimRepository } from "./claim/repositories/expense-claim.repository";
import {
  CreateClaimUseCase, SubmitClaimUseCase, ApproveClaimUseCase,
  RejectClaimUseCase, ReimburseClaimUseCase, ListClaimsUseCase, GetClaimUseCase, AddItemUseCase,
} from "./claim/use-cases";

@Module({
  controllers: [ExpensesController],
  providers: [
    ExpenseClaimRepository,
    CreateClaimUseCase, SubmitClaimUseCase, ApproveClaimUseCase,
    RejectClaimUseCase, ReimburseClaimUseCase, ListClaimsUseCase, GetClaimUseCase, AddItemUseCase,
  ],
})
export class ExpensesDomainModule {}
