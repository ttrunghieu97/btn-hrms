import { Injectable } from "@nestjs/common";
import { EmployeeDocumentRepository } from "../../employees/repositories/employee-document.repository";
import { EmployeesRepository } from "../../employees/repositories/employees.repository";
import { throwNotFound } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";

@Injectable()
export class DeleteEmployeeDocumentUseCase {
  constructor(
    private readonly employeesRepo: EmployeesRepository,
    private readonly documentRepo: EmployeeDocumentRepository,
  ) {}

  async execute(employeeId: string, documentId: string) {
    const employee = await this.employeesRepo.findEmployeeById(employeeId);
    if (!employee) {
      throwNotFound("Employee not found", ERROR_CODES.EMPLOYEE_NOT_FOUND, { employeeId });
    }

    const deleted = await this.documentRepo.deleteEmployeeDocumentById(employee.id, documentId);
    if (!deleted) {
      throwNotFound("Document not found", ERROR_CODES.DOCUMENT_NOT_FOUND, {
        employeeId,
        documentId,
      });
    }
    return { ok: true };
  }
}

