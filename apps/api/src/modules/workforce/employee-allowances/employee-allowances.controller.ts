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
import { ListEmployeeAllowancesUseCase } from "./use-cases/list-employee-allowances.usecase";
import { CreateEmployeeAllowanceUseCase } from "./use-cases/create-employee-allowance.usecase";
import { UpdateEmployeeAllowanceUseCase } from "./use-cases/update-employee-allowance.usecase";
import { DeleteEmployeeAllowanceUseCase } from "./use-cases/delete-employee-allowance.usecase";
import { CreateAllowanceDto, UpdateAllowanceDto } from "./dto/allowance.dto";

@ApiTags("Employee Allowances")
@ApiBearerAuth()
@Controller("employees/:employeeId/allowances")
export class EmployeeAllowancesController {
  constructor(
    private readonly listAllowances: ListEmployeeAllowancesUseCase,
    private readonly createAllowance: CreateEmployeeAllowanceUseCase,
    private readonly updateAllowance: UpdateEmployeeAllowanceUseCase,
    private readonly deleteAllowance: DeleteEmployeeAllowanceUseCase,
  ) {}

  @Get()
  @CheckPolicy(EmployeePolicies.view)
  @ApiOperation({ summary: "List allowances of an employee" })
  findAll(@Param("employeeId") employeeId: string) {
    return this.listAllowances.execute(employeeId);
  }

  @Post()
  @CheckPolicy(EmployeePolicies.edit)
  @ApiOperation({ summary: "Add an allowance to employee" })
  create(
    @Param("employeeId") employeeId: string,
    @Body() dto: CreateAllowanceDto,
  ) {
    return this.createAllowance.execute(employeeId, dto);
  }

  @Patch(":allowanceId")
  @CheckPolicy(EmployeePolicies.edit)
  @ApiOperation({ summary: "Update an allowance" })
  update(
    @Param("employeeId") _employeeId: string,
    @Param("allowanceId") allowanceId: string,
    @Body() dto: UpdateAllowanceDto,
  ) {
    return this.updateAllowance.execute(allowanceId, dto);
  }

  @Delete(":allowanceId")
  @CheckPolicy(EmployeePolicies.edit)
  @ApiOperation({ summary: "Delete an allowance" })
  remove(
    @Param("employeeId") _employeeId: string,
    @Param("allowanceId") allowanceId: string,
  ) {
    return this.deleteAllowance.execute(allowanceId);
  }
}
