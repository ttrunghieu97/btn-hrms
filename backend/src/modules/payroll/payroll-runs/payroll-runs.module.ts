import { Module } from "@nestjs/common";
import { PayrollRunsController } from "./payroll-runs.controller";
import { PayrollRunsRepository } from "./repositories/payroll-runs.repository";
import {
  CreatePayrollRunUseCase,
  GeneratePayrollRunUseCase,
  GetPayrollRunUseCase,
  ListPayrollRunsUseCase,
  UpdatePayrollRunUseCase,
} from "./use-cases/payroll-runs.usecases";
import { ContractsModule } from "../../../contracts";

@Module({
  imports: [ContractsModule],
  controllers: [PayrollRunsController],
  providers: [
    PayrollRunsRepository,
    ListPayrollRunsUseCase,
    GetPayrollRunUseCase,
    CreatePayrollRunUseCase,
    UpdatePayrollRunUseCase,
    GeneratePayrollRunUseCase,
  ],
})
export class PayrollRunsModule {}



