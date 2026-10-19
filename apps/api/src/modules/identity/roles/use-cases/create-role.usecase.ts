import { Inject, Injectable } from '@nestjs/common';
import { RolesRepository } from '../roles.repository';
import { CreateRoleRequestDto } from '../dto/role.dto';
import { ContextLogger } from '../../../../shared/logging/context-logger';
import { RequestContextService } from '../../../../shared/context/request-context.service';
import { ScopedDbService } from '../../../../infrastructure/database/scoped-db.service';
import { ERROR_CODES } from '../../../../shared/constants/error-codes';
import { ERROR_REASONS } from '../../../../shared/constants/error-reasons';
import { throwBadRequest, throwConflict, throwForbidden } from '../../../../shared/utils/http-error';
import { CONTRACTS_TOKENS } from '../../../../contracts/contracts.tokens';
import { type AuditLogPort } from '../../../../contracts/ports/audit-log.port';
import { IDENTITY_AUDIT_ACTIONS } from '../../audit/identity-audit-actions';

@Injectable()
export class CreateRoleUseCase {
  private readonly logger: ContextLogger;
  constructor(
    private readonly rolesRepository: RolesRepository,
    private readonly requestContext: RequestContextService,
    private readonly scopedDb: ScopedDbService,
    @Inject(CONTRACTS_TOKENS.AUDIT_LOG_PORT)
    private readonly auditLog: AuditLogPort,
  ) {
    this.logger = new ContextLogger(this.requestContext, CreateRoleUseCase.name);
  }

  async execute(dto: CreateRoleRequestDto) {
    const { permissions, isSystem: _ignored, ...data } = dto;
    const ctx = this.requestContext.get();
    const traceId = this.requestContext.getTraceId();
    const actorIsSuperAdmin = ctx?.isSuperAdmin === true;

    // isSystem is a system-managed flag; callers cannot set it via the API
    if (dto.isSystem) {
      await this.auditLog.write({
        actorUserId: ctx?.userId ?? undefined,
        action: IDENTITY_AUDIT_ACTIONS.ROLE_CREATE_FAILED,
        entity: 'role',
        result: 'FAILED',
        reason: ERROR_CODES.ROLE_SYSTEM_PROTECTED,
        traceId,
        metadata: { attemptedName: dto.name },
      });
      throwBadRequest(
        'System roles cannot be created via the API',
        ERROR_CODES.ROLE_SYSTEM_PROTECTED,
      );
    }

    // Derive candidate code the same way the repository would
    const candidateCode = data.code
      ?? data.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

    if (
      (candidateCode === 'super_admin' || candidateCode === 'system_admin') &&
      !actorIsSuperAdmin
    ) {
      await this.auditLog.write({
        actorUserId: ctx?.userId ?? undefined,
        action: IDENTITY_AUDIT_ACTIONS.ROLE_CREATE_FAILED,
        entity: 'role',
        result: 'FAILED',
        reason: ERROR_CODES.ROLE_SYSTEM_PROTECTED,
        traceId,
        metadata: { attemptedCode: candidateCode },
      });
      throwForbidden(
        'System administrator role codes are reserved',
        ERROR_CODES.ROLE_SYSTEM_PROTECTED,
      );
    }

    const hasSuperAdminPermission = (permissions ?? []).some(
      (code) => code.toLowerCase() === 'sys:all' || code.toUpperCase() === 'ALL',
    );
    if (hasSuperAdminPermission && !actorIsSuperAdmin) {
      await this.auditLog.write({
        actorUserId: ctx?.userId ?? undefined,
        action: IDENTITY_AUDIT_ACTIONS.ROLE_CREATE_FAILED,
        entity: 'role',
        result: 'FAILED',
        reason: ERROR_CODES.PERMISSION_DENIED,
        traceId,
        metadata: { attemptedName: dto.name, permissions },
      });
      throwForbidden(
        'Only super administrators can grant system administrator permissions to roles',
        ERROR_CODES.PERMISSION_DENIED,
        { reason: ERROR_REASONS.MISSING_PERMISSION },
      );
    }

    if (
      !actorIsSuperAdmin &&
      Array.isArray(ctx?.permissions) &&
      !ctx.permissions.some((code) => code.toLowerCase() === 'sys:all' || code.toUpperCase() === 'ALL')
    ) {
      const actorPermSet = new Set(ctx.permissions);
      const unauthorizedPerms = (permissions ?? []).filter((code) => !actorPermSet.has(code));
      if (unauthorizedPerms.length > 0) {
        await this.auditLog.write({
          actorUserId: ctx?.userId ?? undefined,
          action: IDENTITY_AUDIT_ACTIONS.ROLE_CREATE_FAILED,
          entity: 'role',
          result: 'FAILED',
          reason: ERROR_CODES.PERMISSION_DENIED,
          traceId,
          metadata: { attemptedName: dto.name, unauthorizedPerms },
        });
        throwForbidden(
          'Cannot grant permissions that the actor does not possess',
          ERROR_CODES.PERMISSION_DENIED,
          { reason: ERROR_REASONS.MISSING_PERMISSION },
        );
      }
    }

    const [existingByName, existingByCode] = await Promise.all([
      this.rolesRepository.findByName(data.name),
      this.rolesRepository.findByCode(candidateCode),
    ]);

    if (existingByName) {
      await this.auditLog.write({
        actorUserId: ctx?.userId ?? undefined,
        action: IDENTITY_AUDIT_ACTIONS.ROLE_CREATE_FAILED,
        entity: 'role',
        result: 'FAILED',
        reason: ERROR_CODES.ROLE_ALREADY_EXISTS,
        traceId,
        metadata: { attemptedName: dto.name },
      });
      throwConflict('Role name already exists', ERROR_CODES.ROLE_ALREADY_EXISTS);
    }
    if (existingByCode) {
      await this.auditLog.write({
        actorUserId: ctx?.userId ?? undefined,
        action: IDENTITY_AUDIT_ACTIONS.ROLE_CREATE_FAILED,
        entity: 'role',
        result: 'FAILED',
        reason: ERROR_CODES.ROLE_CODE_ALREADY_EXISTS,
        traceId,
        metadata: { attemptedCode: candidateCode },
      });
      throwConflict('Role code already exists', ERROR_CODES.ROLE_CODE_ALREADY_EXISTS);
    }

    const db = this.scopedDb.getDb();
    const role = await db.transaction(async (tx) => {
      const created = await this.rolesRepository.create(data, permissions ?? [], tx as any);
      if (!created) {
        throwConflict('Failed to create role', ERROR_CODES.ROLE_ALREADY_EXISTS);
      }
      return created;
    });

    await this.auditLog.write({
      actorUserId: ctx?.userId ?? undefined,
      action: IDENTITY_AUDIT_ACTIONS.ROLE_CREATED,
      entity: 'role',
      entityId: role.id,
      result: 'SUCCESS',
      traceId,
      metadata: {
        roleCode: role.code,
        roleName: role.name,
        permissions: permissions ?? [],
      },
    });

    return role;
  }
}
