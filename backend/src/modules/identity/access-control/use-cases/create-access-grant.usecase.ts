import { Injectable } from '@nestjs/common';
import { ERROR_CODES } from '../../../../shared/constants/error-codes';
import { throwBadRequest } from '../../../../shared/utils/http-error';
import { AccessControlRepository } from '../repositories/access-control.repository';

interface CreateAccessGrantCommand {
  actorUserId: string;
  targetUserId: string;
  permissionCode: string;
  reason: string;
  expiresAt: Date;
}

@Injectable()
export class CreateAccessGrantUseCase {
  constructor(private readonly repository: AccessControlRepository) {}

  async execute(command: CreateAccessGrantCommand) {
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
