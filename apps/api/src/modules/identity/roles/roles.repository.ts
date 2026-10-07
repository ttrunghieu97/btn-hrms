import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { ScopedDbService } from "../../../infrastructure/database/scoped-db.service";
import * as schema from '../../../infrastructure/database/schema';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

@Injectable()
export class RolesRepository {
  private readonly db = this.scopedDb.getDb<typeof schema>();

  constructor(
    private readonly scopedDb: ScopedDbService,
  ) {}

  async findAll(tx?: PostgresJsDatabase<typeof schema>) {
    const db = tx ?? this.db;
    const roles = await db.select().from(schema.roles).orderBy(schema.roles.level);
    const allRolePermissions = await db.select().from(schema.rolePermissions);

    return roles.map(role => ({
      ...role,
      permissions: allRolePermissions
        .filter(rp => rp.roleId === role.id)
        .map(rp => rp.permissionCode)
    }));
  }

  async findById(id: string, tx?: PostgresJsDatabase<typeof schema>) {
    const db = tx ?? this.db;
    const roles = await db.select().from(schema.roles).where(eq(schema.roles.id, id));
    if (roles.length === 0) return null;
    const role = roles[0];

    const permissions = await db
      .select({ code: schema.rolePermissions.permissionCode })
      .from(schema.rolePermissions)
      .where(eq(schema.rolePermissions.roleId, id));

    return {
      ...role,
      permissions: permissions.map(p => p.code)
    };
  }

  async findByName(name: string, tx?: PostgresJsDatabase<typeof schema>) {
    const db = tx ?? this.db;
    const [role] = await db.select().from(schema.roles).where(eq(schema.roles.name, name)).limit(1);
    return role ?? null;
  }

  async findByCode(code: string, tx?: PostgresJsDatabase<typeof schema>) {
    const db = tx ?? this.db;
    const [role] = await db.select().from(schema.roles).where(eq(schema.roles.code, code)).limit(1);
    return role ?? null;
  }

  async countUsersWithRole(roleId: string, tx?: PostgresJsDatabase<typeof schema>): Promise<number> {
    const db = tx ?? this.db;
    const rows = await db
      .select({ userId: schema.userRoles.userId })
      .from(schema.userRoles)
      .where(eq(schema.userRoles.roleId, roleId));
    return rows.length;
  }

  async create(
    data: { name: string; code?: string; description?: string; level?: number; isSystem?: boolean },
    permissions: string[],
    tx?: PostgresJsDatabase<typeof schema>,
  ) {
    const db = tx ?? this.db;
    const [role] = await db.insert(schema.roles).values({
      code: data.code ?? data.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, ""),
      name: data.name,
      description: data.description,
      level: data.level ?? 0,
      isSystem: data.isSystem ?? false,
    }).returning();

    if (!role) {
      return null;
    }

    if (permissions && permissions.length > 0) {
      const permValues = permissions.map(code => ({
        roleId: role.id,
        permissionCode: code
      }));
      await db.insert(schema.rolePermissions).values(permValues).onConflictDoNothing();
    }

    return {
      ...role,
      permissions
    };
  }

  async update(
    id: string,
    data: { name?: string; description?: string; level?: number },
    permissions?: string[],
    tx?: PostgresJsDatabase<typeof schema>,
  ) {
    const db = tx ?? this.db;
    let role = null;
    if (data.name || data.description || data.level !== undefined) {
      const [updated] = await db.update(schema.roles)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(schema.roles.id, id))
        .returning();
      role = updated;
    } else {
      const roles = await db.select().from(schema.roles).where(eq(schema.roles.id, id));
      role = roles[0];
    }

    if (!role) {
      return null;
    }

    if (permissions !== undefined) {
      // Delete old permissions
      await db.delete(schema.rolePermissions).where(eq(schema.rolePermissions.roleId, id));

      // Insert new permissions
      if (permissions.length > 0) {
        const permValues = permissions.map(code => ({
          roleId: id,
          permissionCode: code
        }));
        await db.insert(schema.rolePermissions).values(permValues).onConflictDoNothing();
      }
    }

    return {
      ...role,
      permissions: permissions ?? []
    };
  }

  async delete(id: string, tx?: PostgresJsDatabase<typeof schema>) {
    const db = tx ?? this.db;
    const [deleted] = await db.delete(schema.roles).where(eq(schema.roles.id, id)).returning();
    return deleted ?? null;
  }

  async findUserIdsWithRole(roleId: string, tx?: PostgresJsDatabase<typeof schema>): Promise<string[]> {
    const db = tx ?? this.db;
    const usersWithRole = await db
      .select({ userId: schema.userRoles.userId })
      .from(schema.userRoles)
      .where(eq(schema.userRoles.roleId, roleId));
    return usersWithRole.map((u) => u.userId);
  }
}
