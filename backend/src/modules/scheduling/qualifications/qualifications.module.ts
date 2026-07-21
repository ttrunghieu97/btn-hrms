import { Module } from "@nestjs/common";
import { RouterModule } from "@nestjs/core";
import { QualificationsController } from "./qualifications.controller";
import { EmployeeQualificationsRepository } from "./repositories/employee-qualifications.repository";
import { GetEmployeeQualificationsUseCase } from "./use-cases/get-employee-qualifications.usecase";
import { ReplaceEmployeeQualificationsUseCase } from "./use-cases/replace-employee-qualifications.usecase";

@Module({
  controllers: [QualificationsController],
  providers: [
    EmployeeQualificationsRepository,
    GetEmployeeQualificationsUseCase,
    ReplaceEmployeeQualificationsUseCase,
  ],
  exports: [EmployeeQualificationsRepository],
})
export class QualificationsModule {}
