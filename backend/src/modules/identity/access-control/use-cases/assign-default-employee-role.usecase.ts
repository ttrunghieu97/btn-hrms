import { Injectable } from "@nestjs/common";
import { throwNotFound } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { AuthRepository } from "../../auth/repositories/auth.repository";
import { RolesRepository } from "../../../../core/security/roles/roles.repository";
import { PermissionCacheService } from "../../permissions/permission-cache.service";
import { ContextLogger } from "../../../../shared/logging/context-logger";
import { RequestContextService } from "../../../../shared/context/request-context.service";

const DEFAULT_EMPLOYEE_ROLE_CODE = "employee_base";

@Injectable()
export class AssignDefaultEmployeeRoleUseCase {
  private readonly logger: ContextLogger;
  constructor(
    private readonly permissionCache: PermissionCacheService,
    private readonly authRepo: AuthRepository,
    private readonly rolesRepo: RolesRepository,
    private readonly requestContext: RequestContextService,
  ) {
    this.logger = new ContextLogger(this.requestContext, AssignDefaultEmployeeRoleUseCase.name);
  }

  async execute(userId: string): Promise<{ roleId: string; roleName: string }> {
    const role = await this.rolesRepo.findByCode(DEFAULT_EMPLOYEE_ROLE_CODE);

    if (!role) {
      throwNotFound(
        `Default employee role not found: ${DEFAULT_EMPLOYEE_ROLE_CODE}`,
        ERROR_CODES.ROLE_NOT_FOUND,
      );
    }

    await this.rolesRepo.assignRolesToUser(userId, [role.id]);
    await this.permissionCache.invalidate(userId);
    await this.authRepo.revokeAllRefreshTokens(userId);

    return {
      roleId: role.id,
      roleName: role.name,
    };
  }
}
