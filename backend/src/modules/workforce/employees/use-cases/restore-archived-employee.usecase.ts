import { Injectable } from "@nestjs/common";
import { EmployeesRepository } from "../repositories/employees.repository";
import { throwNotFound, throwBadRequest } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { RequestContextService } from "../../../../shared/context/request-context.service";
import { EmployeeLifecycleService } from "../services/employee-lifecycle.service";

@Injectable()
export class RestoreArchivedEmployeeUseCase {
  constructor(
    private readonly employeesRepo: EmployeesRepository,
    private readonly lifecycle: EmployeeLifecycleService,
    private readonly requestContext: RequestContextService,
  ) {}

  async execute(identifier: string) {
    const employee = await this.employeesRepo.findByIdentifier(identifier);
    if (!employee) {
      throwNotFound("Employee not found", ERROR_CODES.EMPLOYEE_NOT_FOUND, { identifier });
    }

    if (!employee.deletedAt) {
      throwBadRequest("Employee is not archived", ERROR_CODES.INVALID_REQUEST, { identifier });
    }

    if (employee.status === "terminated") {
      throwBadRequest(
        "Terminated employees cannot be restored. Use rehire instead.",
        ERROR_CODES.INVALID_REQUEST,
        { identifier },
      );
    }

    const currentUser = this.requestContext.get();

    await this.employeesRepo.transaction(async (tx) => {
      await this.lifecycle.restoreArchive(
        employee.id,
        currentUser?.userId ?? null,
        tx,
      );
    });

    return { success: true, employeeId: employee.id };
  }
}
