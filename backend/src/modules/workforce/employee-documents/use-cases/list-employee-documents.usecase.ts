import { Injectable } from "@nestjs/common";
import { EmployeeDocumentRepository } from "../../employees/repositories/employee-document.repository";
import { EmployeesRepository } from "../../employees/repositories/employees.repository";
import { EmployeeDocumentMapper } from "../mappers/employee-document.mapper";
import { throwNotFound } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";

@Injectable()
export class ListEmployeeDocumentsUseCase {
  constructor(
    private readonly employeesRepo: EmployeesRepository,
    private readonly documentRepo: EmployeeDocumentRepository,
  ) {}

  async execute(employeeId: string) {
    const employee = await this.employeesRepo.findEmployeeById(employeeId);
    if (!employee) {
      throwNotFound("Employee not found", ERROR_CODES.EMPLOYEE_NOT_FOUND, { employeeId });
    }

    const rows = await this.documentRepo.findDocumentsByEmployeeId(employee.id);
    return EmployeeDocumentMapper.toResponses(rows);
  }
}

