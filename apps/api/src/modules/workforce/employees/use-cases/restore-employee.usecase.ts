import { Injectable } from "@nestjs/common";
import { EmployeesRepository } from "../repositories/employees.repository";
import { throwNotFound } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { StorageService } from "../../../../infrastructure/storage/storage.service";
import { RequestContextService } from "../../../../shared/context/request-context.service";
import { ContextLogger } from "../../../../shared/logging/context-logger";

function errorMessage(error: any  ): string {
  return error instanceof Error ? error.message : String(error);
}

@Injectable()
export class RestoreEmployeeUseCase {
  private readonly logger: ContextLogger;

  constructor(
    private readonly employeesRepo: EmployeesRepository,
    private readonly storage: StorageService,
    private readonly requestContext: RequestContextService,
  ) {
    this.logger = new ContextLogger(this.requestContext, RestoreEmployeeUseCase.name);
  }

  async execute(identifier: string) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      identifier,
    );

    let employee: { id: string; userId: string; endDate?: string | Date | null } | null | undefined;

    if (isUuid) {
      employee = await this.employeesRepo.findDeletedEmployeeById(identifier);
    } else {
      const userFound = await this.employeesRepo.findUserIdByUsername(identifier);
      if (userFound) {
        employee = await this.employeesRepo.findDeletedEmployeeByUserId(userFound.id);
      }
    }

    if (!employee) {
      throwNotFound("Deleted employee record not found", ERROR_CODES.EMPLOYEE_NOT_FOUND, {
        identifier,
      });
    }

    await this.employeesRepo.transaction(async (tx) => {
      await this.employeesRepo.restoreEmployee(employee.id, tx);
    });

    try {
      await this.storage.restoreOwnerFiles("employee", employee.id);
    } catch (err: any  ) {
      this.logger.error({
        event: "file.restore.fail",
        employeeId: employee.id,
        error: errorMessage(err),
      });
    }

    return { success: true };
  }
}



