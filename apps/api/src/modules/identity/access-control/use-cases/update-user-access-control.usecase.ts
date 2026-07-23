import { Injectable } from "@nestjs/common";
import { PermissionCacheService } from "../../permissions/permission-cache.service";
import { AuthRepository } from "../../auth/repositories/auth.repository";
import { ContextLogger } from "../../../../shared/logging/context-logger";
import { RequestContextService } from "../../../../shared/context/request-context.service";
import { Inject } from "@nestjs/common";
import { CONTRACTS_TOKENS } from "../../../../contracts/contracts.tokens";
import { type AuditLogPort } from "../../../../contracts/ports/audit-log.port";
import { AccessControlRepository } from "../repositories/access-control.repository";
import { throwForbidden } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { ERROR_REASONS } from "../../../../shared/constants/error-reasons";
import { IDENTITY_AUDIT_ACTIONS } from "../../audit/identity-audit-actions";
import { AuthorizationVersionService } from "../../auth/services/authorization-version.service";

@Injectable()
export class UpdateUserAccessControlUseCase {
  private readonly logger: ContextLogger;
  constructor(
    private readonly permissionCache: PermissionCacheService,
    private readonly authRepo: AuthRepository,
    private readonly accessControlRepo: AccessControlRepository,
    private readonly requestContext: RequestContextService,
    @Inject(CONTRACTS_TOKENS.AUDIT_LOG_PORT)
    private readonly auditLog: AuditLogPort,
    private readonly authorizationVersion: AuthorizationVersionService,
  ) {
    this.logger = new ContextLogger(this.requestContext, UpdateUserAccessControlUseCase.name);
  }

  async execute(
    userId: string,
    roleIds: string[],
    permissionCodes: string[],
    isSuperAdmin?: boolean,
  ) {
    const actor = this.requestContext.get();
    const actorIsSuperAdmin = actor?.isSuperAdmin === true;

    if (isSuperAdmin !== undefined && !actorIsSuperAdmin) {
      throwForbidden(
        "Only super administrators can promote or demote system administrators.",
        ERROR_CODES.PERMISSION_DENIED,
        { reason: ERROR_REASONS.MISSING_PERMISSION }
      );
    }

    if (isSuperAdmin !== undefined) {
      await this.accessControlRepo.updateUserSuperAdminStatus(userId, isSuperAdmin);
    }

    await this.accessControlRepo.replaceUserAccessControl(
      userId,
      roleIds,
      permissionCodes,
    );

    // Bump authorizationVersion — invalidates all outstanding JWTs for this user
    await this.authorizationVersion.bump(userId);
    await this.permissionCache.invalidate(userId);
    await this.authRepo.revokeAllRefreshTokens(userId);

    await this.auditLog.write({
      actorUserId: actor?.userId ?? undefined,
      action: IDENTITY_AUDIT_ACTIONS.USER_ACCESS_UPDATED,
      entity: 'user',
      entityId: userId,
      result: 'SUCCESS',
      traceId: this.requestContext.getTraceId(),
      metadata: { roleIds, permissionCodes, isSuperAdmin },
    });

    return { roleIds, permissionCodes, isSuperAdmin };
  }
}
