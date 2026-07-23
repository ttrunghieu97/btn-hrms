import { Body, Controller, Get, Param, Post, Request } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CheckPolicy } from "../../core/security/decorators/check-policy.decorator";
import { ExpensesPolicies } from "../../core/security/policies/expenses.policy";
import {
  CreateClaimUseCase, SubmitClaimUseCase, ApproveClaimUseCase,
  RejectClaimUseCase, ReimburseClaimUseCase, ListClaimsUseCase, GetClaimUseCase, AddItemUseCase,
} from "./claim/use-cases";
import { CreateClaimDto, AddItemDto } from "./dto/expense.dto";

@ApiTags("Expenses")
@ApiBearerAuth()
@Controller("expenses")
@CheckPolicy(ExpensesPolicies.access)
export class ExpensesController {
  constructor(
    private readonly createClaim: CreateClaimUseCase,
    private readonly submitClaim: SubmitClaimUseCase,
    private readonly approveClaim: ApproveClaimUseCase,
    private readonly rejectClaim: RejectClaimUseCase,
    private readonly reimburseClaim: ReimburseClaimUseCase,
    private readonly listClaims: ListClaimsUseCase,
    private readonly getClaim: GetClaimUseCase,
    private readonly addItem: AddItemUseCase,
  ) {}

  @Post("claims") create(@Body() d: CreateClaimDto, @Request() r: any) { return this.createClaim.execute(r.user?.userId, d); }
  @Get("claims") list(@Request() r: any) { return this.listClaims.execute(); }
  @Get("claims/:id") get(@Param("id") id: string) { return this.getClaim.execute(id); }
  @Post("claims/:id/submit") submit(@Param("id") id: string) { return this.submitClaim.execute(id); }
  @Post("claims/:id/approve") approve(@Param("id") id: string, @Request() r: any) { return this.approveClaim.execute(id, r.user?.userId); }
  @Post("claims/:id/reject") reject(@Param("id") id: string, @Body("reason") reason?: string) { return this.rejectClaim.execute(id, reason); }
  @Post("claims/:id/reimburse") reimburse(@Param("id") id: string) { return this.reimburseClaim.execute(id); }
  @Post("items") addClaimItem(@Body() d: AddItemDto) { return this.addItem.execute(d); }
}
