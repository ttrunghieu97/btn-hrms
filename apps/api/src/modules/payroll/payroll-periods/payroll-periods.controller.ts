import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CheckPolicy } from "../../../core/security/decorators/check-policy.decorator";
import { PayrollPolicies } from "../../../core/security/policies/payroll.policy";
import { AuditLog } from "../../../shared/decorators/audit-log.decorator";
import { PayrollPeriodQueryDto } from "./dto/payroll-period-query.dto";
import { CreatePayrollPeriodDto } from "./dto/create-payroll-period.dto";
import { UpdatePayrollPeriodDto } from "./dto/update-payroll-period.dto";
import { ListPayrollPeriodsUseCase } from "./use-cases/list-payroll-periods.usecase";
import { GetPayrollPeriodUseCase } from "./use-cases/get-payroll-period.usecase";
import { CreatePayrollPeriodUseCase } from "./use-cases/create-payroll-period.usecase";
import { UpdatePayrollPeriodUseCase } from "./use-cases/update-payroll-period.usecase";

@ApiTags("Payroll Periods")
@ApiBearerAuth()
@Controller()
export class PayrollPeriodsController {
  constructor(
    private readonly listPayrollPeriods: ListPayrollPeriodsUseCase,
    private readonly getPayrollPeriod: GetPayrollPeriodUseCase,
    private readonly createPayrollPeriod: CreatePayrollPeriodUseCase,
    private readonly updatePayrollPeriod: UpdatePayrollPeriodUseCase,
  ) {}

  @Get()
  @CheckPolicy(PayrollPolicies.view)
  @ApiOperation({ summary: "List payroll periods" })
  list(@Query() query: PayrollPeriodQueryDto) {
    return this.listPayrollPeriods.execute(query);
  }

  @Get(":id")
  @CheckPolicy(PayrollPolicies.view)
  @ApiOperation({ summary: "Get payroll period by id" })
  get(@Param("id", new ParseUUIDPipe()) id: string) {
    return this.getPayrollPeriod.execute(id);
  }

  @Post()
  @CheckPolicy(PayrollPolicies.managePeriods)
  @AuditLog({ action: "payroll_period_create", entity: "payroll_period" })
  @ApiOperation({ summary: "Create payroll period" })
  create(@Body() dto: CreatePayrollPeriodDto) {
    return this.createPayrollPeriod.execute(dto);
  }

  @Patch(":id")
  @CheckPolicy(PayrollPolicies.managePeriods)
  @AuditLog({ action: "payroll_period_update", entity: "payroll_period" })
  @ApiOperation({ summary: "Update payroll period" })
  update(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: UpdatePayrollPeriodDto,
  ) {
    return this.updatePayrollPeriod.execute(id, dto);
  }
}



