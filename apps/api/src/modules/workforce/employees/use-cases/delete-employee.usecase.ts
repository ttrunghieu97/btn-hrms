import { Injectable } from "@nestjs/common";
import { EmployeesRepository } from "../repositories/employees.repository";
import { throwNotFound } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { StorageService } from "../../../../infrastructure/storage/storage.service";
import { RequestContextService } from "../../../../shared/context/request-context.service";
import { ContextLogger } from "../../../../shared/logging/context-logger";

function errorMessage(error: any /* eslint-disable-line @typescript-eslint/no-explicit-any */): string {
  return error instanceof Error ? error.message : String(error);
}

@Injectable()
export class DeleteEmployeeUseCase {
  private readonly logger: ContextLogger;

  constructor(
    private readonly employeesRepo: EmployeesRepository,
    private readonly storage: StorageService,
    private readonly requestContext: RequestContextService,
  ) {
    this.logger = new ContextLogger(
      this.requestContext,
      DeleteEmployeeUseCase.name,
    );
  }

  async execute(identifier: string) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      identifier,
    );

    let employee: { id: string; userId: string } | null | undefined;

    if (isUuid) {
      employee = await this.employeesRepo.findEmployeeById(identifier);
    } else {
      const userFound =
        await this.employeesRepo.findUserIdByUsername(identifier);
      if (userFound) {
        employee = await this.employeesRepo.findEmployeeByUserId(userFound.id);
      }
    }

    if (!employee) {
      throwNotFound("Employee not found", ERROR_CODES.EMPLOYEE_NOT_FOUND, {
        identifier,
      });
    }

    await this.employeesRepo.transaction(async (tx) => {
      await this.employeesRepo.softDeleteEmployee(employee.id, tx);
    });

    // Archive all storage objects owned by this employee — keyed by employeeId (UUID), never username
    try {
      await this.storage.archiveOwnerFiles("employee", employee.id);
    } catch (err: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) {
      this.logger.error({
        event: "file.archive.delete_employee_fail",
        employeeId: employee.id,
        error: errorMessage(err),
      });
    }

    return { success: true };
  }
}



