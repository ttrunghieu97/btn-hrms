import { Module } from "@nestjs/common";
import { PayrollController } from "./payroll.controller";
import { PayrollRepository } from "./repositories/payroll.repository";
import { ListPayrollUseCase } from "./use-cases/list-payroll.usecase";
import { GetPayrollByEmployeeUseCase } from "./use-cases/get-payroll-by-employee.usecase";
import { UpsertPayrollUseCase } from "./use-cases/upsert-payroll.usecase";
import { CalculateFinalSettlementUseCase } from "./use-cases/calculate-final-settlement.usecase";
import { PayrollEmployeeTerminatedSubscriber } from "../interfaces/event-subscribers/employee-terminated.subscriber";
import { PayrollOffboardingCompletedSubscriber } from "../interfaces/event-subscribers/offboarding-completed.subscriber";

@Module({
  controllers: [PayrollController],
  providers: [
    PayrollRepository,
    ListPayrollUseCase,
    GetPayrollByEmployeeUseCase,
    UpsertPayrollUseCase,
    CalculateFinalSettlementUseCase,
    PayrollEmployeeTerminatedSubscriber,
    PayrollOffboardingCompletedSubscriber,
  ],
})
export class PayrollModule {}



