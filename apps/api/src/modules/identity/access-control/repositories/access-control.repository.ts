import { Injectable } from "@nestjs/common";
import { and, eq, gt, isNull, lte } from "drizzle-orm";
import { ScopedDbService } from "../../../../infrastructure/database/scoped-db.service";
import * as schema from "../../../../infrastructure/database/schema";

@Injectable()
export class AccessControlRepository {
  private readonly db = this.scopedDb.getDb<typeof schema>();

  constructor(private readonly scopedDb: ScopedDbService) {}

  async getRolePermissionCodesForUser(userId: string): Promise<string[]> {
    const rows = await this.db
      .select({ permissionCode: schema.rolePermissions.permissionCode })
      .from(schema.userRoles)
      .innerJoin(schema.rolePermissions, eq(schema.userRoles.roleId, schema.rolePermissions.roleId))
      .where(eq(schema.userRoles.userId, userId));

    return rows.map((row) => row.permissionCode);
  }

  async getActiveGrantPermissionCodesForUser(userId: string): Promise<string[]> {
    const now = new Date();
    const rows = await this.db
      .select({ permissionCode: schema.accessGrants.permissionCode })
      .from(schema.accessGrants)
      .where(
        and(
          eq(schema.accessGrants.userId, userId),
          lte(schema.accessGrants.startsAt, now),
          gt(schema.accessGrants.expiresAt, now),
          isNull(schema.accessGrants.revokedAt),
        ),
      );

    return rows.map((row) => row.permissionCode);
  }

  async getDeniedPermissionCodesForUser(userId: string): Promise<string[]> {
    const rows = await this.db
      .select({ permissionCode: schema.accessDenials.permissionCode })
      .from(schema.accessDenials)
      .where(eq(schema.accessDenials.userId, userId));

    return rows.map((row) => row.permissionCode);
  }

  async createAccessGrant(input: {
    userId: string;
    permissionCode: string;
    reason: string;
    approvedByUserId: string;
    expiresAt: Date;
  }) {
    const [grant] = await this.db
      .insert(schema.accessGrants)
      .values(input)
      .returning();
    return grant;
  }

  async writeAccessAuditLog(input: {
    actorUserId?: string | null;
    targetUserId?: string | null;
    action: string;
    permissionCode?: string | null;
    roleId?: string | null;
    reason?: string | null;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    await this.db.insert(schema.accessAuditLogs).values({
      actorUserId: input.actorUserId ?? null,
      targetUserId: input.targetUserId ?? null,
      action: input.action,
      permissionCode: input.permissionCode ?? null,
      roleId: input.roleId ?? null,
      reason: input.reason ?? null,
      metadata: input.metadata ?? {},
    });
  }

  async replaceUserAccessControl(
    userId: string,
    roleIds: string[],
    permissionCodes: string[],
  ): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx.delete(schema.userRoles).where(eq(schema.userRoles.userId, userId));
      if (roleIds.length > 0) {
        await tx.insert(schema.userRoles).values(
          [...new Set(roleIds)].map((roleId) => ({
            userId,
            roleId,
          })),
        );
      }

      await tx
        .delete(schema.userPermissions)
        .where(eq(schema.userPermissions.userId, userId));
      if (permissionCodes.length > 0) {
        await tx.insert(schema.userPermissions).values(
          [...new Set(permissionCodes)].map((permissionCode) => ({
            userId,
            permissionCode,
          })),
        );
      }
    });
  }

  async updateUserSuperAdminStatus(userId: string, isSuperAdmin: boolean): Promise<void> {
    await this.db
      .update(schema.users)
      .set({ isSuperAdmin, updatedAt: new Date() })
      .where(eq(schema.users.id, userId));
  }
}
