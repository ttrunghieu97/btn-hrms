import { Module } from "@nestjs/common";
import { EmployeeSocialInsuranceController } from "./employee-social-insurance.controller";
import { EmployeeSocialInsuranceRepository } from "./repositories/employee-social-insurance.repository";
import { ListEmployeeSocialInsurancesUseCase } from "./use-cases/list-employee-social-insurances.usecase";
import { CreateEmployeeSocialInsuranceUseCase } from "./use-cases/create-employee-social-insurance.usecase";
import { UpdateEmployeeSocialInsuranceUseCase } from "./use-cases/update-employee-social-insurance.usecase";
import { DeleteEmployeeSocialInsuranceUseCase } from "./use-cases/delete-employee-social-insurance.usecase";

@Module({
  controllers: [EmployeeSocialInsuranceController],
  providers: [
    EmployeeSocialInsuranceRepository,
    ListEmployeeSocialInsurancesUseCase,
    CreateEmployeeSocialInsuranceUseCase,
    UpdateEmployeeSocialInsuranceUseCase,
    DeleteEmployeeSocialInsuranceUseCase,
  ],
  exports: [
    EmployeeSocialInsuranceRepository,
  ],
})
export class EmployeeSocialInsuranceModule {}
