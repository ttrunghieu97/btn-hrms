import { Injectable } from "@nestjs/common";
import { PermissionsRepository } from "../../permissions/repositories/permissions.repository";
import { PermissionCacheService } from "../../permissions/permission-cache.service";
import { AuthRepository } from "../../auth/repositories/auth.repository";
import { RequestContextService } from "../../../../shared/context/request-context.service";
import { throwForbidden, throwNotFound } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { ERROR_REASONS } from "../../../../shared/constants/error-reasons";

@Injectable()
export class UpdateUserPermissionsUseCase {
  constructor(
    private readonly permissionsRepo: PermissionsRepository,
    private readonly permissionCache: PermissionCacheService,
    private readonly authRepo: AuthRepository,
    private readonly requestContext: RequestContextService,
  ) {}

  async execute(userId: string, permissionCodes: string[]) {
    const actor = this.requestContext.get();
    const actorIsSuperAdmin = actor?.isSuperAdmin === true;

    // 1. Prevent self-escalation
    if (actor?.userId && actor.userId === userId) {
      throwForbidden(
        "You cannot modify your own permissions.",
        ERROR_CODES.PERMISSION_DENIED,
        { reason: ERROR_REASONS.MISSING_PERMISSION },
      );
    }

    // 2. Target user existence and super-admin protection
    const targetUser = await this.authRepo.findUserById(userId);
    if (!targetUser) {
      throwNotFound("User not found", ERROR_CODES.USER_NOT_FOUND);
    }

    if (targetUser.isSuperAdmin && !actorIsSuperAdmin) {
      throwForbidden(
        "Only super administrators can modify permissions of a super administrator.",
        ERROR_CODES.PERMISSION_DENIED,
        { reason: ERROR_REASONS.MISSING_PERMISSION },
      );
    }

    // 3. Super administrator permissions check
    const hasSuperAdminPermission = permissionCodes.some(
      (code) => code.toLowerCase() === "sys:all" || code.toUpperCase() === "ALL",
    );
    if (hasSuperAdminPermission && !actorIsSuperAdmin) {
      throwForbidden(
        "Only super administrators can grant system administrator permissions.",
        ERROR_CODES.PERMISSION_DENIED,
        { reason: ERROR_REASONS.MISSING_PERMISSION },
      );
    }

    await this.authRepo.transaction(async (tx) => {
      await this.permissionsRepo.replaceUserPermissions(
        userId,
        permissionCodes,
        tx,
      );
    });

    await this.permissionCache.invalidate(userId);

    // Enterprise default: apply changes immediately by revoking refresh sessions.
    await this.authRepo.revokeAllRefreshTokens(userId);

    return permissionCodes;
  }
}
