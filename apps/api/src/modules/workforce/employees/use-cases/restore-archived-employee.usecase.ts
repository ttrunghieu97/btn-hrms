import { Injectable, Optional } from "@nestjs/common";
import { EmployeesRepository } from "../repositories/employees.repository";
import { throwNotFound, throwBadRequest } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { RequestContextService } from "../../../../shared/context/request-context.service";
import { EmployeeLifecycleService } from "../services/employee-lifecycle.service";
import { StorageService } from "../../../../infrastructure/storage/storage.service";
import { ContextLogger } from "../../../../shared/logging/context-logger";

@Injectable()
export class RestoreArchivedEmployeeUseCase {
  private readonly logger: ContextLogger;

  constructor(
    private readonly employeesRepo: EmployeesRepository,
    private readonly lifecycle: EmployeeLifecycleService,
    private readonly requestContext: RequestContextService,
    @Optional() private readonly storage?: StorageService,
  ) {
    this.logger = new ContextLogger(this.requestContext, RestoreArchivedEmployeeUseCase.name);
  }

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

    if (this.storage) {
      try {
        await this.storage.restoreOwnerFiles("employee", employee.id);
      } catch (err: any) {
        this.logger.error({
          event: "file.restore.fail",
          employeeId: employee.id,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return { success: true, employeeId: employee.id };
  }
}
