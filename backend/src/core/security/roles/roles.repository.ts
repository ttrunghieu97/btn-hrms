import { Inject, Injectable } from "@nestjs/common";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { and, eq } from "drizzle-orm";
import { DATABASE_CONNECTION } from "../../../infrastructure/database/database.provider";
import { AppDatabase } from "../../../infrastructure/database/database-client.type";
import * as schema from "../../../infrastructure/database/schema";
import { PermissionCacheService } from "../../../modules/identity/permissions/permission-cache.service";

@Injectable()
export class RolesRepository {

  constructor(
    @Inject(DATABASE_CONNECTION) private readonly db: AppDatabase,
    private readonly permissionCache: PermissionCacheService,
  ) {}

  async findUserRoleNames(userId: string): Promise<string[]> {
    const rows = await this.db
      .select({ name: schema.roles.name })
      .from(schema.userRoles)
      .innerJoin(schema.roles, eq(schema.userRoles.roleId, schema.roles.id))
      .where(eq(schema.userRoles.userId, userId));
    return rows.map((r) => r.name);
  }

  async findPermissionsByUserId(userId: string): Promise<string[]> {
    const roleContext = await this.findRoleContextByUserId(userId);
    return roleContext.permissions;
  }

  async findRoleContextByUserId(
    userId: string,
  ): Promise<{ roleNames: string[]; permissions: string[] }> {
    const rows = await this.db
      .select({
        roleName: schema.roles.name,
        permissionCode: schema.rolePermissions.permissionCode,
      })
      .from(schema.userRoles)
      .innerJoin(schema.roles, eq(schema.userRoles.roleId, schema.roles.id))
      .leftJoin(
        schema.rolePermissions,
        eq(schema.rolePermissions.roleId, schema.userRoles.roleId),
      )
      .where(eq(schema.userRoles.userId, userId));

    const roleNames = [...new Set(rows.map((row) => row.roleName))];
    const permissions = [
      ...new Set(
        rows
          .map((row) => row.permissionCode)
          .filter((code): code is string => Boolean(code)),
      ),
    ];

    return { roleNames, permissions };
  }

  async findAllRoles() {
    return this.db.select().from(schema.roles).orderBy(schema.roles.level);
  }

  async findByName(name: string) {
    return this.db.query.roles.findFirst({
      where: eq(schema.roles.name, name),
    });
  }

  async findByCode(code: string) {
    return this.db.query.roles.findFirst({
      where: eq(schema.roles.code, code),
    });
  }

  async assignRolesToUser(
    userId: string,
    roleIds: string[],
    grantedBy?: string,
  ): Promise<void> {
    if (roleIds.length === 0) return;
    const values = [...new Set(roleIds)].map((roleId) => ({
      userId,
      roleId,
      grantedBy,
    }));
    await this.db.insert(schema.userRoles).values(values).onConflictDoNothing();
    await this.permissionCache.invalidate(userId);
  }

  async replaceUserRoles(
    userId: string,
    roleIds: string[],
    grantedBy?: string,
    db: Pick<PostgresJsDatabase<typeof schema>, "delete" | "insert"> = this.db,
  ): Promise<void> {
    await db.delete(schema.userRoles).where(eq(schema.userRoles.userId, userId));
    if (roleIds.length === 0) return;

    const values = [...new Set(roleIds)].map((roleId) => ({
      userId,
      roleId,
      grantedBy,
    }));
    await db.insert(schema.userRoles).values(values);
  }

  async removeRoleFromUser(userId: string, roleId: string): Promise<void> {
    await this.db
      .delete(schema.userRoles)
      .where(
        and(
          eq(schema.userRoles.userId, userId),
          eq(schema.userRoles.roleId, roleId),
        ),
      );
    await this.permissionCache.invalidate(userId);
  }
}
