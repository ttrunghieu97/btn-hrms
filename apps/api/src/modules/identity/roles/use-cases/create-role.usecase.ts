import { Inject, Injectable } from '@nestjs/common';
import { RolesRepository } from '../roles.repository';
import { CreateRoleRequestDto } from '../dto/role.dto';
import { ContextLogger } from '../../../../shared/logging/context-logger';
import { RequestContextService } from '../../../../shared/context/request-context.service';
import { ScopedDbService } from '../../../../infrastructure/database/scoped-db.service';
import { ERROR_CODES } from '../../../../shared/constants/error-codes';
import { throwBadRequest, throwConflict } from '../../../../shared/utils/http-error';
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
