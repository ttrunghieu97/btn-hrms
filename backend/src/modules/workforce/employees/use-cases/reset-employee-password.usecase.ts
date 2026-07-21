import * as bcrypt from "bcrypt";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { EmployeesRepository } from "../repositories/employees.repository";
import { throwBadRequest } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { ERROR_REASONS } from "../../../../shared/constants/error-reasons";
import { ContextLogger } from "../../../../shared/logging/context-logger";
import { RequestContextService } from "../../../../shared/context/request-context.service";
import { Inject } from "@nestjs/common";
import { CONTRACTS_TOKENS } from "../../../../contracts/contracts.tokens";
import { type AuditLogPort } from "../../../../contracts/ports/audit-log.port";

@Injectable()
export class ResetEmployeePasswordUseCase {
  private readonly logger: ContextLogger;
  constructor(
    private readonly employeesRepo: EmployeesRepository,
    private readonly requestContext: RequestContextService,
    private readonly configService: ConfigService,
    @Inject(CONTRACTS_TOKENS.AUDIT_LOG_PORT)
    private readonly auditLog: AuditLogPort,
  ) {
    this.logger = new ContextLogger(this.requestContext, ResetEmployeePasswordUseCase.name);
  }

  async execute(id: string) {
    const context =
      await this.employeesRepo.findEmployeeUserContextByIdentifier(id);

    if (!context?.userId) {
      throwBadRequest("Employee not found", ERROR_CODES.INVALID_REQUEST, {
        reason: ERROR_REASONS.INVALID_STATE,
      });
    }

    const defaultPassword = this.configService.get<string>("AUTH_DEFAULT_PASSWORD")!;
    const passwordHash = await bcrypt.hash(defaultPassword, 10);

    await this.employeesRepo.transaction(async (tx) => {
      await this.employeesRepo.updateUserById(
        context.userId,
        {
          passwordHash,
          mustChangePassword: true,
          passwordResetTokenHash: null,
          passwordResetTokenExpiresAt: null,
        },
        tx,
      );
    });

    const actor = this.requestContext.get();
    await this.auditLog.write({
      actorUserId: actor?.userId ?? undefined,
      action: "identity_password_reset",
      entity: "user",
      entityId: context.userId,
      metadata: { username: context.username, resetRequired: true },
    });

    return {
      success: true,
      username: context.username,
      password: null,
      temporaryPasswordIssued: false,
      resetRequired: true,
    };
  }
}

