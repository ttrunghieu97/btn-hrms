import { Controller, Get } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CheckPolicy } from "../../../core/security/decorators/check-policy.decorator";
import { PayrollPolicies } from "../../../core/security/policies/payroll.policy";
import { GetPayrollDashboardUseCase } from "./use-cases/get-payroll-dashboard.usecase";

@ApiTags("Payroll Dashboard")
@ApiBearerAuth()
@Controller()
export class PayrollDashboardController {
  constructor(
    private readonly getPayrollDashboard: GetPayrollDashboardUseCase,
  ) {}

  @Get("dashboard")
  @CheckPolicy(PayrollPolicies.view)
  @ApiOperation({ summary: "Get payroll dashboard overview" })
  async getDashboard() {
    return this.getPayrollDashboard.execute();
  }
}
