import { Module } from "@nestjs/common";
import { EmployeeDocumentRepository } from "../employees/repositories/employee-document.repository";
import { EmployeesRepository } from "../employees/repositories/employees.repository";
import { EmployeeDocumentsController } from "./employee-documents.controller";
import { ListEmployeeDocumentsUseCase } from "./use-cases/list-employee-documents.usecase";
import { CreateEmployeeDocumentUseCase } from "./use-cases/create-employee-document.usecase";
import { DeleteEmployeeDocumentUseCase } from "./use-cases/delete-employee-document.usecase";

@Module({
  controllers: [EmployeeDocumentsController],
  providers: [
    EmployeeDocumentRepository,
    EmployeesRepository,
    ListEmployeeDocumentsUseCase,
    CreateEmployeeDocumentUseCase,
    DeleteEmployeeDocumentUseCase,
  ],
})
export class EmployeeDocumentsModule {}

