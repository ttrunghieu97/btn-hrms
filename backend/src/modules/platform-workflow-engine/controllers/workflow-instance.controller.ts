import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, Req } from "@nestjs/common";
import type { Request as ExpressRequest } from "express";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CheckPolicy } from "../../../core/security/decorators/check-policy.decorator";
import { WorkflowPolicies } from "../policies/workflow.policy";
import { AuditLog } from "../../../shared/decorators/audit-log.decorator";
import { StartWorkflowInstanceUseCase } from "../use-cases/start-workflow-instance.usecase";
import { TransitionWorkflowInstanceUseCase } from "../use-cases/transition-workflow-instance.usecase";
import { CancelWorkflowInstanceUseCase } from "../use-cases/cancel-workflow-instance.usecase";
import { GetWorkflowInstanceUseCase } from "../use-cases/get-workflow-instance.usecase";
import { ListWorkflowInstancesUseCase } from "../use-cases/list-workflow-instances.usecase";
import { StartWorkflowInstanceDto } from "../dto/start-workflow-instance.dto";
import { TransitionWorkflowInstanceDto } from "../dto/transition-workflow-instance.dto";
import { WorkflowInstanceQueryDto } from "../dto/workflow-instance-query.dto";
import type { AuthUser } from "../../../core/security/types/auth-user.interface";

interface AuthRequest extends ExpressRequest {
  user: AuthUser;
}

@ApiTags("Workflow Engine")
@ApiBearerAuth()
@Controller("workflow-instances")
export class WorkflowInstanceController {
  constructor(
    private readonly startInstance: StartWorkflowInstanceUseCase,
    private readonly transitionInstance: TransitionWorkflowInstanceUseCase,
    private readonly cancelInstance: CancelWorkflowInstanceUseCase,
    private readonly getInstance: GetWorkflowInstanceUseCase,
    private readonly listInstances: ListWorkflowInstancesUseCase,
  ) {}

  @Post()
  @CheckPolicy(WorkflowPolicies.startInstance)
  @AuditLog({ action: "workflow_instance_start", entity: "workflow_instance" })
  @ApiOperation({ summary: "Start a new workflow instance" })
  async create(@Body() dto: StartWorkflowInstanceDto, @Req() req: AuthRequest) {
    return this.startInstance.execute(dto, req.user.id);
  }

  @Get()
  @CheckPolicy(WorkflowPolicies.viewInstances)
  @ApiOperation({ summary: "List workflow instances" })
  async list(@Query() query: WorkflowInstanceQueryDto) {
    return this.listInstances.execute(query);
  }

  @Get(":id")
  @CheckPolicy(WorkflowPolicies.viewInstances)
  @ApiOperation({ summary: "Get workflow instance details" })
  async get(@Param("id", new ParseUUIDPipe()) id: string) {
    return this.getInstance.execute(id);
  }

  @Post(":id/transition")
  @CheckPolicy(WorkflowPolicies.transitionInstance)
  @AuditLog({ action: "workflow_instance_transition", entity: "workflow_instance" })
  @ApiOperation({ summary: "Execute a transition on a workflow instance" })
  async transition(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: TransitionWorkflowInstanceDto,
    @Req() req: AuthRequest,
  ) {
    return this.transitionInstance.execute(id, dto, req.user.id);
  }

  @Post(":id/cancel")
  @CheckPolicy(WorkflowPolicies.cancelInstance)
  @AuditLog({ action: "workflow_instance_cancel", entity: "workflow_instance" })
  @ApiOperation({ summary: "Cancel a workflow instance" })
  async cancel(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Req() req: AuthRequest,
  ) {
    return this.cancelInstance.execute(id, req.user.id);
  }
}
