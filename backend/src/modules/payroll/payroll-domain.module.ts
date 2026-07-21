import { Module } from "@nestjs/common";
import { RouterModule } from "@nestjs/core";
import { PayrollModule } from "./payroll/payroll.module";
import { PayrollPeriodsModule } from "./payroll-periods/payroll-periods.module";
import { PayslipsModule } from "./payslips/payslips.module";
import { SalaryStructuresModule } from "./salary-structures/salary-structures.module";
import { PayrollRunsModule } from "./payroll-runs/payroll-runs.module";
import { PayrollDashboardModule } from "./dashboard/payroll-dashboard.module";

@Module({
  imports: [
    PayrollModule,
    PayrollPeriodsModule,
    PayslipsModule,
    SalaryStructuresModule,
    PayrollRunsModule,
    PayrollDashboardModule,
    RouterModule.register([
      { path: "payroll", module: PayrollModule },
      { path: "payroll", module: PayrollDashboardModule },
      { path: "payroll/periods", module: PayrollPeriodsModule },
      { path: "payroll/payslips", module: PayslipsModule },
      { path: "payroll/salary-structures", module: SalaryStructuresModule },
      { path: "payroll/runs", module: PayrollRunsModule },
    ]),
  ],
})
export class PayrollDomainModule {}



