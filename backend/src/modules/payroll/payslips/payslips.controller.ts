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
import { PayrollPolicies } from "../../../core/security/policies/payroll.policy";
import { AuditLog } from "../../../shared/decorators/audit-log.decorator";
import { PayslipQueryDto } from "./dto/payslip-query.dto";
import { PublishPayslipDto } from "./dto/publish-payslip.dto";
import { ListPayslipsUseCase } from "./use-cases/list-payslips.usecase";
import { GetPayslipUseCase } from "./use-cases/get-payslip.usecase";
import { PublishPayslipUseCase } from "./use-cases/publish-payslip.usecase";
import { QueryScopeService } from "../../../core/security/query-scope.service";
import { AuthUser } from "../../../core/security/types/auth-user.interface";

@ApiTags("Payslips")
@ApiBearerAuth()
@Controller()
export class PayslipsController {
  constructor(
    private readonly listPayslips: ListPayslipsUseCase,
    private readonly getPayslip: GetPayslipUseCase,
    private readonly publishPayslip: PublishPayslipUseCase,
    private readonly queryScopeService: QueryScopeService,
  ) {}

  @Get()
  @CheckPolicy(PayrollPolicies.view)
  @ApiOperation({ summary: "List payslips" })
  list(@Query() query: PayslipQueryDto, @Request() req: { user: AuthUser }) {
    const scope = this.queryScopeService.resolveScope(req.user, "payroll");
    return this.listPayslips.execute(query, scope);
  }

  @Get(":id")
  @CheckPolicy(PayrollPolicies.view)
  @ApiOperation({ summary: "Get payslip by id" })
  get(@Param("id", new ParseUUIDPipe()) id: string) {
    return this.getPayslip.execute(id);
  }

  @Patch(":id/publish")
  @CheckPolicy(PayrollPolicies.managePayslips)
  @AuditLog({ action: "payslip_publish", entity: "payslip" })
  @ApiOperation({ summary: "Publish payslip" })
  publish(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: PublishPayslipDto,
  ) {
    return this.publishPayslip.execute(id, dto);
  }
}



