/**
 * task-event-store.repository.ts
 * Persists domain events to the task_events table (event-store pattern).
 */

import {  Inject , Injectable } from "@nestjs/common";
import { eq, sql } from "drizzle-orm";
import { DATABASE_CONNECTION } from "../../../infrastructure/database/database.provider";
import { AppDatabase } from "../../../infrastructure/database/database-client.type";
import * as schema from "../../../infrastructure/database/schema";
import { TASK_EVENTS_TOPIC, type TaskDomainEvent } from "./task-domain-events";
import { MetricsService } from "../../../shared/metrics/metrics.service";

@Injectable()
export class TaskEventStoreRepository {

  constructor(
    @Inject(DATABASE_CONNECTION) private readonly db: AppDatabase,
    private readonly metrics: MetricsService,
  ) {
    this.db = this.db;
  }

  private executor(db?: AppDatabase) {
    return db ?? this.db;
  }

  async append(event: TaskDomainEvent, db?: AppDatabase): Promise<void> {
    const exec = this.executor(db);

    await exec.insert(schema.taskEvents).values({
      id: event.eventId,
      aggregateId: event.aggregateId,
      eventType: event.eventType as typeof schema.taskEvents.$inferInsert['eventType'],
      actorUserId: event.actorUserId ?? null,
      payload: event.payload,
      correlationId: event.correlationId ?? null,
      causationId: event.causationId ?? null,
      sequence: 0, // Legacy sequence field, maintained for schema compatibility
      processed: false,
      occurredAt: new Date(event.occurredAt),
    });

    this.metrics.incrementOutboxEventsCreated(
      TASK_EVENTS_TOPIC,
      event.eventType,
    );
  }

  async markProcessed(eventId: string): Promise<void> {
    await this.db
      .update(schema.taskEvents)
      .set({ processed: true })
      .where(eq(schema.taskEvents.id, eventId));
  }

  async markUnprocessed(eventId: string): Promise<void> {
    await this.db
      .update(schema.taskEvents)
      .set({ processed: false })
      .where(eq(schema.taskEvents.id, eventId));
  }

  async findUnprocessed(limit = 100, db?: AppDatabase): Promise<typeof schema.taskEvents.$inferSelect[]> {
    const exec = this.executor(db);
    // Use raw SQL to utilize FOR UPDATE SKIP LOCKED
    const result = await exec.execute(
      sql`
        SELECT * FROM task_events
        WHERE processed = false
        ORDER BY global_sequence ASC
        LIMIT ${limit}
        FOR UPDATE SKIP LOCKED
      `,
    );
    return result as unknown as typeof schema.taskEvents.$inferSelect[];
  }

  transaction<T>(handler: (tx: AppDatabase) => Promise<T>): Promise<T> {
    return this.db.transaction(handler);
  }

  async findByAggregate(aggregateId: string): Promise<typeof schema.taskEvents.$inferSelect[]> {
    return this.db
      .select()
      .from(schema.taskEvents)
      .where(eq(schema.taskEvents.aggregateId, aggregateId))
      .orderBy(schema.taskEvents.sequence);
  }
}


