import { Injectable, Optional } from '@nestjs/common';
import { ERROR_CODES } from '../../../../shared/constants/error-codes';
import { ERROR_REASONS } from '../../../../shared/constants/error-reasons';
import { throwBadRequest, throwForbidden } from '../../../../shared/utils/http-error';
import { AccessControlRepository } from '../repositories/access-control.repository';
import { RequestContextService } from '../../../../shared/context/request-context.service';

interface CreateAccessGrantCommand {
  actorUserId: string;
  targetUserId: string;
  permissionCode: string;
  reason: string;
  expiresAt: Date;
}

@Injectable()
export class CreateAccessGrantUseCase {
  constructor(
    private readonly repository: AccessControlRepository,
    @Optional() private readonly requestContext?: RequestContextService,
  ) {}

  async execute(command: CreateAccessGrantCommand) {
    if (command.actorUserId && command.actorUserId === command.targetUserId) {
      throwForbidden(
        'You cannot grant permissions to yourself.',
        ERROR_CODES.PERMISSION_DENIED,
        { reason: ERROR_REASONS.MISSING_PERMISSION },
      );
    }

    const hasSuperAdminPermission =
      command.permissionCode.toLowerCase() === 'sys:all' ||
      command.permissionCode.toUpperCase() === 'ALL';
    const actor = this.requestContext?.get();
    if (hasSuperAdminPermission && !actor?.isSuperAdmin) {
      throwForbidden(
        "Only super administrators can assign the 'sys:all' permission.",
        ERROR_CODES.PERMISSION_DENIED,
        { reason: ERROR_REASONS.MISSING_PERMISSION },
      );
    }

    if (command.expiresAt.getTime() <= Date.now()) {
      throwBadRequest('Grant expiry must be in the future', ERROR_CODES.VALIDATION_ERROR);
    }

    const grant = await this.repository.createAccessGrant({
      userId: command.targetUserId,
      permissionCode: command.permissionCode,
      reason: command.reason,
      approvedByUserId: command.actorUserId,
      expiresAt: command.expiresAt,
    });

    await this.repository.writeAccessAuditLog({
      actorUserId: command.actorUserId,
      targetUserId: command.targetUserId,
      action: 'grant.created',
      permissionCode: command.permissionCode,
      reason: command.reason,
    });

    return grant;
  }
}
