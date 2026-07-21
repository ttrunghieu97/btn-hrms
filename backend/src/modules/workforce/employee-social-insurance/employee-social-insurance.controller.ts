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
import { EmployeePolicies } from "../../../core/security/policies/employee.policy";
import { ListEmployeeSocialInsurancesUseCase } from "./use-cases/list-employee-social-insurances.usecase";
import { CreateEmployeeSocialInsuranceUseCase } from "./use-cases/create-employee-social-insurance.usecase";
import { UpdateEmployeeSocialInsuranceUseCase } from "./use-cases/update-employee-social-insurance.usecase";
import { DeleteEmployeeSocialInsuranceUseCase } from "./use-cases/delete-employee-social-insurance.usecase";
import { CreateSocialInsuranceDto, UpdateSocialInsuranceDto } from "./dto/social-insurance.dto";

@ApiTags("Employee Social Insurance")
@ApiBearerAuth()
@Controller("employees/:employeeId/social-insurance")
export class EmployeeSocialInsuranceController {
  constructor(
    private readonly listEnrollments: ListEmployeeSocialInsurancesUseCase,
    private readonly createEnrollment: CreateEmployeeSocialInsuranceUseCase,
    private readonly updateEnrollment: UpdateEmployeeSocialInsuranceUseCase,
    private readonly deleteEnrollment: DeleteEmployeeSocialInsuranceUseCase,
  ) {}

  @Get()
  @CheckPolicy(EmployeePolicies.view)
  @ApiOperation({ summary: "List social insurance enrollments of an employee" })
  findAll(@Param("employeeId") employeeId: string) {
    return this.listEnrollments.execute(employeeId);
  }

  @Post()
  @CheckPolicy(EmployeePolicies.edit)
  @ApiOperation({ summary: "Create a social insurance enrollment" })
  create(
    @Param("employeeId") employeeId: string,
    @Body() dto: CreateSocialInsuranceDto,
  ) {
    return this.createEnrollment.execute(employeeId, dto);
  }

  @Patch(":enrollmentId")
  @CheckPolicy(EmployeePolicies.edit)
  @ApiOperation({ summary: "Update a social insurance enrollment" })
  update(
    @Param("employeeId") _employeeId: string,
    @Param("enrollmentId") enrollmentId: string,
    @Body() dto: UpdateSocialInsuranceDto,
  ) {
    return this.updateEnrollment.execute(enrollmentId, dto);
  }

  @Delete(":enrollmentId")
  @CheckPolicy(EmployeePolicies.edit)
  @ApiOperation({ summary: "Delete a social insurance enrollment" })
  remove(
    @Param("employeeId") _employeeId: string,
    @Param("enrollmentId") enrollmentId: string,
  ) {
    return this.deleteEnrollment.execute(enrollmentId);
  }
}
