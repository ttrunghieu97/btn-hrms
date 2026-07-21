import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, Req } from "@nestjs/common";
import type { Request as ExpressRequest } from "express";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CheckPolicy } from "../../../core/security/decorators/check-policy.decorator";
import { ApprovalPolicies } from "../policies/approval.policy";
import { AuditLog } from "../../../shared/decorators/audit-log.decorator";
import { RequestApprovalUseCase } from "../use-cases/request-approval.usecase";
import { DecideApprovalStepUseCase } from "../use-cases/decide-approval-step.usecase";
import { CancelApprovalUseCase } from "../use-cases/cancel-approval.usecase";
import { GetApprovalRequestUseCase } from "../use-cases/get-approval-request.usecase";
import { ListApprovalRequestsUseCase } from "../use-cases/list-approval-requests.usecase";
import { GetApprovalInboxUseCase } from "../use-cases/get-approval-inbox.usecase";
import { RequestApprovalDto } from "../dto/request-approval.dto";
import { DecideApprovalStepDto } from "../dto/decide-approval-step.dto";
import { ApprovalRequestQueryDto } from "../dto/approval-request-query.dto";
import type { AuthUser } from "../../../core/security/types/auth-user.interface";

interface AuthRequest extends ExpressRequest {
  user: AuthUser;
}

@ApiTags("Approval Engine")
@ApiBearerAuth()
@Controller("approval-requests")
export class ApprovalRequestController {
  constructor(
    private readonly requestApproval: RequestApprovalUseCase,
    private readonly decideStep: DecideApprovalStepUseCase,
    private readonly cancelApproval: CancelApprovalUseCase,
    private readonly getRequest: GetApprovalRequestUseCase,
    private readonly listRequests: ListApprovalRequestsUseCase,
    private readonly getInbox: GetApprovalInboxUseCase,
  ) {}

  @Post()
  @CheckPolicy(ApprovalPolicies.request)
  @AuditLog({ action: "approval_request_create", entity: "approval_request" })
  @ApiOperation({ summary: "Submit a new approval request" })
  async create(@Body() dto: RequestApprovalDto) {
    return this.requestApproval.execute(dto);
  }

  @Get("inbox")
  @CheckPolicy(ApprovalPolicies.inbox)
  @ApiOperation({ summary: "Get pending approval steps for current user" })
  async inbox(
    @Req() req: AuthRequest,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    return this.getInbox.execute(req.user.id, {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get()
  @CheckPolicy(ApprovalPolicies.viewRequests)
  @ApiOperation({ summary: "List approval requests" })
  async list(@Query() query: ApprovalRequestQueryDto) {
    return this.listRequests.execute(query);
  }

  @Get(":id")
  @CheckPolicy(ApprovalPolicies.viewRequests)
  @ApiOperation({ summary: "Get approval request details" })
  async get(@Param("id", new ParseUUIDPipe()) id: string) {
    return this.getRequest.execute(id);
  }

  @Post(":id/decide")
  @CheckPolicy(ApprovalPolicies.decide)
  @AuditLog({ action: "approval_step_decide", entity: "approval_step" })
  @ApiOperation({ summary: "Decide on an approval step" })
  async decide(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: DecideApprovalStepDto,
    @Req() req: AuthRequest,
  ) {
    return this.decideStep.execute({ ...dto, requestId: id }, req.user.id);
  }

  @Post(":id/cancel")
  @CheckPolicy(ApprovalPolicies.cancel)
  @AuditLog({ action: "approval_request_cancel", entity: "approval_request" })
  @ApiOperation({ summary: "Cancel an approval request" })
  async cancel(@Param("id", new ParseUUIDPipe()) id: string) {
    return this.cancelApproval.execute(id);
  }
}
