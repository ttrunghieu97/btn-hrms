import { Controller, Get, Query, Req } from "@nestjs/common";
import type { Request as ExpressRequest } from "express";
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from "@nestjs/swagger";
import { CheckPolicy } from "../../../core/security/decorators/check-policy.decorator";
import { WorkflowPolicies } from "../policies/workflow.policy";
import { GetMyWorkflowTasksUseCase } from "../use-cases/get-my-workflow-tasks.usecase";
import type { AuthUser } from "../../../core/security/types/auth-user.interface";

interface AuthRequest extends ExpressRequest {
  user: AuthUser;
}

@ApiTags("Workflow Tasks")
@ApiBearerAuth()
@Controller("workflow/tasks")
export class WorkflowTasksController {
  constructor(
    private readonly getMyTasks: GetMyWorkflowTasksUseCase,
  ) {}

  @Get("my")
  @CheckPolicy(WorkflowPolicies.viewTasks)
  @ApiOperation({
    summary: "Get aggregated actionable workflow tasks for current user",
  })
  @ApiQuery({
    name: "domain",
    required: false,
    description: "Filter tasks by domain (all, leave, expense, asset, schedule, payroll, attendance, offboarding)",
  })
  async myTasks(
    @Req() req: AuthRequest,
    @Query("domain") domain?: string,
  ) {
    return this.getMyTasks.execute(req.user.id, domain);
  }
}
