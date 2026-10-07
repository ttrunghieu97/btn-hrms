import { Injectable } from "@nestjs/common";
import { locations } from "../../../../infrastructure/database/schema";
import * as schema from "../../../../infrastructure/database/schema";
import { asc, count, eq } from "drizzle-orm";
import { LocationQueryDto } from "../dto/location-query.dto";
import { parseFields, parseInclude } from "../../../../shared/utils/query.util";
import { BaseRepository } from "../../../../infrastructure/repositories/base.repository";
import { resolveSortOrder } from "../../../../shared/utils/sort.util";
import { combineWhere, contains } from "../../../../shared/utils/where.util";
import { ScopedDbService } from "../../../../infrastructure/database/scoped-db.service";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";

const LOCATION_FIELDS = [
  "id",
  "parentId",
  "name",
  "type",
  "address",
  "latitude",
  "longitude",
  "radiusMeters",
  "isActive",
  "createdAt",
  "updatedAt",
];
const LOCATION_RELATIONS = ["parent", "children", "assignments"];
const LOCATION_SORT_FIELDS = {
  createdAt: locations.createdAt,
  updatedAt: locations.updatedAt,
  name: locations.name,
  type: locations.type,
  isActive: locations.isActive,
} as const;
type LocationSortField = keyof typeof LOCATION_SORT_FIELDS;
const LOCATION_SORT_ALIASES: Record<string, LocationSortField> = {
  id: "createdAt",
};

@Injectable()
export class LocationsRepository extends BaseRepository<
  typeof schema.locations.$inferSelect,
  typeof schema.locations.$inferInsert,
  Partial<typeof schema.locations.$inferInsert>
> {
  private readonly db = this.scopedDb.getDb<typeof schema>();

  constructor(private readonly scopedDb: ScopedDbService) {
    super();
  }

  async findList(query: LocationQueryDto, tx?: PostgresJsDatabase<typeof schema>) {
    const db = tx ?? this.db;
    const { name, parentId, fields, include } = query;
    const columns = parseFields(fields, "id", LOCATION_FIELDS);
    const withRelations = parseInclude(include, LOCATION_RELATIONS);

    const where = combineWhere(
      contains(locations.name, name),
      parentId ? eq(locations.parentId, parentId) : undefined,
    );

    return db.query.locations.findMany({
      columns,
      where,
      with: withRelations,
      orderBy: resolveSortOrder({
        sort: query.sort,
        fields: LOCATION_SORT_FIELDS,
        defaultSort: [{ field: "name", direction: "asc" }],
        aliasMap: LOCATION_SORT_ALIASES,
        tieBreaker: [asc(locations.id)],
      }),
    });
  }

  async findMany(query?: LocationQueryDto, tx?: PostgresJsDatabase<typeof schema>) {
    const db = tx ?? this.db;
    if (!query) return db.query.locations.findMany();
    const { rows } = await this.findPaginated(query, tx);
    return rows;
  }

  async findPaginated(
    query: LocationQueryDto,
    tx?: PostgresJsDatabase<typeof schema>,
  ): Promise<{ rows: any[]  ; total: number; page: number; limit: number }> {
    const db = tx ?? this.db;
    const {
      page = 1,
      limit = 20,
      name,
      parentId,
      fields,
      include,
    } = query;
    const offset = (page - 1) * limit;

    const columns = parseFields(fields, "id", LOCATION_FIELDS);
    const withRelations = parseInclude(include, LOCATION_RELATIONS);

    const where = combineWhere(
      contains(locations.name, name),
      parentId ? eq(locations.parentId, parentId) : undefined,
    );

    const rows = await db.query.locations.findMany({
      columns,
      where,
      with: withRelations,
      orderBy: resolveSortOrder({
        sort: query.sort,
        fields: LOCATION_SORT_FIELDS,
        defaultSort: [{ field: "name", direction: "asc" }],
        aliasMap: LOCATION_SORT_ALIASES,
        tieBreaker: [asc(locations.id)],
      }),
      limit,
      offset,
    });

    const [totalResult] = await db
      .select({ value: count() })
      .from(locations)
      .where(where);

    return { rows, total: Number(totalResult?.value ?? 0), page, limit };
  }

  async findById(id: string, query?: any  , tx?: PostgresJsDatabase<typeof schema>): Promise<any | null> {
    const db = tx ?? this.db;
    const columns = parseFields(query?.fields, "id", LOCATION_FIELDS);
    const withRelations = parseInclude(query?.include, LOCATION_RELATIONS);
    return db.query.locations.findFirst({
      columns,
      where: eq(locations.id, id),
      with: withRelations,
    });
  }

  async create(data: typeof locations.$inferInsert, tx?: PostgresJsDatabase<typeof schema>) {
    const db = tx ?? this.db;
    const [row] = await db
      .insert(locations)
      .values(data)
      .returning();
    return row ?? null;
  }

  async update(id: string, data: Partial<typeof locations.$inferInsert>, tx?: PostgresJsDatabase<typeof schema>) {
    const db = tx ?? this.db;
    const [row] = await db
      .update(locations)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(locations.id, id))
      .returning();
    return row ?? null;
  }

  async delete(id: string, tx?: PostgresJsDatabase<typeof schema>): Promise<void> {
    const db = tx ?? this.db;
    await db.delete(locations).where(eq(locations.id, id));
  }
}
