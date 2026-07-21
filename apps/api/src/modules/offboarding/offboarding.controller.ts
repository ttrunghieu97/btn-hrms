import {
  Body, Controller, Get, Param, Patch, Post, Query, Req,
} from "@nestjs/common";
import type { Request as ExpressRequest } from "express";
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from "@nestjs/swagger";
import { CheckPolicy } from "../../core/security/decorators/check-policy.decorator";
import { OffboardingPolicies } from "../../core/security/policies/offboarding.policy";
import { AuditLog } from "../../shared/decorators/audit-log.decorator";
import { AuthUser } from "../../core/security/types/auth-user.interface";
import { ListOffboardingsUseCase } from "./use-cases/list-offboardings.usecase";
import { GetOffboardingUseCase } from "./use-cases/get-offboarding.usecase";
import { CompleteChecklistItemUseCase } from "./use-cases/complete-checklist-item.usecase";
import { ScheduleExitInterviewUseCase } from "./use-cases/schedule-exit-interview.usecase";
import { RecordExitInterviewUseCase } from "./use-cases/record-exit-interview.usecase";
import { DecideClearanceUseCase } from "./use-cases/decide-clearance.usecase";
import { CompleteProcessUseCase } from "./use-cases/complete-process.usecase";
import { OffboardingProcessDetailDto } from "./dto/offboarding-process-response.dto";
import type { ClearanceDepartment, ClearanceDecision } from "./repositories/offboarding.repository";

interface AuthRequest extends ExpressRequest {
  user: AuthUser;
}

@ApiTags("Offboarding")
@ApiBearerAuth()
@Controller("offboarding")
export class OffboardingController {
  constructor(
    private readonly list: ListOffboardingsUseCase,
    private readonly get: GetOffboardingUseCase,
    private readonly completeItem: CompleteChecklistItemUseCase,
    private readonly scheduleInterview: ScheduleExitInterviewUseCase,
    private readonly recordInterview: RecordExitInterviewUseCase,
    private readonly decideClearanceUseCase: DecideClearanceUseCase,
    private readonly completeProcess: CompleteProcessUseCase,
  ) {}

  @Get()
  @CheckPolicy(OffboardingPolicies.view)
  @ApiOperation({ summary: "List offboarding processes" })
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
  @CheckPolicy(OffboardingPolicies.view)
  @ApiOperation({ summary: "Get offboarding process detail" })
  @ApiOkResponse({ type: OffboardingProcessDetailDto })
  async findOne(@Param("id") id: string) {
    const process = await this.get.execute(id);
    return {
      data: process,
      meta: { requestId: "", timestamp: new Date().toISOString() },
      error: null,
    };
  }

  @Patch(":id/tasks/:taskId")
  @CheckPolicy(OffboardingPolicies.edit)
  @AuditLog({ action: "offboarding_task_complete", entity: "offboarding" })
  @ApiOperation({ summary: "Complete or skip a checklist item" })
  async completeTask(
    @Param("id") id: string,
    @Param("taskId") taskId: string,
    @Body() body: { skip?: boolean },
    @Req() req: AuthRequest,
  ) {
    const result = await this.completeItem.execute(
      id,
      taskId,
      req.user.id,
      body.skip ?? false,
    );
    return {
      data: result,
      meta: { requestId: "", timestamp: new Date().toISOString() },
      error: null,
    };
  }

  @Post(":id/clearances/:department")
  @CheckPolicy(OffboardingPolicies.edit)
  @AuditLog({ action: "offboarding_clearance_decide", entity: "offboarding" })
  @ApiOperation({ summary: "Decide a departmental clearance (approve/reject)" })
  @ApiParam({ name: "id", type: "string" })
  @ApiParam({ name: "department", type: "string", enum: ["it", "hr", "finance", "manager", "security"] })
  async decideClearance(
    @Param("id") id: string,
    @Param("department") department: ClearanceDepartment,
    @Body() body: { decision: ClearanceDecision; note?: string },
    @Req() req: AuthRequest,
  ) {
    const result = await this.decideClearanceUseCase.execute({
      processId: id,
      department,
      decision: body.decision,
      decidedByUserId: req.user.id,
      note: body.note,
    });
    return {
      data: result,
      meta: { requestId: "", timestamp: new Date().toISOString() },
      error: null,
    };
  }

  @Post(":id/exit-interview")
  @CheckPolicy(OffboardingPolicies.exitInterview)
  @AuditLog({ action: "offboarding_exit_interview_schedule", entity: "offboarding" })
  @ApiOperation({ summary: "Schedule or reschedule an exit interview" })
  async scheduleExitInterview(
    @Param("id") id: string,
    @Body() body: { employeeId: string; interviewerUserId: string; scheduledAt: string },
  ) {
    const result = await this.scheduleInterview.execute({
      processId: id,
      employeeId: body.employeeId,
      interviewerUserId: body.interviewerUserId,
      scheduledAt: body.scheduledAt,
    });
    return {
      data: result,
      meta: { requestId: "", timestamp: new Date().toISOString() },
      error: null,
    };
  }

  @Patch(":id/exit-interview")
  @CheckPolicy(OffboardingPolicies.exitInterview)
  @AuditLog({ action: "offboarding_exit_interview_record", entity: "offboarding" })
  @ApiOperation({ summary: "Record exit interview responses" })
  async recordExitInterview(
    @Param("id") id: string,
    @Body() body: { responses?: Record<string, unknown>; notes?: string },
  ) {
    const result = await this.recordInterview.execute({
      processId: id,
      responses: body.responses,
      notes: body.notes,
    });
    return {
      data: result,
      meta: { requestId: "", timestamp: new Date().toISOString() },
      error: null,
    };
  }

  @Post(":id/complete")
  @CheckPolicy(OffboardingPolicies.complete)
  @AuditLog({ action: "offboarding_complete", entity: "offboarding" })
  @ApiOperation({ summary: "Complete offboarding process (gate: all clearances + mandatory items)" })
  async complete(@Param("id") id: string) {
    const result = await this.completeProcess.execute(id);
    return {
      data: result,
      meta: { requestId: "", timestamp: new Date().toISOString() },
      error: null,
    };
  }
}
