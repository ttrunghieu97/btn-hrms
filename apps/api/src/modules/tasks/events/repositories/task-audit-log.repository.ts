import {  Inject , Injectable } from "@nestjs/common";
import { DATABASE_CONNECTION } from "../../../../infrastructure/database/database.provider";
import { AppDatabase } from "../../../../infrastructure/database/database-client.type";
import * as schema from "../../../../infrastructure/database/schema";

@Injectable()
export class TaskAuditLogRepository {

  constructor(@Inject(DATABASE_CONNECTION) private readonly db: AppDatabase) {
    this.db = this.db;
  }

  transaction<T>(handler: (tx: AppDatabase) => Promise<T>): Promise<T> {
    return this.db.transaction(handler);
  }

  insertTaskEventProjection(
    input: {
      actorUserId: string | null;
      action: string;
      aggregateId: string;
      payload: unknown;
    },
    tx: AppDatabase,
  ) {
    return tx.insert(schema.auditLogs).values({
      actorUserId: input.actorUserId,
      action: input.action,
      entity: "task",
      entityId: input.aggregateId,
      metadata: input.payload,
    });
  }
}


