import { Module } from "@nestjs/common";
import { DepartmentsController } from "./departments.controller";
import { DepartmentsRepository } from "./repositories/departments.repository";
import { ListDepartmentsFlatUseCase } from "./use-cases/list-departments-flat.usecase";
import { ListDepartmentsUseCase } from "./use-cases/list-departments.usecase";
import { GetDepartmentUseCase } from "./use-cases/get-department.usecase";
import { CreateDepartmentUseCase } from "./use-cases/create-department.usecase";
import { UpdateDepartmentUseCase } from "./use-cases/update-department.usecase";
import { DeleteDepartmentUseCase } from "./use-cases/delete-department.usecase";
import { GetDepartmentStatsUseCase } from "./use-cases/get-department-stats.usecase";

@Module({
  controllers: [DepartmentsController],
  providers: [
    DepartmentsRepository,
    ListDepartmentsFlatUseCase,
    ListDepartmentsUseCase,
    GetDepartmentUseCase,
    CreateDepartmentUseCase,
    UpdateDepartmentUseCase,
    DeleteDepartmentUseCase,
    GetDepartmentStatsUseCase,
  ],
  exports: [DepartmentsRepository],
})
export class DepartmentsModule {}

