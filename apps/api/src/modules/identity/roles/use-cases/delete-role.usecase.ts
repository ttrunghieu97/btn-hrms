import { Inject, Injectable } from '@nestjs/common';
import { RolesRepository } from '../roles.repository';
import { ContextLogger } from '../../../../shared/logging/context-logger';
import { RequestContextService } from '../../../../shared/context/request-context.service';
import { ScopedDbService } from '../../../../infrastructure/database/scoped-db.service';
import { ERROR_CODES } from '../../../../shared/constants/error-codes';
import { throwConflict, throwForbidden, throwNotFound } from '../../../../shared/utils/http-error';
import { CONTRACTS_TOKENS } from '../../../../contracts/contracts.tokens';
import { type AuditLogPort } from '../../../../contracts/ports/audit-log.port';
import { IDENTITY_AUDIT_ACTIONS } from '../../audit/identity-audit-actions';

@Injectable()
export class DeleteRoleUseCase {
  private readonly logger: ContextLogger;
  constructor(
    private readonly rolesRepository: RolesRepository,
    private readonly requestContext: RequestContextService,
    private readonly scopedDb: ScopedDbService,
    @Inject(CONTRACTS_TOKENS.AUDIT_LOG_PORT)
    private readonly auditLog: AuditLogPort,
  ) {
    this.logger = new ContextLogger(this.requestContext, DeleteRoleUseCase.name);
  }

  async execute(id: string) {
    const ctx = this.requestContext.get();
    const traceId = this.requestContext.getTraceId();

    const existing = await this.rolesRepository.findById(id);
    if (!existing) {
      throwNotFound('Role not found', ERROR_CODES.ROLE_NOT_FOUND);
    }

    if (existing.isSystem) {
      await this.auditLog.write({
        actorUserId: ctx?.userId ?? undefined,
        action: IDENTITY_AUDIT_ACTIONS.ROLE_DELETE_FAILED,
        entity: 'role',
        entityId: id,
        result: 'FAILED',
        reason: ERROR_CODES.ROLE_SYSTEM_PROTECTED,
        traceId,
        metadata: { roleCode: existing.code },
      });
      throwForbidden('System roles cannot be deleted', ERROR_CODES.ROLE_SYSTEM_PROTECTED);
    }

    // Block deletion if the role is still assigned to any user
    const userCount = await this.rolesRepository.countUsersWithRole(id);
    if (userCount > 0) {
      await this.auditLog.write({
        actorUserId: ctx?.userId ?? undefined,
        action: IDENTITY_AUDIT_ACTIONS.ROLE_DELETE_FAILED,
        entity: 'role',
        entityId: id,
        result: 'FAILED',
        reason: ERROR_CODES.ROLE_IN_USE,
        traceId,
        metadata: { roleCode: existing.code, assignedUserCount: userCount },
      });
      throwConflict(
        `Role is assigned to ${userCount} user(s) and cannot be deleted`,
        ERROR_CODES.ROLE_IN_USE,
      );
    }

    const db = this.scopedDb.getDb();
    const deleted = await db.transaction(async (tx) => {
      return this.rolesRepository.delete(id, tx as any);
    });

    await this.auditLog.write({
      actorUserId: ctx?.userId ?? undefined,
      action: IDENTITY_AUDIT_ACTIONS.ROLE_DELETED,
      entity: 'role',
      entityId: id,
      result: 'SUCCESS',
      traceId,
      metadata: { roleCode: existing.code },
    });

    return deleted;
  }
}
