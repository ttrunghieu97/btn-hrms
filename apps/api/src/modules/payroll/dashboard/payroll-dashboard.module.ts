import { Module } from "@nestjs/common";
import { PayrollDashboardController } from "./payroll-dashboard.controller";
import { GetPayrollDashboardUseCase } from "./use-cases/get-payroll-dashboard.usecase";
import { PayrollDashboardRepository } from "./repositories/payroll-dashboard.repository";

@Module({
  controllers: [PayrollDashboardController],
  providers: [GetPayrollDashboardUseCase, PayrollDashboardRepository],
})
export class PayrollDashboardModule {}
