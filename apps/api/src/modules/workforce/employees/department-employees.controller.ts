import { Controller, Get, Param, ParseUUIDPipe, Query, Request } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CheckPolicy } from "../../../core/security/decorators/check-policy.decorator";
import { EmployeePolicies } from "../../../core/security/policies/employee.policy";
import { EmployeeQueryDto } from "./dto/employee-query.dto";
import { ListEmployeesUseCase } from "./use-cases/list-employees.usecase";
import { QueryScopeService } from "../../../core/security/query-scope.service";
import { AuthUser } from "../../../core/security/types/auth-user.interface";

@ApiTags("Department Employees")
@ApiBearerAuth()
@Controller("departments")
export class DepartmentEmployeesController {
  constructor(
    private readonly listEmployees: ListEmployeesUseCase,
    private readonly queryScopeService: QueryScopeService
  ) {}

  @Get(":id/employees")
  @CheckPolicy(EmployeePolicies.view)
  @ApiOperation({ summary: "List employees belonging to a department" })
  listByDepartment(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Query() query: EmployeeQueryDto,
    @Request() req: { user: AuthUser }
  ) {
    query.departmentId = id;
    const scope = this.queryScopeService.resolveScope(req.user, "employees");
    return this.listEmployees.execute(query, scope);
  }
}


