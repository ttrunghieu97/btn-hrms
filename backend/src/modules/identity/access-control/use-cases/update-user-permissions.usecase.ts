import { Injectable } from "@nestjs/common";
import { PermissionsRepository } from "../../permissions/repositories/permissions.repository";
import { PermissionCacheService } from "../../permissions/permission-cache.service";
import { AuthRepository } from "../../auth/repositories/auth.repository";

@Injectable()
export class UpdateUserPermissionsUseCase {
  constructor(
    private readonly permissionsRepo: PermissionsRepository,
    private readonly permissionCache: PermissionCacheService,
    private readonly authRepo: AuthRepository,
  ) {}

  async execute(userId: string, permissionCodes: string[]) {
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
