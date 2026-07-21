import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
} from "@nestjs/common";
import type { Request as ExpressRequest } from "express";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CheckPolicy } from "../../../core/security/decorators/check-policy.decorator";
import { Resource } from "../../../core/security/decorators/resource.decorator";
import { LeavePolicies } from "../../../core/security/policies/leave.policy";
import { Employee } from "../../../core/security/types/resource-entities";
import { AuditLog } from "../../../shared/decorators/audit-log.decorator";
import { CreateLeaveRequestDto } from "./dto/create-leave-request.dto";
import { UpdateLeaveRequestDto } from "./dto/update-leave-request.dto";
import { LeaveRequestQueryDto } from "./dto/leave-request-query.dto";
import { ListLeaveRequestsUseCase } from "./use-cases/list-leave-requests.usecase";
import { GetLeaveRequestUseCase } from "./use-cases/get-leave-request.usecase";
import { CreateLeaveRequestUseCase } from "./use-cases/create-leave-request.usecase";
import { UpdateLeaveRequestUseCase } from "./use-cases/update-leave-request.usecase";
import { CancelLeaveRequestUseCase } from "./use-cases/cancel-leave-request.usecase";
import { ListEmployeeLeaveBalancesUseCase } from "./use-cases/list-employee-leave-balances.usecase";
import { Idempotent } from "../../../infrastructure/idempotency/idempotency.decorator";
import { AuthUser } from "../../../core/security/types/auth-user.interface";

interface AuthRequest extends ExpressRequest {
  user: AuthUser;
}

@ApiTags("Leave Management")
@ApiBearerAuth()
@Controller()
export class LeaveManagementController {
  constructor(
    private readonly listLeaveRequests: ListLeaveRequestsUseCase,
    private readonly getLeaveRequest: GetLeaveRequestUseCase,
    private readonly createLeaveRequest: CreateLeaveRequestUseCase,
    private readonly updateLeaveRequest: UpdateLeaveRequestUseCase,
    private readonly cancelLeaveRequest: CancelLeaveRequestUseCase,
    private readonly listEmployeeLeaveBalances: ListEmployeeLeaveBalancesUseCase,
  ) {}

  @Get()
  @CheckPolicy(LeavePolicies.view)
  @ApiOperation({ summary: "List leave requests" })
  list(@Query() query: LeaveRequestQueryDto) {
    return this.listLeaveRequests.execute(query);
  }

  @Get("balances/:employeeId")
  @Resource(Employee, "employeeId")
  @CheckPolicy(LeavePolicies.viewBalance)
  @ApiOperation({ summary: "List leave balances by employee" })
  listBalances(@Param("employeeId", new ParseUUIDPipe()) employeeId: string) {
    return this.listEmployeeLeaveBalances.execute(employeeId);
  }

  @Get(":id")
  @CheckPolicy(LeavePolicies.view)
  @ApiOperation({ summary: "Get leave request details" })
  get(@Param("id", new ParseUUIDPipe()) id: string) {
    return this.getLeaveRequest.execute(id);
  }

  @Post()
  @Idempotent("POST:/leave-requests")
  @CheckPolicy(LeavePolicies.create)
  @AuditLog({ action: "leave_request_create", entity: "leave_request" })
  @ApiOperation({ summary: "Create leave request" })
  create(@Body() dto: CreateLeaveRequestDto, @Req() req: AuthRequest) {
    return this.createLeaveRequest.execute(dto, req.user.employeeId);
  }

  @Patch(":id")
  @CheckPolicy(LeavePolicies.edit)
  @AuditLog({ action: "leave_request_update", entity: "leave_request" })
  @ApiOperation({ summary: "Update leave request" })
  update(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateLeaveRequestDto,
  ) {
    return this.updateLeaveRequest.execute(id, dto);
  }

  @Post(":id/cancel")
  @Idempotent("POST:/leave-requests/:id/cancel")
  @CheckPolicy(LeavePolicies.edit)
  @AuditLog({ action: "leave_request_cancel", entity: "leave_request" })
  @ApiOperation({ summary: "Cancel leave request" })
  cancel(@Param("id", new ParseUUIDPipe()) id: string, @Req() req: AuthRequest) {
    return this.cancelLeaveRequest.execute(id, req.user);
  }
}


