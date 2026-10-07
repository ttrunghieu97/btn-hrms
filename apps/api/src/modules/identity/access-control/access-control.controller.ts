import { Body, Controller, Get, Param, Post, Put, Request } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CheckPolicy } from "../../../core/security/decorators/check-policy.decorator";
import { UserPolicies } from "../../../core/security/policies/user.policy";
import { UpdateUserPermissionsRequestDto } from "./dto/update-user-permissions.dto";
import { UpdateUserAccessControlRequestDto } from "./dto/update-user-access-control.dto";
import { GetUserPermissionsUseCase } from "./use-cases/get-user-permissions.usecase";
import { UpdateUserPermissionsUseCase } from "./use-cases/update-user-permissions.usecase";
import { UpdateUserAccessControlUseCase } from "./use-cases/update-user-access-control.usecase";
import { RevokeUserSessionsUseCase } from "./use-cases/revoke-user-sessions.usecase";
import { AuditLog } from "../../../shared/decorators/audit-log.decorator";
import { RequirePermission } from "../../../core/security/decorators/require-permission.decorator";
import { Permissions } from "../../../core/security/permissions/permissions.registry";
import { type AuthUser } from "../../../core/security/types/auth-user.interface";
import { CreateAccessGrantRequestDto } from "./dto/create-access-grant.dto";
import { CreateAccessGrantUseCase } from "./use-cases/create-access-grant.usecase";

@ApiTags("Access Control")
@ApiBearerAuth()
@Controller()
export class AccessControlController {
  constructor(
    private readonly getUserPermissions: GetUserPermissionsUseCase,
    private readonly updateUserPermissions: UpdateUserPermissionsUseCase,
    private readonly updateUserAccessControl: UpdateUserAccessControlUseCase,
    private readonly revokeUserSessions: RevokeUserSessionsUseCase,
    private readonly createAccessGrant: CreateAccessGrantUseCase,
  ) {}

  @Get(":userId/permissions")
  @CheckPolicy(UserPolicies.managePermissions)
  @AuditLog({ action: "user_permissions_view", entity: "user" })
  @ApiOperation({ summary: "Get permissions for a specific user" })
  async getPermissions(@Param("userId") userId: string) {
    return this.getUserPermissions.execute(userId);
  }

  @Put(":userId/access-control")
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @CheckPolicy(UserPolicies.managePermissions)
  @AuditLog({ action: "user_access_control_update", entity: "user" })
  @ApiOperation({ summary: "Update roles and override permissions for a user" })
  async updateAccessControl(
    @Param("userId") userId: string,
    @Body() dto: UpdateUserAccessControlRequestDto,
  ) {
    return this.updateUserAccessControl.execute(
      userId,
      dto.roleIds,
      dto.permissionCodes,
      dto.isSuperAdmin,
    );
  }

  @Put(":userId/permissions")
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @CheckPolicy(UserPolicies.managePermissions)
  @AuditLog({ action: "user_permissions_update", entity: "user" })
  @ApiOperation({ summary: "Batch update user permissions" })
  async updatePermissions(
    @Param("userId") userId: string,
    @Body() dto: UpdateUserPermissionsRequestDto,
  ) {
    return this.updateUserPermissions.execute(
      userId,
      dto.permissionCodes,
    );
  }

  @Post("grants")
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @RequirePermission(Permissions.EMPLOYEES_MANAGE_SENSITIVE)
  @AuditLog({ action: "access_grant_create", entity: "user" })
  @ApiOperation({ summary: "Create a temporary direct permission grant" })
  async createGrant(
    @Request() req: { user: AuthUser },
    @Body() dto: CreateAccessGrantRequestDto,
  ) {
    return this.createAccessGrant.execute({
      actorUserId: req.user.id,
      targetUserId: dto.targetUserId,
      permissionCode: dto.permissionCode,
      reason: dto.reason,
      expiresAt: new Date(dto.expiresAt),
    });
  }

  @Post(":userId/sessions/revoke")
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @CheckPolicy(UserPolicies.managePermissions)
  @AuditLog({ action: "user_sessions_revoke", entity: "user" })
  @ApiOperation({ summary: "Revoke all refresh token sessions for a user" })
  async revokeSessions(@Param("userId") userId: string) {
    return this.revokeUserSessions.execute(userId);
  }
}
