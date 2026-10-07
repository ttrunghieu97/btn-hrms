import { Injectable } from "@nestjs/common";
import { and, eq, isNull } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "../../../../infrastructure/database/schema";
import { positions as canonicalPositions } from "../../../../infrastructure/database/schema";
import { ScopedDbService } from "../../../../infrastructure/database/scoped-db.service";

@Injectable()
export class PositionsRepository {
  private readonly db = this.scopedDb.getDb<typeof schema>();

  constructor(private readonly scopedDb: ScopedDbService) {}

  async listActive(tx?: PostgresJsDatabase<typeof schema>) {
    const db = tx ?? this.db;
    return db
      .select()
      .from(canonicalPositions)
      .where(isNull(canonicalPositions.deletedAt));
  }

  async findById(positionId: string, tx?: PostgresJsDatabase<typeof schema>) {
    const db = tx ?? this.db;
    const result = await db
      .select()
      .from(canonicalPositions)
      .where(
        and(
          eq(canonicalPositions.id, positionId),
          isNull(canonicalPositions.deletedAt),
        ),
      )
      .limit(1);
    return result[0] ?? null;
  }

  async getActive(positionId: string, tx?: PostgresJsDatabase<typeof schema>) {
    const db = tx ?? this.db;
    const result = await db
      .select()
      .from(canonicalPositions)
      .where(
        and(
          eq(canonicalPositions.id, positionId),
          isNull(canonicalPositions.deletedAt),
        ),
      )
      .limit(1);
    return result[0] ?? null;
  }

  async getActivePositions(tx?: PostgresJsDatabase<typeof schema>) {
    const db = tx ?? this.db;
    return db
      .select()
      .from(canonicalPositions)
      .where(isNull(canonicalPositions.deletedAt));
  }

  async findActiveByTitle(name: string, tx?: PostgresJsDatabase<typeof schema>) {
    const db = tx ?? this.db;
    const result = await db
      .select()
      .from(canonicalPositions)
      .where(
        and(
          eq(canonicalPositions.name, name),
          isNull(canonicalPositions.deletedAt),
        ),
      )
      .limit(1);
    return result[0] ?? null;
  }

  async createPosition(data: { name: string; description?: string; jobCategory?: string }, tx?: PostgresJsDatabase<typeof schema>): Promise<string> {
    const db = tx ?? this.db;
    const values: any = {
      name: data.name,
      description: data.description,
    };
    if (data.jobCategory) {
      values.jobCategory = data.jobCategory;
    }
    const [newPosition] = await db
      .insert(canonicalPositions)
      .values(values)
      .returning({ id: canonicalPositions.id });

    return newPosition!.id;
  }

  async update(id: string, data: Partial<{ name: string; description: string; jobCategory: ("manager" | "high_level_technical" | "mid_level_technical" | "other"); updatedAt: Date }>, tx?: PostgresJsDatabase<typeof schema>): Promise<void> {
    const db = tx ?? this.db;
    await db
      .update(canonicalPositions)
      .set(data)
      .where(eq(canonicalPositions.id, id));
  }

  async softDeletePosition(positionId: string, tx?: PostgresJsDatabase<typeof schema>): Promise<void> {
    const db = tx ?? this.db;
    await db
      .update(canonicalPositions)
      .set({ deletedAt: new Date() })
      .where(eq(canonicalPositions.id, positionId));
  }

  async transaction<T>(fn: (tx: PostgresJsDatabase<typeof schema>) => Promise<T>): Promise<T> {
    return this.db.transaction(fn);
  }
}
