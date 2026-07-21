import { Module } from "@nestjs/common";
import { EmployeeContractsController } from "./employee-contracts.controller";
import { EmployeeContractsRepository } from "./repositories/employee-contracts.repository";
import { GetEmployeeContractUseCase } from "./use-cases/get-employee-contract.usecase";
import { GetEmployeeContractHistoryUseCase } from "./use-cases/get-employee-contract-history.usecase";
import { UpdateEmployeeContractUseCase } from "./use-cases/update-employee-contract.usecase";

@Module({
  controllers: [EmployeeContractsController],
  providers: [
    EmployeeContractsRepository,
    GetEmployeeContractUseCase,
    GetEmployeeContractHistoryUseCase,
    UpdateEmployeeContractUseCase,
  ],
  exports: [
    EmployeeContractsRepository,
  ],
})
export class EmployeeContractsModule {}

