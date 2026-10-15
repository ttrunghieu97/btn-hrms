import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from "@nestjs/common";
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
} from "@nestjs/swagger";
import { CheckPolicy } from "../../../core/security/decorators/check-policy.decorator";
import { Resource } from "../../../core/security/decorators/resource.decorator";
import { Employee } from "../../../core/security/types/resource-entities";
import { EmployeePolicies } from "../../../core/security/policies/employee.policy";
import { AuditLog } from "../../../shared/decorators/audit-log.decorator";
import { ListEmployeeSocialInsurancesUseCase } from "./use-cases/list-employee-social-insurances.usecase";
import { CreateEmployeeSocialInsuranceUseCase } from "./use-cases/create-employee-social-insurance.usecase";
import { UpdateEmployeeSocialInsuranceUseCase } from "./use-cases/update-employee-social-insurance.usecase";
import { DeleteEmployeeSocialInsuranceUseCase } from "./use-cases/delete-employee-social-insurance.usecase";
import { CreateSocialInsuranceDto, UpdateSocialInsuranceDto } from "./dto/social-insurance.dto";

@ApiTags("Employee Social Insurance")
@ApiBearerAuth()
@Resource(Employee, "employeeId")
@Controller("employees/:employeeId/social-insurance")
export class EmployeeSocialInsuranceController {
  constructor(
    private readonly listEnrollments: ListEmployeeSocialInsurancesUseCase,
    private readonly createEnrollment: CreateEmployeeSocialInsuranceUseCase,
    private readonly updateEnrollment: UpdateEmployeeSocialInsuranceUseCase,
    private readonly deleteEnrollment: DeleteEmployeeSocialInsuranceUseCase,
  ) {}

  @Get()
  @Resource(Employee, "employeeId")
  @CheckPolicy(EmployeePolicies.view)
  @ApiOperation({ summary: "List social insurance enrollments of an employee" })
  findAll(@Param("employeeId") employeeId: string) {
    return this.listEnrollments.execute(employeeId);
  }

  @Post()
  @Resource(Employee, "employeeId")
  @CheckPolicy(EmployeePolicies.edit)
  @AuditLog({ action: "employee_social_insurance_create", entity: "employee_social_insurance" })
  @ApiOperation({ summary: "Create a social insurance enrollment" })
  create(
    @Param("employeeId") employeeId: string,
    @Body() dto: CreateSocialInsuranceDto,
  ) {
    return this.createEnrollment.execute(employeeId, dto);
  }

  @Patch(":enrollmentId")
  @Resource(Employee, "employeeId")
  @CheckPolicy(EmployeePolicies.edit)
  @AuditLog({ action: "employee_social_insurance_update", entity: "employee_social_insurance" })
  @ApiOperation({ summary: "Update a social insurance enrollment" })
  update(
    @Param("employeeId") employeeId: string,
    @Param("enrollmentId") enrollmentId: string,
    @Body() dto: UpdateSocialInsuranceDto,
  ) {
    return this.updateEnrollment.execute(enrollmentId, dto, employeeId);
  }

  @Delete(":enrollmentId")
  @Resource(Employee, "employeeId")
  @CheckPolicy(EmployeePolicies.edit)
  @AuditLog({ action: "employee_social_insurance_delete", entity: "employee_social_insurance" })
  @ApiOperation({ summary: "Delete a social insurance enrollment" })
  remove(
    @Param("employeeId") employeeId: string,
    @Param("enrollmentId") enrollmentId: string,
  ) {
    return this.deleteEnrollment.execute(enrollmentId, employeeId);
  }
}
