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

  transaction<T>(handler: (tx: AppDatabase) => Promise<T>): Promise<T> {
    return this.db.transaction(handler);
  }
}