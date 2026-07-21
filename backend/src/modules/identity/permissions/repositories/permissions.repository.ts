import * as schema from "../../../../infrastructure/database/schema";
import {  Inject , Injectable } from "@nestjs/common";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { DATABASE_CONNECTION } from "../../../../infrastructure/database/database.provider";
import { AppDatabase } from "../../../../infrastructure/database/database-client.type";
import {
  permissions,
  userPermissions,
} from "../../../../infrastructure/database/schema";
import { eq, sql } from "drizzle-orm";
import { BaseRepository } from "../../../../infrastructure/repositories/base.repository";

@Injectable()
export class PermissionsRepository extends BaseRepository<
  typeof schema.permissions.$inferSelect,
  typeof schema.permissions.$inferInsert,
  Partial<typeof schema.permissions.$inferInsert>,
  string
> {

  constructor(@Inject(DATABASE_CONNECTION) private readonly db: AppDatabase) {
    super();
    this.db = this.db;
  }

  findAll() {
    return this.db.select().from(permissions).orderBy(permissions.code);
  }

  async findById(code: string) {
    const [row] = await this.db
      .select()
      .from(permissions)
      .where(eq(permissions.code, code));
    return row ?? null;
  }

  async findMany() {
    return this.db.select().from(permissions).orderBy(permissions.code);
  }

  async create(data: typeof schema.permissions.$inferInsert) {
    const [row] = await this.db
      .insert(permissions)
      .values(data)
      .returning();
    return row ?? null;
  }

  async update(
    code: string,
    data: Partial<typeof schema.permissions.$inferInsert>,
  ) {
    const [row] = await this.db
      .update(permissions)
      .set(data)
      .where(eq(permissions.code, code))
      .returning();
    return row ?? null;
  }

  async delete(code: string) {
    await this.db.delete(permissions).where(eq(permissions.code, code));
  }

  async findUserPermissionCodes(userId: string) {
    const directQuery = this.db
      .select({
        code: permissions.code,
      })
      .from(userPermissions)
      .innerJoin(
        permissions,
        eq(userPermissions.permissionCode, permissions.code),
      )
      .where(eq(userPermissions.userId, userId));

    const roleQuery = this.db
      .select({ code: schema.rolePermissions.permissionCode })
      .from(schema.userRoles)
      .innerJoin(
        schema.rolePermissions,
        eq(schema.userRoles.roleId, schema.rolePermissions.roleId),
      )
      .where(eq(schema.userRoles.userId, userId));

    const allPerms = await this.db.execute(
      sql`(${directQuery}) UNION (${roleQuery})`,
    );

    return (allPerms as unknown as { code: string }[]).map((p) => p.code);
  }

  async replaceUserPermissions(
    userId: string,
    permissionCodes: string[],
    db: Pick<PostgresJsDatabase<typeof schema>, "delete" | "insert"> = this.db,
  ) {
    await db.delete(userPermissions).where(eq(userPermissions.userId, userId));
    if (permissionCodes.length === 0) return;

    const values = permissionCodes.map((code) => ({
      userId,
      permissionCode: code,
    }));
    await db.insert(userPermissions).values(values);
  }
}
