import { Controller, Get, Put, Patch, Post, Param, Body, Request } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags, ApiProperty } from "@nestjs/swagger";
import { IsArray, IsInt, IsOptional, IsUUID, Min, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { CheckPolicy } from "../../../core/security/decorators/check-policy.decorator";
import { SchedulePolicies } from "../../../core/security/policies/schedule.policy";
import { AuditLog } from "../../../shared/decorators/audit-log.decorator";
import { type AuthUser } from "../../../core/security/types/auth-user.interface";
import { EnsureScheduleUseCase } from "./use-cases/ensure-schedule.usecase";
import { GetRequirementsUseCase } from "./use-cases/get-requirements.usecase";
import { ReplaceRequirementsUseCase } from "./use-cases/replace-requirements.usecase";
import { PublishScheduleUseCase } from "./use-cases/publish-schedule.usecase";
import { LockScheduleUseCase } from "./use-cases/lock-schedule.usecase";
import { GetScheduleDashboardUseCase } from "./use-cases/get-schedule-dashboard.usecase";

class RequirementDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  locationId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  workRoleId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  shiftTemplateId?: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  requiredCount: number;
}

class ReplaceRequirementsBody {
  @ApiProperty({ type: [RequirementDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RequirementDto)
  requirements: RequirementDto[];
}

@ApiTags("Schedule Core")
@ApiBearerAuth()
@Controller()
export class ScheduleCoreController {
  constructor(
    private readonly ensureSchedule: EnsureScheduleUseCase,
    private readonly getRequirements: GetRequirementsUseCase,
    private readonly replaceRequirements: ReplaceRequirementsUseCase,
    private readonly publishSchedule: PublishScheduleUseCase,
    private readonly lockSchedule: LockScheduleUseCase,
    private readonly getDashboard: GetScheduleDashboardUseCase,
  ) {}

  @Get("dates/:date")
  @CheckPolicy(SchedulePolicies.view)
  @ApiOperation({ summary: "Ensure schedule exists for date" })
  async getDate(@Param("date") date: string) {
    return this.ensureSchedule.execute(date);
  }

  @Get("dates/:date/dashboard")
  @CheckPolicy(SchedulePolicies.view)
  @ApiOperation({ summary: "Get schedule dashboard: requirements + coverage + assignments" })
  async dashboard(@Param("date") date: string) {
    return this.getDashboard.execute(date);
  }

  @Get("dates/:date/requirements")
  @CheckPolicy(SchedulePolicies.view)
  @ApiOperation({ summary: "Get shift requirements for a date" })
  async getReqs(@Param("date") date: string) {
    return this.getRequirements.execute(date);
  }

  @Put("dates/:date/requirements")
  @CheckPolicy(SchedulePolicies.update)
  @AuditLog({ action: "schedule_requirements_replace", entity: "schedule_requirement" })
  @ApiOperation({ summary: "Replace all shift requirements for a date (bulk)" })
  async putReqs(@Param("date") date: string, @Body() body: ReplaceRequirementsBody) {
    return this.replaceRequirements.execute(date, body.requirements);
  }

  @Patch("dates/:date/requirements")
  @CheckPolicy(SchedulePolicies.update)
  @AuditLog({ action: "schedule_requirements_upsert", entity: "schedule_requirement" })
  @ApiOperation({ summary: "Upsert shift requirements (partial). requiredCount=0 deletes." })
  async patchReqs(@Param("date") date: string, @Body() body: ReplaceRequirementsBody) {
    return this.replaceRequirements.upsert(date, body.requirements);
  }

  @Post("dates/:date/publish")
  @CheckPolicy(SchedulePolicies.update)
  @AuditLog({ action: "schedule_publish", entity: "daily_schedule" })
  @ApiOperation({ summary: "Publish schedule for a date" })
  async publish(@Param("date") date: string, @Request() req: Request & { user: AuthUser }) {
    return this.publishSchedule.execute(date, req.user.id);
  }

  @Post("dates/:date/lock")
  @CheckPolicy(SchedulePolicies.update)
  @AuditLog({ action: "schedule_lock", entity: "daily_schedule" })
  @ApiOperation({ summary: "Lock schedule for a date. Blocks edits." })
  async lock(@Param("date") date: string, @Request() req: Request & { user: AuthUser }) {
    const isAdmin = req.user.permissions?.includes("sys:all") ?? false;
    return this.lockSchedule.execute(date, req.user.id, isAdmin);
  }
}
