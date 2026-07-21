import { Module } from "@nestjs/common";
import { PayrollPeriodsController } from "./payroll-periods.controller";
import { PayrollPeriodsRepository } from "./repositories/payroll-periods.repository";
import { ListPayrollPeriodsUseCase } from "./use-cases/list-payroll-periods.usecase";
import { GetPayrollPeriodUseCase } from "./use-cases/get-payroll-period.usecase";
import { CreatePayrollPeriodUseCase } from "./use-cases/create-payroll-period.usecase";
import { UpdatePayrollPeriodUseCase } from "./use-cases/update-payroll-period.usecase";

@Module({
  controllers: [PayrollPeriodsController],
  providers: [
    PayrollPeriodsRepository,
    ListPayrollPeriodsUseCase,
    GetPayrollPeriodUseCase,
    CreatePayrollPeriodUseCase,
    UpdatePayrollPeriodUseCase,
  ],
})
export class PayrollPeriodsModule {}



