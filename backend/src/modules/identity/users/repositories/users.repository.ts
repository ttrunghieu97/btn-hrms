import * as schema from "../../../../infrastructure/database/schema";
import { Inject, Injectable } from "@nestjs/common";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { DATABASE_CONNECTION } from "../../../../infrastructure/database/database.provider";
import { asc, count, eq, inArray } from "drizzle-orm";
import { users } from "../../../../infrastructure/database/schema";
import { UserQueryRequestDto } from "../dto/user-query.dto";
import { resolveSortOrder } from "../../../../shared/utils/sort.util";
import { combineWhere, contains, searchAny } from "../../../../shared/utils/where.util";
import {
  safeLimit,
  safePage,
} from "../../../../shared/dto/pagination.dto";

const USER_RELATIONS = new Set(["userPermissions", "userRoles"]);
const USER_COLUMNS = {
  id: true,
  username: true,
  email: true,
  isSuperAdmin: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
} as const;
const USER_SORT_FIELDS = {
  createdAt: users.createdAt,
  updatedAt: users.updatedAt,
  username: users.username,
  email: users.email,
  isSuperAdmin: users.isSuperAdmin,
  lastLoginAt: users.lastLoginAt,
  name: users.username,
} as const;
type UserSortField = keyof typeof USER_SORT_FIELDS;
const USER_SORT_ALIASES: Record<string, UserSortField> = {
  id: "createdAt",
};

export interface UserReadRow {
  id: string;
  username: string;
  email: string | null;
  isSuperAdmin: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  roles?: { id: string; name: string }[];
  employee?: {
    id: string;
    firstName: string;
    lastName: string;
    avatar?: string | null;
  } | null;
  userPermissions?: { permissionCode: string }[];
  userRoles?: { roleId: string }[];
}

function requestedRelations(include?: string): Set<string> {
  return new Set(
    (include ?? "")
      .split(",")
      .map((relation) => relation.trim())
      .filter((relation) => USER_RELATIONS.has(relation)),
  );
}

@Injectable()
export class UsersRepository {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  async findMany(query?: UserQueryRequestDto): Promise<UserReadRow[]> {
    const { rows } = await this.findPaginated(
      query ?? { page: 1, limit: 20 },
    );
    return rows;
  }

  async findPaginated(
    query: UserQueryRequestDto,
  ): Promise<{
    rows: UserReadRow[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = safePage(query.page);
    const limit = safeLimit(query.limit);
    const offset = (page - 1) * limit;
    const finalWhere = combineWhere(
      contains(users.username, query.username),
      contains(users.email, query.email),
      searchAny(query.search, users.username, users.email),
    );

    const rows = await this.db.query.users.findMany({
      columns: USER_COLUMNS,
      where: finalWhere,
      orderBy: resolveSortOrder({
        sort: query.sort,
        fields: USER_SORT_FIELDS,
        defaultSort: [{ field: "createdAt", direction: "asc" }],
        aliasMap: USER_SORT_ALIASES,
        tieBreaker: [asc(users.id)],
      }),
      limit,
      offset,
    });
    const enrichedRows = await this.enrichRows(rows, query.include);

    const totalResults = await this.db
      .select({ value: count() })
      .from(users)
      .where(finalWhere);
    const total = totalResults[0] ? Number(totalResults[0].value) : 0;

    return { rows: enrichedRows, total, page, limit };
  }

  async findByEmail(email: string): Promise<UserReadRow | null> {
    const [row] = await this.db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        isSuperAdmin: users.isSuperAdmin,
        lastLoginAt: users.lastLoginAt,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    return row ?? null;
  }

  async findByUsername(
    username: string,
    query?: UserQueryRequestDto,
  ): Promise<UserReadRow | null> {
    const row = await this.db.query.users.findFirst({
      columns: USER_COLUMNS,
      where: eq(users.username, username),
    });
    if (!row) return null;

    return (await this.enrichRows([row], query?.include))[0] ?? null;
  }

  async findById(
    id: string,
    query?: UserQueryRequestDto,
  ): Promise<UserReadRow | null> {
    const row = await this.db.query.users.findFirst({
      columns: USER_COLUMNS,
      where: eq(users.id, id),
    });
    if (!row) return null;

    return (await this.enrichRows([row], query?.include))[0] ?? null;
  }

  async create(data: typeof schema.users.$inferInsert) {
    const [row] = await this.db.insert(users).values(data).returning();
    return row ?? null;
  }

  async update(id: string, data: Partial<typeof schema.users.$inferInsert>) {
    const [row] = await this.db
      .update(users)
      .set(data)
      .where(eq(users.id, id))
      .returning();
    return row ?? null;
  }

  async delete(id: string) {
    await this.db.delete(users).where(eq(users.id, id));
  }

  private async enrichRows(
    rows: UserReadRow[],
    include?: string,
  ): Promise<UserReadRow[]> {
    if (rows.length === 0) return rows;

    const relations = requestedRelations(include);
    if (relations.size === 0) return rows;

    const userIds = rows.map((row) => row.id);
    const permissionsByUserId = new Map<
      string,
      { permissionCode: string }[]
    >();
    const rolesByUserId = new Map<string, { roleId: string; roleName: string }[]>();

    if (relations.has("userPermissions")) {
      const permissions = await this.db
        .select({
          userId: schema.userPermissions.userId,
          permissionCode: schema.userPermissions.permissionCode,
        })
        .from(schema.userPermissions)
        .where(inArray(schema.userPermissions.userId, userIds));
      for (const permission of permissions) {
        const current = permissionsByUserId.get(permission.userId) ?? [];
        current.push({ permissionCode: permission.permissionCode });
        permissionsByUserId.set(permission.userId, current);
      }
    }

    if (relations.has("userRoles")) {
      const roles = await this.db
        .select({
          userId: schema.userRoles.userId,
          roleId: schema.userRoles.roleId,
          roleName: schema.roles.name,
        })
        .from(schema.userRoles)
        .innerJoin(schema.roles, eq(schema.userRoles.roleId, schema.roles.id))
        .where(inArray(schema.userRoles.userId, userIds));
      for (const role of roles) {
        const current = rolesByUserId.get(role.userId) ?? [];
        current.push({ roleId: role.roleId, roleName: role.roleName });
        rolesByUserId.set(role.userId, current);
      }
    }

    return rows.map((row) => ({
      ...row,
      ...(relations.has("userPermissions")
        ? { userPermissions: permissionsByUserId.get(row.id) ?? [] }
        : {}),
      ...(relations.has("userRoles")
        ? {
            userRoles: rolesByUserId.get(row.id) ?? [],
            roles: (rolesByUserId.get(row.id) ?? []).map((r) => ({
              id: r.roleId,
              name: r.roleName,
            })),
          }
        : {}),
    }));
  }
}
