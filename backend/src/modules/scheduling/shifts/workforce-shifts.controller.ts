import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Request,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CheckPolicy } from "../../../core/security/decorators/check-policy.decorator";
import { QueryScopeService } from "../../../core/security/query-scope.service";
import { type AuthUser } from "../../../core/security/types/auth-user.interface";
import { SchedulePolicies } from "../../../core/security/policies/schedule.policy";
import { AuditLog } from "../../../shared/decorators/audit-log.decorator";
import { WorkforceShiftTemplateQueryDto } from "./dto/workforce-shift-template-query.dto";
import { CreateWorkforceShiftTemplateDto } from "./dto/create-workforce-shift-template.dto";
import { UpdateWorkforceShiftTemplateDto } from "./dto/update-workforce-shift-template.dto";
import { EmployeeShiftAssignmentQueryDto } from "./dto/employee-shift-assignment-query.dto";
import { CreateEmployeeShiftAssignmentDto } from "./dto/create-employee-shift-assignment.dto";
import { UpdateEmployeeShiftAssignmentDto } from "./dto/update-employee-shift-assignment.dto";
import { CancelEmployeeShiftAssignmentDto } from "./dto/cancel-employee-shift-assignment.dto";
import { ShiftRosterQueryDto } from "./dto/shift-roster-query.dto";
import { PublishShiftRosterDto } from "./dto/publish-shift-roster.dto";
import { SubmitShiftRosterDto } from "./dto/submit-shift-roster.dto";
import { ApproveShiftRosterDto } from "./dto/approve-shift-roster.dto";
import { RejectShiftRosterDto } from "./dto/reject-shift-roster.dto";
import {
  ListWorkforceShiftTemplatesUseCase,
  CreateWorkforceShiftTemplateUseCase,
  UpdateWorkforceShiftTemplateUseCase,
  ArchiveWorkforceShiftTemplateUseCase,
} from "./shift-catalog/use-cases/workforce-shift-template.usecases";
import {
  ListEmployeeShiftAssignmentsUseCase,
  CreateEmployeeShiftAssignmentUseCase,
  UpdateEmployeeShiftAssignmentUseCase,
  CancelEmployeeShiftAssignmentUseCase,
} from "./schedule-roster/use-cases/assignments/employee-shift-assignment.usecases";
import {
  ApproveShiftRosterUseCase,
  PublishShiftRosterUseCase,
  QueryShiftRosterUseCase,
  RejectShiftRosterUseCase,
  SubmitShiftRosterForApprovalUseCase,
} from "./schedule-roster/use-cases/roster/shift-roster.usecases";

@ApiTags("Workforce Schedules")
@ApiBearerAuth()
@Controller()
export class WorkforceShiftsController {
  constructor(
    private readonly listTemplates: ListWorkforceShiftTemplatesUseCase,
    private readonly createTemplate: CreateWorkforceShiftTemplateUseCase,
    private readonly updateTemplate: UpdateWorkforceShiftTemplateUseCase,
    private readonly archiveTemplate: ArchiveWorkforceShiftTemplateUseCase,
    private readonly listAssignments: ListEmployeeShiftAssignmentsUseCase,
    private readonly createAssignment: CreateEmployeeShiftAssignmentUseCase,
    private readonly updateAssignment: UpdateEmployeeShiftAssignmentUseCase,
    private readonly cancelAssignment: CancelEmployeeShiftAssignmentUseCase,
    private readonly queryRoster: QueryShiftRosterUseCase,
    private readonly submitRoster: SubmitShiftRosterForApprovalUseCase,
    private readonly approveRoster: ApproveShiftRosterUseCase,
    private readonly rejectRoster: RejectShiftRosterUseCase,
    private readonly publishRoster: PublishShiftRosterUseCase,
    private readonly queryScopeService: QueryScopeService,
  ) {}

  @Get("templates")
  @CheckPolicy(SchedulePolicies.view)
  @ApiOperation({ summary: "List schedule templates" })
  listTemplatesApi(@Query() query: WorkforceShiftTemplateQueryDto) {
    return this.listTemplates.execute(query);
  }

  @Post("templates")
  @CheckPolicy(SchedulePolicies.create)
  @AuditLog({ action: "schedule_template_create", entity: "schedule_template" })
  @ApiOperation({ summary: "Create schedule template" })
  createTemplateApi(@Body() dto: CreateWorkforceShiftTemplateDto) {
    return this.createTemplate.execute(dto);
  }

  @Patch("templates/:id")
  @CheckPolicy(SchedulePolicies.update)
  @AuditLog({ action: "schedule_template_update", entity: "schedule_template" })
  @ApiOperation({ summary: "Update schedule template" })
  updateTemplateApi(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateWorkforceShiftTemplateDto,
  ) {
    return this.updateTemplate.execute(id, dto);
  }

  @Post("templates/:id/archive")
  @CheckPolicy(SchedulePolicies.delete)
  @AuditLog({
    action: "schedule_template_archive",
    entity: "schedule_template",
  })
  @ApiOperation({ summary: "Archive schedule template" })
  archiveTemplateApi(@Param("id", new ParseUUIDPipe()) id: string) {
    return this.archiveTemplate.execute(id);
  }

  @Get("assignments")
  @CheckPolicy(SchedulePolicies.view)
  @ApiOperation({ summary: "List employee schedule assignments" })
  listAssignmentsApi(
    @Query() query: EmployeeShiftAssignmentQueryDto,
    @Request() req: Request & { user: AuthUser },
  ) {
    const scope = this.queryScopeService.resolveScope(req.user, "schedule");
    return this.listAssignments.execute(query, scope);
  }

  @Post("assignments")
  @CheckPolicy(SchedulePolicies.create)
  @AuditLog({
    action: "schedule_assignment_create",
    entity: "schedule_assignment",
  })
  @ApiOperation({ summary: "Assign employee to schedule" })
  createAssignmentApi(
    @Body() dto: CreateEmployeeShiftAssignmentDto,
    @Request() req: Request & { user: AuthUser },
  ) {
    const scope = this.queryScopeService.resolveScope(req.user, "schedule");
    return this.createAssignment.execute(dto, scope);
  }

  @Patch("assignments/:id")
  @CheckPolicy(SchedulePolicies.update)
  @AuditLog({
    action: "schedule_assignment_update",
    entity: "schedule_assignment",
  })
  @ApiOperation({ summary: "Update schedule assignment" })
  updateAssignmentApi(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateEmployeeShiftAssignmentDto,
    @Request() req: Request & { user: AuthUser },
  ) {
    const scope = this.queryScopeService.resolveScope(req.user, "schedule");
    return this.updateAssignment.execute(id, dto, scope);
  }

  @Post("assignments/:id/cancel")
  @CheckPolicy(SchedulePolicies.update)
  @AuditLog({
    action: "schedule_assignment_cancel",
    entity: "schedule_assignment",
  })
  @ApiOperation({ summary: "Cancel schedule assignment" })
  cancelAssignmentApi(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: CancelEmployeeShiftAssignmentDto,
    @Request() req: Request & { user: AuthUser },
  ) {
    const scope = this.queryScopeService.resolveScope(req.user, "schedule");
    return this.cancelAssignment.execute(id, dto, scope);
  }

  @Get("roster")
  @CheckPolicy(SchedulePolicies.view)
  @ApiOperation({ summary: "Query schedule roster" })
  queryRosterApi(
    @Query() query: ShiftRosterQueryDto,
    @Request() req: Request & { user: AuthUser },
  ) {
    const scope = this.queryScopeService.resolveScope(req.user, "schedule");
    return this.queryRoster.execute(query, scope);
  }

  @Post("roster/submit")
  @CheckPolicy(SchedulePolicies.create)
  @AuditLog({ action: "schedule_roster_submit", entity: "schedule_roster" })
  @ApiOperation({ summary: "Submit schedule roster for approval" })
  submitRosterApi(@Body() dto: SubmitShiftRosterDto) {
    return this.submitRoster.execute(dto);
  }

  @Post("roster/approve")
  @CheckPolicy(SchedulePolicies.update)
  @AuditLog({ action: "schedule_roster_approve", entity: "schedule_roster" })
  @ApiOperation({ summary: "Approve schedule roster" })
  approveRosterApi(@Body() dto: ApproveShiftRosterDto) {
    return this.approveRoster.execute(dto);
  }

  @Post("roster/reject")
  @CheckPolicy(SchedulePolicies.update)
  @AuditLog({ action: "schedule_roster_reject", entity: "schedule_roster" })
  @ApiOperation({ summary: "Reject schedule roster" })
  rejectRosterApi(@Body() dto: RejectShiftRosterDto) {
    return this.rejectRoster.execute(dto);
  }

  @Post("roster/publish")
  @CheckPolicy(SchedulePolicies.create)
  @AuditLog({ action: "schedule_roster_publish", entity: "schedule_roster" })
  @ApiOperation({ summary: "Publish schedule roster" })
  publishRosterApi(@Body() dto: PublishShiftRosterDto) {
    return this.publishRoster.execute(dto);
  }
}
