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
import { ListEmployeeAllowancesUseCase } from "./use-cases/list-employee-allowances.usecase";
import { CreateEmployeeAllowanceUseCase } from "./use-cases/create-employee-allowance.usecase";
import { UpdateEmployeeAllowanceUseCase } from "./use-cases/update-employee-allowance.usecase";
import { DeleteEmployeeAllowanceUseCase } from "./use-cases/delete-employee-allowance.usecase";
import { CreateAllowanceDto, UpdateAllowanceDto } from "./dto/allowance.dto";

@ApiTags("Employee Allowances")
@ApiBearerAuth()
@Resource(Employee, "employeeId")
@Controller("employees/:employeeId/allowances")
export class EmployeeAllowancesController {
  constructor(
    private readonly listAllowances: ListEmployeeAllowancesUseCase,
    private readonly createAllowance: CreateEmployeeAllowanceUseCase,
    private readonly updateAllowance: UpdateEmployeeAllowanceUseCase,
    private readonly deleteAllowance: DeleteEmployeeAllowanceUseCase,
  ) {}

  @Get()
  @Resource(Employee, "employeeId")
  @CheckPolicy(EmployeePolicies.view)
  @ApiOperation({ summary: "List allowances of an employee" })
  findAll(@Param("employeeId") employeeId: string) {
    return this.listAllowances.execute(employeeId);
  }

  @Post()
  @Resource(Employee, "employeeId")
  @CheckPolicy(EmployeePolicies.edit)
  @AuditLog({ action: "employee_allowance_create", entity: "employee_allowance" })
  @ApiOperation({ summary: "Add an allowance to employee" })
  create(
    @Param("employeeId") employeeId: string,
    @Body() dto: CreateAllowanceDto,
  ) {
    return this.createAllowance.execute(employeeId, dto);
  }

  @Patch(":allowanceId")
  @Resource(Employee, "employeeId")
  @CheckPolicy(EmployeePolicies.edit)
  @AuditLog({ action: "employee_allowance_update", entity: "employee_allowance" })
  @ApiOperation({ summary: "Update an allowance" })
  update(
    @Param("employeeId") employeeId: string,
    @Param("allowanceId") allowanceId: string,
    @Body() dto: UpdateAllowanceDto,
  ) {
    return this.updateAllowance.execute(allowanceId, dto, employeeId);
  }

  @Delete(":allowanceId")
  @Resource(Employee, "employeeId")
  @CheckPolicy(EmployeePolicies.edit)
  @AuditLog({ action: "employee_allowance_delete", entity: "employee_allowance" })
  @ApiOperation({ summary: "Delete an allowance" })
  remove(
    @Param("employeeId") employeeId: string,
    @Param("allowanceId") allowanceId: string,
  ) {
    return this.deleteAllowance.execute(allowanceId, employeeId);
  }
}
