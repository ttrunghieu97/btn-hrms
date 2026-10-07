import {
  Controller,
  Get,
  Put,
  Param,
  Body,
  ParseUUIDPipe,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CheckPolicy } from "../../../core/security/decorators/check-policy.decorator";
import { SchedulePolicies } from "../../../core/security/policies/schedule.policy";
import { AuditLog } from "../../../shared/decorators/audit-log.decorator";
import { GetEmployeeQualificationsUseCase } from "./use-cases/get-employee-qualifications.usecase";
import { ReplaceEmployeeQualificationsUseCase } from "./use-cases/replace-employee-qualifications.usecase";
import { ReplaceEmployeeQualificationsDto } from "./dto/replace-employee-qualifications.dto";
import { mapQualificationToDto } from "./mappers/qualification.mapper";

@ApiTags("Employee Qualifications")
@ApiBearerAuth()
@Controller("qualifications")
export class QualificationsController {
  constructor(
    private readonly getUseCase: GetEmployeeQualificationsUseCase,
    private readonly replaceUseCase: ReplaceEmployeeQualificationsUseCase
  ) {}

  @Get()
  @CheckPolicy(SchedulePolicies.view)
  @ApiOperation({ summary: "Get employee qualifications" })
  async getQualifications(
    @Param("employeeId", new ParseUUIDPipe()) employeeId: string
  ) {
    const records = await this.getUseCase.execute(employeeId);
    return records.map(mapQualificationToDto);
  }

  @Put()
  @CheckPolicy(SchedulePolicies.update)
  @AuditLog({ action: "qualification_replace", entity: "employee_qualification" })
  @ApiOperation({ summary: "Replace employee qualifications" })
  async replaceQualifications(
    @Param("employeeId", new ParseUUIDPipe()) employeeId: string,
    @Body() dto: ReplaceEmployeeQualificationsDto
  ) {
    const records = await this.replaceUseCase.execute(employeeId, dto.positionIds);
    return records.map(mapQualificationToDto);
  }
}
