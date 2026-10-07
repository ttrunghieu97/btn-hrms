import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Request,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { QueryScopeService } from "../../../core/security/query-scope.service";
import { RequirePermission } from "../../../core/security/decorators/require-permission.decorator";
import { Permissions } from "../../../core/security/permissions/permissions.registry";
import { AuthUser } from "../../../core/security/types/auth-user.interface";
import { AuditLog } from "../../../shared/decorators/audit-log.decorator";
import {
  ApproveOvertimeDto,
  OvertimeQueryDto,
  RejectOvertimeDto,
  SubmitOvertimeRequestDto,
} from "./dto/overtime.dto";
import { ListOvertimeRequestsUseCase } from "./use-cases/list-overtime-requests.usecase";
import { Idempotent } from "../../../infrastructure/idempotency/idempotency.decorator";
import { SubmitOvertimeRequestUseCase } from "./use-cases/submit-overtime-request.usecase";
import { ApproveOvertimeRequestUseCase } from "./use-cases/approve-overtime-request.usecase";
import { RejectOvertimeRequestUseCase } from "./use-cases/reject-overtime-request.usecase";

@ApiTags("Attendance Overtime")
@ApiBearerAuth()
@Controller()
export class OvertimeController {
  constructor(
    private readonly queryScopeService: QueryScopeService,
    private readonly listOvertimeRequests: ListOvertimeRequestsUseCase,
    private readonly submitOvertimeRequest: SubmitOvertimeRequestUseCase,
    private readonly approveOvertimeRequest: ApproveOvertimeRequestUseCase,
    private readonly rejectOvertimeRequest: RejectOvertimeRequestUseCase,
  ) {}

  @Post("request")
  @Idempotent("POST:/attendance-overtime/request")
  @RequirePermission(Permissions.ATTENDANCE_OVERTIME_SUBMIT)
  @AuditLog({
    action: "attendance_overtime_request",
    entity: "attendance_overtime",
  })
  @ApiOperation({ summary: "Submit an overtime request" })
  @ApiOkResponse({ description: "Overtime request submitted" })
  async submit(
    @Request() req: { user: AuthUser },
    @Body() dto: SubmitOvertimeRequestDto,
  ) {
    return this.submitOvertimeRequest.execute(req.user.employeeId, dto);
  }

  @Post(":id/approve")
  @RequirePermission(Permissions.ATTENDANCE_OVERTIME_APPROVE)
  @AuditLog({
    action: "attendance_overtime_approve",
    entity: "attendance_overtime",
  })
  @ApiOperation({ summary: "Approve an overtime request (Manager only)" })
  @ApiOkResponse({ description: "Overtime request approved" })
  async approve(
    @Request() req: { user: AuthUser },
    @Param("id") id: string,
    @Body() dto: ApproveOvertimeDto,
  ) {
    return this.approveOvertimeRequest.execute(id, req.user.id, dto);
  }

  @Post(":id/reject")
  @RequirePermission(Permissions.ATTENDANCE_OVERTIME_APPROVE)
  @AuditLog({
    action: "attendance_overtime_reject",
    entity: "attendance_overtime",
  })
  @ApiOperation({ summary: "Reject an overtime request (Manager only)" })
  @ApiOkResponse({ description: "Overtime request rejected" })
  async reject(
    @Request() req: { user: AuthUser },
    @Param("id") id: string,
    @Body() dto: RejectOvertimeDto,
  ) {
    return this.rejectOvertimeRequest.execute(id, req.user.id, dto);
  }

  @Get()
  @RequirePermission(Permissions.ATTENDANCE_VIEW_SELF)
  @ApiOperation({ summary: "List overtime requests with filters" })
  @ApiOkResponse({ description: "List of overtime requests" })
  async list(
    @Query() query: OvertimeQueryDto,
    @Request() req: { user: AuthUser },
  ) {
    const scope = this.queryScopeService.resolveScope(req.user, "attendance");
    return this.listOvertimeRequests.execute(query, scope);
  }
}



