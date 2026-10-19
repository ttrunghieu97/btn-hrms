import { Inject, Injectable } from "@nestjs/common";
import { EmployeesRepository } from "../repositories/employees.repository";
import { throwConflict, throwNotFound } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { ERROR_REASONS } from "../../../../shared/constants/error-reasons";
import { StorageService } from "../../../../infrastructure/storage/storage.service";
import { RequestContextService } from "../../../../shared/context/request-context.service";
import { ContextLogger } from "../../../../shared/logging/context-logger";
import { CONTRACTS_TOKENS } from "../../../../contracts/contracts.tokens";
import {
  type IdentityAdminPort,
} from "../../../../contracts/ports/identity-admin.port";

function errorMessage(error: any  ): string {
  return error instanceof Error ? error.message : String(error);
}

@Injectable()
export class PurgeEmployeeUseCase {
  private readonly logger: ContextLogger;

  constructor(
    private readonly employeesRepo: EmployeesRepository,
    private readonly storage: StorageService,
    private readonly requestContext: RequestContextService,
    @Inject(CONTRACTS_TOKENS.IDENTITY_ADMIN_PORT)
    private readonly identityAdmin: IdentityAdminPort,
  ) {
    this.logger = new ContextLogger(this.requestContext, PurgeEmployeeUseCase.name);
  }

  async execute(identifier: string) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      identifier,
    );

    let employee: { id: string; userId?: string | null; deletedAt?: Date | string | null } | null | undefined;

    if (isUuid) {
      employee =
        (await this.employeesRepo.findEmployeeById(identifier)) ??
        (await this.employeesRepo.findDeletedEmployeeById(identifier));
    } else {
      const userFound = await this.employeesRepo.findUserIdByUsername(identifier);
      if (userFound) {
        employee =
          (await this.employeesRepo.findEmployeeByUserId(userFound.id)) ??
          (await this.employeesRepo.findDeletedEmployeeByUserId(userFound.id));
      }
    }

    if (!employee) {
      throwNotFound("Employee not found", ERROR_CODES.EMPLOYEE_NOT_FOUND, {
        identifier,
      });
    }

    if (!employee.deletedAt) {
      throwConflict(
        "Employee must be archived before purging",
        ERROR_CODES.INVALID_STATUS_TRANSITION,
        {
          identifier,
          reason: ERROR_REASONS.INVALID_STATE,
        },
      );
    }

    const { id: employeeId, userId } = employee;

    // Revoke sessions + delete user inside the same tx. Deleting `users` cascades
    // to `employees` (employees.user_id → users.id ON DELETE CASCADE) and from
    // there to every employee-owned table, so the employee row goes with it.
    // Throws if user is referenced by a `restrict` FK (e.g. permission_grants /
    // access_grants they approved/created) — caller must clean those first.
    await this.employeesRepo.transaction(async (tx) => {
      if (userId) {
        await this.identityAdmin.revokeSessions(userId, tx);
        await this.identityAdmin.deleteUser(userId, tx);
      } else {
        await this.employeesRepo.hardDeleteEmployee(employeeId, tx);
      }
    });

    // Storage cleanup happens outside the tx. S3 deletes are best-effort and
    // logged on failure, matching the existing pattern.
    try {
      await this.storage.purgeOwnerFiles("employee", employeeId);
    } catch (err: any  ) {
      this.logger.error({
        event: "file.purge.fail",
        employeeId,
        error: errorMessage(err),
      });
    }

    return { success: true };
  }
}



