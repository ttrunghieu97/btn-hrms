import { Inject, Injectable } from "@nestjs/common";
import { DATABASE_CONNECTION } from "../database/database.provider";
import type { AppDatabase } from "../database/database-client.type";
import * as schema from "../database/schema";

@Injectable()
export class EventIdempotencyRepository {
  constructor(
    @Inject(DATABASE_CONNECTION) private readonly db: AppDatabase,
  ) {}

  async isProcessed(consumerId: string, eventId: string): Promise<boolean> {
    const row = await this.db.query.consumerIdempotency.findFirst({
      where: (t: any, { and, eq }: any) =>
        and(eq(t.consumerId, consumerId), eq(t.eventId, eventId)),
    });
    return !!row;
  }

  async markProcessed(consumerId: string, eventId: string, tx?: AppDatabase): Promise<void> {
    const target = tx ?? this.db;
    await target.insert(schema.consumerIdempotency).values({ consumerId, eventId });
  }

  async runIdempotent<T>(
    consumerId: string,
    eventId: string,
    operation: () => Promise<T>,
  ): Promise<{ executed: boolean; result?: T }> {
    if (await this.isProcessed(consumerId, eventId)) {
      return { executed: false };
    }
    const result = await operation();
    try {
      await this.markProcessed(consumerId, eventId);
    } catch (err: any) {
      if (
        err?.code === "23505" ||
        String(err).includes("unique") ||
        String(err).includes("duplicate")
      ) {
        return { executed: true, result };
      }
      throw err;
    }
    return { executed: true, result };
  }

  async runTransactionalIdempotent<T>(
    consumerId: string,
    eventId: string,
    operation: (tx: AppDatabase) => Promise<T>,
  ): Promise<{ executed: boolean; result?: T }> {
    return this.db.transaction(async (tx) => {
      const existing = await tx.query.consumerIdempotency.findFirst({
        where: (t: any, { and, eq }: any) =>
          and(eq(t.consumerId, consumerId), eq(t.eventId, eventId)),
      });
      if (existing) {
        return { executed: false };
      }
      const result = await operation(tx);
      await tx.insert(schema.consumerIdempotency).values({ consumerId, eventId });
      return { executed: true, result };
    });
  }

  transaction<T>(handler: (tx: AppDatabase) => Promise<T>): Promise<T> {
    return this.db.transaction(handler);
  }
}