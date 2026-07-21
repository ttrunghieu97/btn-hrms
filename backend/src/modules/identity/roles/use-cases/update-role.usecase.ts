import { Inject, Injectable } from '@nestjs/common';
import { RolesRepository } from '../roles.repository';
import { UpdateRoleRequestDto } from '../dto/role.dto';
import { ContextLogger } from '../../../../shared/logging/context-logger';
import { RequestContextService } from '../../../../shared/context/request-context.service';
import { ScopedDbService } from '../../../../infrastructure/database/scoped-db.service';
import { AuthRepository } from '../../auth/repositories/auth.repository';
import { PermissionCacheService } from '../../permissions/permission-cache.service';
import { ERROR_CODES } from '../../../../shared/constants/error-codes';
import { throwForbidden, throwNotFound } from '../../../../shared/utils/http-error';
import { CONTRACTS_TOKENS } from '../../../../contracts/contracts.tokens';
import { type AuditLogPort } from '../../../../contracts/ports/audit-log.port';
import { IDENTITY_AUDIT_ACTIONS } from '../../audit/identity-audit-actions';
import { AuthorizationVersionService } from '../../auth/services/authorization-version.service';

@Injectable()
export class UpdateRoleUseCase {
  private readonly logger: ContextLogger;
  constructor(
    private readonly rolesRepository: RolesRepository,
    private readonly requestContext: RequestContextService,
    private readonly scopedDb: ScopedDbService,
    private readonly permissionCache: PermissionCacheService,
    private readonly authRepo: AuthRepository,
    @Inject(CONTRACTS_TOKENS.AUDIT_LOG_PORT)
    private readonly auditLog: AuditLogPort,
    private readonly authorizationVersion: AuthorizationVersionService,
  ) {
    this.logger = new ContextLogger(this.requestContext, UpdateRoleUseCase.name);
  }

  async execute(id: string, dto: UpdateRoleRequestDto) {
    const { permissions, ...data } = dto;
    const ctx = this.requestContext.get();
    const traceId = this.requestContext.getTraceId();

    const existing = await this.rolesRepository.findById(id);
    if (!existing) {
      throwNotFound('Role not found', ERROR_CODES.ROLE_NOT_FOUND);
    }

    // System roles are fully immutable, but we allow editing employee_base in dev stage
    if (existing.isSystem && existing.code !== 'employee_base') {
      await this.auditLog.write({
        actorUserId: ctx?.userId ?? undefined,
        action: IDENTITY_AUDIT_ACTIONS.ROLE_UPDATE_FAILED,
        entity: 'role',
        entityId: id,
        result: 'FAILED',
        reason: ERROR_CODES.ROLE_SYSTEM_PROTECTED,
        traceId,
        metadata: { roleCode: existing.code },
      });
      throwForbidden('System roles cannot be modified', ERROR_CODES.ROLE_SYSTEM_PROTECTED);
    }

    const oldPermissions = existing.permissions;

    const db = this.scopedDb.getDb();
    const updatedRole = await db.transaction(async (tx) => {
      return this.rolesRepository.update(id, data, permissions, tx as any);
    });

    await this.auditLog.write({
      actorUserId: ctx?.userId ?? undefined,
      action: IDENTITY_AUDIT_ACTIONS.ROLE_UPDATED,
      entity: 'role',
      entityId: id,
      result: 'SUCCESS',
      traceId,
      metadata: {
        roleCode: existing.code,
        changes: {
          ...(data.name !== undefined ? { name: { from: existing.name, to: data.name } } : {}),
          ...(data.description !== undefined ? { description: { from: existing.description, to: data.description } } : {}),
          ...(data.level !== undefined ? { level: { from: existing.level, to: data.level } } : {}),
          ...(permissions !== undefined
            ? { permissions: { from: oldPermissions, to: permissions } }
            : {}),
        },
      },
    });

    if (permissions !== undefined) {
      // Invalidate cache, bump authorizationVersion, and revoke tokens for all users with this role
      const userIds = await this.rolesRepository.findUserIdsWithRole(id);
      if (userIds.length > 0) {
        await this.authorizationVersion.bumpMany(userIds);
        await this.permissionCache.invalidateMany(userIds);
        await Promise.allSettled(
          userIds.map((userId) => this.authRepo.revokeAllRefreshTokens(userId)),
        );
      }
    }

    return updatedRole;
  }
}
