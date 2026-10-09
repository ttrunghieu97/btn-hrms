import { Body, Controller, Get, Param, Patch, Post, Query, Req } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CheckPolicy } from "../../core/security/decorators/check-policy.decorator";
import { EmployeePolicies } from "../../core/security/policies/employee.policy";
import { AuditLog } from "../../shared/decorators/audit-log.decorator";
import { ListOnboardingProcessesUseCase } from "./use-cases/list-onboarding-processes.usecase";
import { GetOnboardingProcessUseCase } from "./use-cases/get-onboarding-process.usecase";
import { CompleteOnboardingTaskUseCase } from "./use-cases/complete-onboarding-task.usecase";

@ApiTags("Onboarding Processes")
@ApiBearerAuth()
@Controller("onboarding/processes")
export class BoardingProcessController {
  constructor(
    private readonly list: ListOnboardingProcessesUseCase,
    private readonly get: GetOnboardingProcessUseCase,
    private readonly completeTask: CompleteOnboardingTaskUseCase,
  ) {}

  @Get()
  @CheckPolicy(EmployeePolicies.view)
  @ApiOperation({ summary: "List onboarding processes" })
  async findAll(@Query("page") page?: number, @Query("limit") limit?: number) {
    const result = await this.list.execute(page ?? 1, limit ?? 20);
    return {
      data: result.rows,
      meta: {
        pagination: {
          total: result.total,
          page: page ?? 1,
          limit: limit ?? 20,
          hasNext: (page ?? 1) * (limit ?? 20) < result.total,
        },
        requestId: "",
        timestamp: new Date().toISOString(),
      },
      error: null,
    };
  }

  @Get(":id")
  @CheckPolicy(EmployeePolicies.view)
  @ApiOperation({ summary: "Get onboarding process detail" })
  async findOne(@Param("id") id: string) {
    const process = await this.get.execute(id);
    return {
      data: process,
      meta: { requestId: "", timestamp: new Date().toISOString() },
      error: null,
    };
  }

  @Post(":id/items/:itemId/complete")
  @CheckPolicy(EmployeePolicies.edit)
  @AuditLog({ action: "onboarding_item_complete", entity: "onboarding" })
  @ApiOperation({ summary: "Mark an onboarding checklist item as completed" })
  async completeItem(
    @Param("id") id: string,
    @Param("itemId") itemId: string,
    @Body() body: { note?: string },
    @Req() req: any,
  ) {
    const result = await this.completeTask.execute({
      processId: id,
      itemId,
      userId: req.user?.id,
      action: "complete",
      note: body?.note,
    });
    return {
      data: result,
      meta: { requestId: "", timestamp: new Date().toISOString() },
      error: null,
    };
  }

  @Post(":id/items/:itemId/reopen")
  @CheckPolicy(EmployeePolicies.edit)
  @AuditLog({ action: "onboarding_item_reopen", entity: "onboarding" })
  @ApiOperation({ summary: "Reopen a completed onboarding checklist item" })
  async reopenItem(
    @Param("id") id: string,
    @Param("itemId") itemId: string,
    @Body() body: { note?: string },
    @Req() req: any,
  ) {
    const result = await this.completeTask.execute({
      processId: id,
      itemId,
      userId: req.user?.id,
      action: "reopen",
      note: body?.note,
    });
    return {
      data: result,
      meta: { requestId: "", timestamp: new Date().toISOString() },
      error: null,
    };
  }

  @Post(":id/items/:itemId/skip")
  @CheckPolicy(EmployeePolicies.edit)
  @AuditLog({ action: "onboarding_item_skip", entity: "onboarding" })
  @ApiOperation({ summary: "Skip a non-mandatory onboarding checklist item" })
  async skipItem(
    @Param("id") id: string,
    @Param("itemId") itemId: string,
    @Body() body: { note?: string },
    @Req() req: any,
  ) {
    const result = await this.completeTask.execute({
      processId: id,
      itemId,
      userId: req.user?.id,
      action: "skip",
      note: body?.note,
    });
    return {
      data: result,
      meta: { requestId: "", timestamp: new Date().toISOString() },
      error: null,
    };
  }

  @Patch(":id/tasks/:taskId")
  @CheckPolicy(EmployeePolicies.edit)
  @AuditLog({ action: "onboarding_task_update", entity: "onboarding" })
  @ApiOperation({ summary: "Complete, reopen, or skip an onboarding task (alias)" })
  async updateTask(
    @Param("id") id: string,
    @Param("taskId") taskId: string,
    @Body() body: { action?: "complete" | "reopen" | "skip"; skip?: boolean; note?: string },
    @Req() req: any,
  ) {
    const action = body.action ?? (body.skip ? "skip" : "complete");
    const result = await this.completeTask.execute({
      processId: id,
      itemId: taskId,
      userId: req.user?.id,
      action,
      note: body.note,
    });
    return {
      data: result,
      meta: { requestId: "", timestamp: new Date().toISOString() },
      error: null,
    };
  }
}
