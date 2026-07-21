import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CheckPolicy } from "../../../core/security/decorators/check-policy.decorator";
import { LeavePolicies } from "../../../core/security/policies/leave.policy";
import { AuditLog } from "../../../shared/decorators/audit-log.decorator";
import { LeaveAdminQueryDto } from "./dto/leave-admin-query.dto";
import { CreateLeavePolicyDto } from "./dto/create-leave-policy.dto";
import { UpdateLeavePolicyDto } from "./dto/update-leave-policy.dto";
import { CreateLeaveTypeDto } from "./dto/create-leave-type.dto";
import { UpdateLeaveTypeDto } from "./dto/update-leave-type.dto";
import {
  CreateLeavePolicyUseCase,
  CreateLeaveTypeUseCase,
  ListLeavePoliciesUseCase,
  ListLeaveTypesUseCase,
  UpdateLeavePolicyUseCase,
  UpdateLeaveTypeUseCase,
} from "./use-cases/leave-admin.usecases";

@ApiTags("Leave Administration")
@ApiBearerAuth()
@Controller()
export class LeaveAdminController {
  constructor(
    private readonly listLeavePolicies: ListLeavePoliciesUseCase,
    private readonly createLeavePolicy: CreateLeavePolicyUseCase,
    private readonly updateLeavePolicy: UpdateLeavePolicyUseCase,
    private readonly listLeaveTypes: ListLeaveTypesUseCase,
    private readonly createLeaveType: CreateLeaveTypeUseCase,
    private readonly updateLeaveType: UpdateLeaveTypeUseCase,
  ) {}

  @Get("policies")
  @CheckPolicy(LeavePolicies.view)
  @ApiOperation({ summary: "List leave policies" })
  listPolicies(@Query() query: LeaveAdminQueryDto) {
    return this.listLeavePolicies.execute(query);
  }

  @Post("policies")
  @CheckPolicy(LeavePolicies.edit)
  @AuditLog({ action: "leave_policy_create", entity: "leave_policy" })
  createPolicy(@Body() dto: CreateLeavePolicyDto) {
    return this.createLeavePolicy.execute(dto);
  }

  @Patch("policies/:id")
  @CheckPolicy(LeavePolicies.edit)
  @AuditLog({ action: "leave_policy_update", entity: "leave_policy" })
  updatePolicy(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateLeavePolicyDto,
  ) {
    return this.updateLeavePolicy.execute(id, dto);
  }

  @Get("types")
  @CheckPolicy(LeavePolicies.view)
  @ApiOperation({ summary: "List leave types" })
  listTypes(@Query() query: LeaveAdminQueryDto) {
    return this.listLeaveTypes.execute(query);
  }

  @Post("types")
  @CheckPolicy(LeavePolicies.edit)
  @AuditLog({ action: "leave_type_create", entity: "leave_type" })
  createType(@Body() dto: CreateLeaveTypeDto) {
    return this.createLeaveType.execute(dto);
  }

  @Patch("types/:id")
  @CheckPolicy(LeavePolicies.edit)
  @AuditLog({ action: "leave_type_update", entity: "leave_type" })
  updateType(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateLeaveTypeDto,
  ) {
    return this.updateLeaveType.execute(id, dto);
  }
}


