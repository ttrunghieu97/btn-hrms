import {  Inject , Injectable } from "@nestjs/common";
import { DATABASE_CONNECTION } from "../../../../infrastructure/database/database.provider";
import { AppDatabase } from "../../../../infrastructure/database/database-client.type";
import * as schema from "../../../../infrastructure/database/schema";

@Injectable()
export class ConsumerIdempotencyRepository {

  constructor(@Inject(DATABASE_CONNECTION) private readonly db: AppDatabase) {
    this.db = this.db;
  }

  insert(consumerId: string, eventId: string, tx: AppDatabase) {
    return tx.insert(schema.consumerIdempotency).values({
      consumerId,
      eventId,
    });
  }

  transaction<T>(handler: (tx: AppDatabase) => Promise<T>): Promise<T> {
    return this.db.transaction(handler);
  }
}
