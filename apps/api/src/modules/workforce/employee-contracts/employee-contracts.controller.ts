import { Body, Controller, Get, Param, Patch } from "@nestjs/common";
import { AuditLog } from "../../../shared/decorators/audit-log.decorator";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CheckPolicy } from "../../../core/security/decorators/check-policy.decorator";
import { Resource } from "../../../core/security/decorators/resource.decorator";
import { EmployeePolicies } from "../../../core/security/policies/employee.policy";
import { Employee } from "../../../core/security/types/resource-entities";
import { GetEmployeeContractUseCase } from "./use-cases/get-employee-contract.usecase";
import { GetEmployeeContractHistoryUseCase } from "./use-cases/get-employee-contract-history.usecase";
import { UpdateEmployeeContractUseCase } from "./use-cases/update-employee-contract.usecase";
import { UpdateEmployeeContractDto } from "./dto/update-employee-contract.dto";

@ApiTags("Employee Contracts")
@ApiBearerAuth()
@Controller("employees/:employeeId/contract")
export class EmployeeContractsController {
  constructor(
    private readonly getContract: GetEmployeeContractUseCase,
    private readonly getHistory: GetEmployeeContractHistoryUseCase,
    private readonly updateContract: UpdateEmployeeContractUseCase,
  ) {}

  @Get()
  @Resource(Employee, "employeeId")
  @CheckPolicy(EmployeePolicies.view)
  @ApiOperation({ summary: "Get employee contract" })
  get(@Param("employeeId") employeeId: string) {
    return this.getContract.execute(employeeId);
  }

  @Get("history")
  @Resource(Employee, "employeeId")
  @CheckPolicy(EmployeePolicies.view)
  @ApiOperation({ summary: "Get employee contract version history" })
  history(@Param("employeeId") employeeId: string) {
    return this.getHistory.execute(employeeId);
  }

  @Patch()
  @Resource(Employee, "employeeId")
  @CheckPolicy(EmployeePolicies.edit)
  @AuditLog({ action: "employee_contract_update", entity: "employee" })
  @ApiOperation({ summary: "Update employee contract" })
  update(
    @Param("employeeId") employeeId: string,
    @Body() dto: UpdateEmployeeContractDto,
  ) {
    return this.updateContract.execute(employeeId, dto);
  }
}

