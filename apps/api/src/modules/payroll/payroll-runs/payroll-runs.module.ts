import { Module } from "@nestjs/common";
import { PayrollRunsController } from "./payroll-runs.controller";
import { PayrollRunsRepository } from "./repositories/payroll-runs.repository";
import {
  ApprovePayrollRunUseCase,
  CreatePayrollRunUseCase,
  GeneratePayrollRunUseCase,
  GetPayrollRunUseCase,
  ListPayrollRunsUseCase,
  PostPayrollRunUseCase,
  RejectPayrollRunUseCase,
  RequestPayrollApprovalUseCase,
  UpdatePayrollRunUseCase,
} from "./use-cases/payroll-runs.usecases";
import { PayrollRunStateMachine } from "./services/payroll-run-state-machine";
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
    ApprovePayrollRunUseCase,
    RejectPayrollRunUseCase,
    RequestPayrollApprovalUseCase,
    PostPayrollRunUseCase,
    PayrollRunStateMachine,
  ],
})
export class PayrollRunsModule {}



