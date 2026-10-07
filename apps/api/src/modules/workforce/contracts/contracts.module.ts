import { Module } from "@nestjs/common";
import { EmployeeContractsRepository } from "../employee-contracts/repositories/employee-contracts.repository";
import { EmployeeContractsModule } from "../employee-contracts/employee-contracts.module";
import { ContractsController } from "./contracts.controller";
import { ContractQueryRepository } from "./repositories/contract-query.repository";
import { ListContractsUseCase } from "./use-cases/list-contracts.usecase";
import { GetContractUseCase } from "./use-cases/get-contract.usecase";
import { CreateContractUseCase } from "./use-cases/create-contract.usecase";
import { AmendContractUseCase } from "./use-cases/amend-contract.usecase";
import { GetContractHistoryUseCase } from "./use-cases/get-contract-history.usecase";

@Module({
  imports: [EmployeeContractsModule],
  controllers: [ContractsController],
  providers: [
    ContractQueryRepository,
    ListContractsUseCase,
    GetContractUseCase,
    CreateContractUseCase,
    AmendContractUseCase,
    GetContractHistoryUseCase,
  ],
  exports: [ContractQueryRepository],
})
export class ContractsModule {}
