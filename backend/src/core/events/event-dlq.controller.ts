import { Controller, Get, Post, Param } from "@nestjs/common";
import { Inject } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { DATABASE_CONNECTION } from "@/infrastructure/database/database.tokens";
import type { AppDatabase } from "@/infrastructure/database/database-client.type";
import * as schema from "@/infrastructure/database/schema";
import { desc, eq, isNotNull } from "drizzle-orm";
import { EventOutboxRepository } from "./event-outbox.repository";

@ApiTags("Event DLQ")
@ApiBearerAuth()
@Controller("api/v1/admin/events/dead-letters")
export class EventDlqController {
  constructor(
    @Inject(DATABASE_CONNECTION) private readonly db: AppDatabase,
    private readonly outboxRepo: EventOutboxRepository,
  ) {}

  @Get()
  @ApiOperation({ summary: "List dead-lettered outbox events" })
  async list() {
    const rows = await this.db.query.eventOutbox.findMany({
      where: isNotNull(schema.eventOutbox.failedAt),
      orderBy: [desc(schema.eventOutbox.failedAt)],
      limit: 100,
    });
    return rows.map((r) => ({
      id: r.id,
      eventType: r.eventType,
      lastError: r.lastError,
      attemptCount: r.attemptCount,
      maxAttempts: r.maxAttempts,
      createdAt: r.createdAt,
      failedAt: r.failedAt,
    }));
  }

  @Post(":id/replay")
  @ApiOperation({ summary: "Reset a dead-lettered event for retry" })
  async replay(@Param("id") id: string) {
    await this.db
      .update(schema.eventOutbox)
      .set({
        failedAt: null,
        lastError: null,
        attemptCount: 0,
        nextAttemptAt: new Date(),
        publishedAt: null,
        leaseUntil: null,
      })
      .where(eq(schema.eventOutbox.id, id));
    return { replayed: true };
  }

  @Post("replay-all")
  @ApiOperation({ summary: "Reset all dead-lettered events for retry" })
  async replayAll() {
    const result = await this.db
      .update(schema.eventOutbox)
      .set({
        failedAt: null,
        lastError: null,
        attemptCount: 0,
        nextAttemptAt: new Date(),
        publishedAt: null,
        leaseUntil: null,
      })
      .where(isNotNull(schema.eventOutbox.failedAt));
    return { replayed: true };
  }
}
