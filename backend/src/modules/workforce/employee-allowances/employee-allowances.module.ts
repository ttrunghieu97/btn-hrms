import { Module } from "@nestjs/common";
import { EmployeeAllowancesController } from "./employee-allowances.controller";
import { EmployeeAllowancesRepository } from "./repositories/employee-allowances.repository";
import { ListEmployeeAllowancesUseCase } from "./use-cases/list-employee-allowances.usecase";
import { CreateEmployeeAllowanceUseCase } from "./use-cases/create-employee-allowance.usecase";
import { UpdateEmployeeAllowanceUseCase } from "./use-cases/update-employee-allowance.usecase";
import { DeleteEmployeeAllowanceUseCase } from "./use-cases/delete-employee-allowance.usecase";

@Module({
  controllers: [EmployeeAllowancesController],
  providers: [
    EmployeeAllowancesRepository,
    ListEmployeeAllowancesUseCase,
    CreateEmployeeAllowanceUseCase,
    UpdateEmployeeAllowanceUseCase,
    DeleteEmployeeAllowanceUseCase,
  ],
  exports: [
    EmployeeAllowancesRepository,
  ],
})
export class EmployeeAllowancesModule {}
