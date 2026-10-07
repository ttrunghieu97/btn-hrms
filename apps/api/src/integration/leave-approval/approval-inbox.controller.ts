import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Request as ExpressRequest } from "express";
import { CheckPolicy } from "@/core/security/decorators/check-policy.decorator";
import { LeavePolicies } from "@/core/security/policies/leave.policy";
import { ApprovalInboxRepository } from "./approval-inbox.repository";
import { LeaveApprovalGateway } from "./leave-approval.gateway";
import type { AuthUser } from "@/core/security/types/auth-user.interface";

interface AuthRequest extends ExpressRequest {
  user: AuthUser;
}

export class InboxDecisionDto {
  comment?: string;
}

@ApiTags("Approval Inbox")
@ApiBearerAuth()
@Controller("api/v1/approval/inbox")
export class ApprovalInboxController {
  constructor(
    private readonly inboxService: ApprovalInboxRepository,
    private readonly gateway: LeaveApprovalGateway,
  ) {}

  @Get()
  @CheckPolicy(LeavePolicies.approve)
  @ApiOperation({ summary: "List pending leave approval requests for current user" })
  list(@Req() req: AuthRequest) {
    return this.inboxService.listByApprover(req.user.id);
  }

  @Post(":id/approve")
  @CheckPolicy(LeavePolicies.approve)
  @ApiOperation({ summary: "Approve a pending leave request" })
  async approve(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: InboxDecisionDto,
    @Req() req: AuthRequest,
  ) {
    const step = await this.gateway.findPendingStepByApprover(id, req.user.id);
    if (!step) return { error: "No pending step found for this user" };

    return this.gateway.decideStep({
      requestId: id,
      stepIndex: step.stepIndex,
      decision: "approve",
      decidedByUserId: req.user.id,
      comment: dto.comment,
    });
  }

  @Post(":id/reject")
  @CheckPolicy(LeavePolicies.approve)
  @ApiOperation({ summary: "Reject a pending leave request" })
  async reject(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: InboxDecisionDto,
    @Req() req: AuthRequest,
  ) {
    const step = await this.gateway.findPendingStepByApprover(id, req.user.id);
    if (!step) return { error: "No pending step found for this user" };

    return this.gateway.decideStep({
      requestId: id,
      stepIndex: step.stepIndex,
      decision: "reject",
      decidedByUserId: req.user.id,
      comment: dto.comment,
    });
  }
}
