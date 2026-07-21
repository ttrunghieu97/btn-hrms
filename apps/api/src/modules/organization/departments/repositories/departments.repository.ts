import { Injectable } from "@nestjs/common";
import { departments } from "../../../../infrastructure/database/schema";
import * as schema from "../../../../infrastructure/database/schema";
import { and, asc, count, eq, inArray, ne } from "drizzle-orm";
import { DepartmentQueryDto } from "../dto/department-query.dto";
import { parseFields, parseInclude } from "../../../../shared/utils/query.util";
import { BaseRepository } from "../../../../infrastructure/repositories/base.repository";
import { resolveSortOrder } from "../../../../shared/utils/sort.util";
import { contains } from "../../../../shared/utils/where.util";
import { ScopedDbService } from "../../../../infrastructure/database/scoped-db.service";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";

const DEPARTMENT_FIELDS = [
  "id",
  "name",
  "description",
  "parentId",
  "createdAt",
  "updatedAt",
];
const DEPARTMENT_RELATIONS = ["parent", "subDepartments", "employees"];
const DEPARTMENT_SORT_FIELDS = {
  createdAt: departments.createdAt,
  updatedAt: departments.updatedAt,
  name: departments.name,
  description: departments.description,
} as const;
type DepartmentSortField = keyof typeof DEPARTMENT_SORT_FIELDS;
const DEPARTMENT_SORT_ALIASES: Record<string, DepartmentSortField> = {
  id: "createdAt",
};

function buildWhere(name?: string) {
  return contains(departments.name, name);
}

function buildColumns(fields?: string) {
  return parseFields(fields, "id", DEPARTMENT_FIELDS);
}

function buildRelations(include?: string) {
  return parseInclude(include, DEPARTMENT_RELATIONS);
}

function buildOrder(sort?: string) {
  return resolveSortOrder({
    sort,
    fields: DEPARTMENT_SORT_FIELDS,
    defaultSort: [{ field: "createdAt", direction: "asc" }],
    aliasMap: DEPARTMENT_SORT_ALIASES,
    tieBreaker: [asc(departments.id)],
  });
}

function orderRowsByIds<T extends { id: string }>(rows: T[], ids: string[]) {
  return ids
    .map((id) => rows.find((row) => row.id === id))
    .filter((row): row is T => Boolean(row));
}

@Injectable()
export class DepartmentsRepository extends BaseRepository<
  typeof schema.departments.$inferSelect,
  typeof schema.departments.$inferInsert,
  Partial<typeof schema.departments.$inferInsert>
> {
  private readonly db = this.scopedDb.getDb<typeof schema>();

  constructor(private readonly scopedDb: ScopedDbService) {
    super();
  }

  async getTree(tx?: PostgresJsDatabase<typeof schema>) {
    const db = tx ?? this.db;
    const allDepts = await db.select().from(departments);
    const map = new Map<string, typeof schema.departments.$inferSelect & { children: any[] /* eslint-disable-line @typescript-eslint/no-explicit-any */ }>();
    const roots: (typeof schema.departments.$inferSelect & { children: any[] /* eslint-disable-line @typescript-eslint/no-explicit-any */ })[] = [];

    allDepts.forEach((dept) => {
      map.set(dept.id, { ...dept, children: [] });
    });

    allDepts.forEach((dept) => {
      if (dept.parentId && map.has(dept.parentId)) {
        map.get(dept.parentId)!.children.push(map.get(dept.id));
      } else {
        roots.push(map.get(dept.id)!);
      }
    });

    return roots;
  }

  async findList(query: DepartmentQueryDto, tx?: PostgresJsDatabase<typeof schema>) {
    const db = tx ?? this.db;
    const where = buildWhere(query.name);
    const columns = buildColumns(query.fields);
    const withRelations = buildRelations(query.include);

    const rows = await db
      .select({
        id: departments.id,
      })
      .from(departments)
      .where(where)
      .orderBy(...buildOrder(query.sort));

    if (rows.length === 0) return [];

    const departmentRows = await db.query.departments.findMany({
      columns,
      where: inArray(
        departments.id,
        rows.map((row) => row.id),
      ),
      with: withRelations,
    });

    return orderRowsByIds(departmentRows, rows.map((row) => row.id));
  }

  async findMany(query?: DepartmentQueryDto, tx?: PostgresJsDatabase<typeof schema>) {
    const { rows } = await this.findPaginated(query ?? new DepartmentQueryDto(), tx);
    return rows;
  }

  async findPaginated(
    query: DepartmentQueryDto,
    tx?: PostgresJsDatabase<typeof schema>,
  ): Promise<{ rows: any[]; total: number; page: number; limit: number }> {
    const db = tx ?? this.db;
    const { page = 1, limit = 20 } = query;
    const offset = (page - 1) * limit;
    const where = buildWhere(query.name);
    const columns = buildColumns(query.fields);
    const withRelations = buildRelations(query.include);

    const pageRows = await db
      .select({
        id: departments.id,
      })
      .from(departments)
      .where(where)
      .orderBy(...buildOrder(query.sort))
      .limit(limit)
      .offset(offset);

    const departmentIds = pageRows.map((row) => row.id);

    const departmentRows = departmentIds.length
      ? await db.query.departments.findMany({
          columns,
          where: inArray(departments.id, departmentIds),
          with: withRelations,
        })
      : [];

    const rows = orderRowsByIds(departmentRows, departmentIds);

    const [totalResult] = await db
      .select({ value: count() })
      .from(departments)
      .where(where);

    return { rows, total: Number(totalResult?.value ?? 0), page, limit };
  }

  async findById(id: string, query?: DepartmentQueryDto, tx?: PostgresJsDatabase<typeof schema>) {
    const db = tx ?? this.db;
    const columns = buildColumns(query?.fields);
    const withRelations = buildRelations(query?.include);

    const row = await db.query.departments.findFirst({
      columns,
      where: eq(departments.id, id),
      with: withRelations,
    });

    return row ?? null;
  }

  async findByName(name: string, tx?: PostgresJsDatabase<typeof schema>): Promise<{ id: string } | null> {
    const db = tx ?? this.db;
    const [row] = await db
      .select({ id: departments.id })
      .from(departments)
      .where(eq(departments.name, name))
      .limit(1);
    return row ?? null;
  }

  async existsNameConflict(name: string, excludeId?: string, tx?: PostgresJsDatabase<typeof schema>): Promise<boolean> {
    const db = tx ?? this.db;
    const where = excludeId
      ? and(eq(departments.name, name), ne(departments.id, excludeId))
      : eq(departments.name, name);

    const [row] = await db
      .select({ id: departments.id })
      .from(departments)
      .where(where)
      .limit(1);

    return !!row;
  }

  async create(data: typeof departments.$inferInsert, tx?: PostgresJsDatabase<typeof schema>) {
    const db = tx ?? this.db;
    const [row] = await db
      .insert(departments)
      .values(data)
      .returning();
    return row ?? null;
  }

  async update(id: string, data: Partial<typeof departments.$inferInsert>, tx?: PostgresJsDatabase<typeof schema>) {
    const db = tx ?? this.db;
    const [row] = await db
      .update(departments)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(departments.id, id))
      .returning();
    return row ?? null;
  }

  async delete(id: string, tx?: PostgresJsDatabase<typeof schema>): Promise<void> {
    const db = tx ?? this.db;
    await db.delete(departments).where(eq(departments.id, id));
  }

  async transaction<T>(fn: (tx: PostgresJsDatabase<typeof schema>) => Promise<T>): Promise<T> {
    return this.db.transaction(fn);
  }
}
