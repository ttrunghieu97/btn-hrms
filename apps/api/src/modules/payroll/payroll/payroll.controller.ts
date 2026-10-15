import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  Request,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CheckPolicy } from "../../../core/security/decorators/check-policy.decorator";
import { Resource } from "../../../core/security/decorators/resource.decorator";
import { PayrollPolicies } from "../../../core/security/policies/payroll.policy";
import { Employee } from "../../../core/security/types/resource-entities";
import { QueryScopeService } from "../../../core/security/query-scope.service";
import { AuthUser } from "../../../core/security/types/auth-user.interface";
import { AuditLog } from "../../../shared/decorators/audit-log.decorator";
import { PayrollQueryDto } from "./dto/payroll-query.dto";
import { UpsertPayrollDto } from "./dto/upsert-payroll.dto";
import { ListPayrollUseCase } from "./use-cases/list-payroll.usecase";
import { GetPayrollByEmployeeUseCase } from "./use-cases/get-payroll-by-employee.usecase";
import { UpsertPayrollUseCase } from "./use-cases/upsert-payroll.usecase";

@ApiTags("Payroll")
@ApiBearerAuth()
@Controller()
export class PayrollController {
  constructor(
    private readonly listPayroll: ListPayrollUseCase,
    private readonly getPayrollByEmployee: GetPayrollByEmployeeUseCase,
    private readonly upsertPayroll: UpsertPayrollUseCase,
    private readonly queryScopeService: QueryScopeService,
  ) {}

  @Get()
  @CheckPolicy(PayrollPolicies.viewAll)
  @ApiOperation({ summary: "List payroll records" })
  async list(@Query() query: PayrollQueryDto) {
    return this.listPayroll.execute(query);
  }

  @Get(":employeeId")
  @Resource(Employee, "employeeId")
  @CheckPolicy(PayrollPolicies.view)
  @ApiOperation({ summary: "Get payroll by employee" })
  async getByEmployee(
    @Param("employeeId", new ParseUUIDPipe()) employeeId: string,
    @Request() req?: { user?: AuthUser },
  ) {
    const scope = req?.user
      ? this.queryScopeService.resolveScope(req.user, "payroll")
      : undefined;
    return this.getPayrollByEmployee.execute(employeeId, scope);
  }

  @Patch(":employeeId")
  @Resource(Employee, "employeeId")
  @CheckPolicy(PayrollPolicies.update)
  @AuditLog({ action: "payroll_upsert", entity: "payroll" })
  @ApiOperation({ summary: "Upsert payroll by employee" })
  async upsert(
    @Param("employeeId", new ParseUUIDPipe()) employeeId: string,
    @Body() dto: UpsertPayrollDto,
  ) {
    return this.upsertPayroll.execute(employeeId, dto);
  }
}



