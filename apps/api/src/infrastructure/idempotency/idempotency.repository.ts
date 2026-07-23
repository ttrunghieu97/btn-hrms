import { Inject, Injectable } from "@nestjs/common";
import { and, eq, isNull } from "drizzle-orm";
import { DATABASE_CONNECTION } from "../database/database.provider";
import { AppDatabase } from "../database/database-client.type";
import * as schema from "../database/schema";

@Injectable()
export class IdempotencyRepository {
  constructor(@Inject(DATABASE_CONNECTION) private readonly db: AppDatabase) {}

  insertPending(input: {
    actorUserId: string | null;
    endpoint: string;
    idempotencyKey: string;
    requestHash: string;
  }) {
    return this.db
      .insert(schema.requestIdempotency)
      .values({
        actorUserId: input.actorUserId,
        endpoint: input.endpoint,
        idempotencyKey: input.idempotencyKey,
        requestHash: input.requestHash,
        status: "pending",
      })
      .onConflictDoNothing({
        target: [
          schema.requestIdempotency.actorUserId,
          schema.requestIdempotency.endpoint,
          schema.requestIdempotency.idempotencyKey,
        ],
      })
      .returning({ id: schema.requestIdempotency.id });
  }

  findByKey(input: {
    actorUserId: string | null;
    endpoint: string;
    idempotencyKey: string;
  }) {
    return this.db.query.requestIdempotency.findFirst({
      where: and(
        input.actorUserId
          ? eq(schema.requestIdempotency.actorUserId, input.actorUserId)
          : isNull(schema.requestIdempotency.actorUserId),
        eq(schema.requestIdempotency.endpoint, input.endpoint),
        eq(schema.requestIdempotency.idempotencyKey, input.idempotencyKey),
      ),
    });
  }

  markCompleted(input: { id: string; responsePayload: unknown }) {
    return this.db
      .update(schema.requestIdempotency)
      .set({
        status: "completed",
        responsePayload: input.responsePayload,
        errorPayload: null,
        updatedAt: new Date(),
      })
      .where(eq(schema.requestIdempotency.id, input.id));
  }

  markFailed(input: { id: string; errorPayload: unknown }) {
    return this.db
      .update(schema.requestIdempotency)
      .set({
        status: "failed",
        errorPayload: input.errorPayload,
        updatedAt: new Date(),
      })
      .where(eq(schema.requestIdempotency.id, input.id));
  }

  resetToPending(input: { id: string; requestHash: string }) {
    return this.db
      .update(schema.requestIdempotency)
      .set({
        status: "pending",
        requestHash: input.requestHash,
        errorPayload: null,
        responsePayload: null,
        updatedAt: new Date(),
      })
      .where(eq(schema.requestIdempotency.id, input.id));
  }
}
