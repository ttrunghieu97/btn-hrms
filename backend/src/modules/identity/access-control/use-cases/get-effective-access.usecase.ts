import { Injectable } from '@nestjs/common';
import { AccessControlRepository } from '../repositories/access-control.repository';

export interface EffectiveAccessResult {
  userId: string;
  permissions: string[];
  source: {
    rolePermissions: string[];
    activeGrants: string[];
    denials: string[];
  };
}

@Injectable()
export class GetEffectiveAccessUseCase {
  constructor(private readonly repository: AccessControlRepository) {}

  async execute(userId: string): Promise<EffectiveAccessResult> {
    const [rolePermissions, activeGrants, denials] = await Promise.all([
      this.repository.getRolePermissionCodesForUser(userId),
      this.repository.getActiveGrantPermissionCodesForUser(userId),
      this.repository.getDeniedPermissionCodesForUser(userId),
    ]);

    const denied = new Set(denials);
    const permissions = Array.from(new Set([...rolePermissions, ...activeGrants]))
      .filter((permission) => !denied.has(permission))
      .sort();

    return {
      userId,
      permissions,
      source: { rolePermissions, activeGrants, denials },
    };
  }
}
