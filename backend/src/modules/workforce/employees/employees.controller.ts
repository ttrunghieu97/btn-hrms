import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  Request,
  UseInterceptors,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { Idempotent } from "../../../infrastructure/idempotency/idempotency.decorator";
import { AnyFilesInterceptor } from "@nestjs/platform-express";
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiOkResponse,
  ApiCreatedResponse,
} from "@nestjs/swagger";
import {
  EmployeeEnvelopeDto,
  EmployeeListEnvelopeDto,
} from "./dto/employee-response.dto";
import { CreateEmployeeDto } from "./dto/create-employee.dto";
import { UpdateEmployeeDto } from "./dto/update-employee.dto";
import { EmployeeDataPipe } from "./employee-data.pipe";
import { EmployeeQueryDto } from "./dto/employee-query.dto";
import { AuditLog } from "../../../shared/decorators/audit-log.decorator";
import { CheckPolicy } from "../../../core/security/decorators/check-policy.decorator";
import { Resource } from "../../../core/security/decorators/resource.decorator";
import { EmployeePolicies } from "../../../core/security/policies/employee.policy";
import { Employee } from "../../../core/security/types/resource-entities";
import { QueryScopeService } from "../../../core/security/query-scope.service";
import { Permissions } from "../../../core/security/permissions/permissions.registry";
import type { AuthUser } from "../../../core/security/types/auth-user.interface";
import { ListEmployeesUseCase } from "./use-cases/list-employees.usecase";
import { GetEmployeeByUserUseCase } from "./use-cases/get-employee-by-user.usecase";
import { GetEmployeeUseCase } from "./use-cases/get-employee.usecase";
import { CreateEmployeeUseCase } from "./use-cases/create-employee.usecase";
import { UpdateEmployeeUseCase } from "./use-cases/update-employee.usecase";

const SENSITIVE_PERMISSION = Permissions.EMPLOYEES_MANAGE_SENSITIVE;

function hasSensitiveAccess(user: AuthUser): boolean {
  return (
    user.isSuperAdmin === true ||
    user.permissions?.includes(Permissions.SYS_ALL) === true ||
    user.permissions?.includes(SENSITIVE_PERMISSION) === true
  );
}

@ApiTags("Employees HR Management")
@ApiBearerAuth()
@Controller("employees")
export class EmployeesController {
  constructor(
    private readonly listEmployees: ListEmployeesUseCase,
    private readonly getEmployeeByUser: GetEmployeeByUserUseCase,
    private readonly getEmployee: GetEmployeeUseCase,
    private readonly createEmployee: CreateEmployeeUseCase,
    private readonly updateEmployee: UpdateEmployeeUseCase,
    private readonly queryScopeService: QueryScopeService,
  ) {}

  @Get()
  @Throttle({ default: { ttl: 60_000, limit: 60 } })
  @CheckPolicy(EmployeePolicies.view)
  @ApiOperation({ summary: "List or filter employees" })
  @ApiOkResponse({ type: EmployeeListEnvelopeDto })
  findAll(
    @Query() query: EmployeeQueryDto,
    @Request() req: { user: AuthUser }
  ) {
    if (query.tab === 'deleted') {
      query.includeDeleted = true;
    }
    const scope = this.queryScopeService.resolveScope(req.user, "employees");
    const sensitiveAllowed = hasSensitiveAccess(req.user);
    return this.listEmployees.execute(query, scope, sensitiveAllowed);
  }

  @Get("me")
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  @CheckPolicy(EmployeePolicies.viewSelf)
  @ApiOperation({ summary: "Get current employee profile" })
  @ApiOkResponse({ type: EmployeeEnvelopeDto })
  getMyProfile(@Request() req: { user: AuthUser }) {
    return this.getEmployeeByUser.execute(req.user.id, true);
  }

  @Get(":id")
  @Throttle({ default: { ttl: 60_000, limit: 60 } })
  @Resource(Employee, "id")
  @CheckPolicy(EmployeePolicies.view)
  @ApiOperation({ summary: "Get employee by ID" })
  @ApiOkResponse({ type: EmployeeEnvelopeDto })
  findOne(
    @Param("id") id: string,
    @Query() query: EmployeeQueryDto,
    @Request() req: { user: AuthUser },
  ) {
    const sensitiveAllowed = hasSensitiveAccess(req.user);
    return this.getEmployee.execute(id, query, sensitiveAllowed);
  }

  @Post()
  @Throttle({ default: { ttl: 60_000, limit: 20 } })
  @Idempotent("POST:/employees")
  @CheckPolicy(EmployeePolicies.create)
  @AuditLog({ action: "employee_create", entity: "employee" })
  @UseInterceptors(AnyFilesInterceptor())
  @ApiOperation({ summary: "Create a new employee profile" })
  @ApiCreatedResponse({ type: EmployeeEnvelopeDto })
  create(@Body(EmployeeDataPipe) data: CreateEmployeeDto) {
    return this.createEmployee.execute(data);
  }

  @Put(":id")
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  @Resource(Employee, "id")
  @CheckPolicy(EmployeePolicies.edit)
  @AuditLog({ action: "employee_update", entity: "employee" })
  @UseInterceptors(AnyFilesInterceptor())
  @ApiOperation({ summary: "Update employee details" })
  @ApiOkResponse({ type: EmployeeEnvelopeDto })
  update(
    @Param("id") id: string,
    @Body(EmployeeDataPipe) data: UpdateEmployeeDto,
  ) {
    return this.updateEmployee.execute(id, data);
  }
}

