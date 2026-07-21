import { Injectable, OnModuleInit, OnModuleDestroy, Inject } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { and, eq, lt, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { DATABASE_CONNECTION } from "../database/database.provider";
import * as schema from "../database/schema";
import { StorageService } from "./storage.service";
import { RedisService } from "../redis/redis.service";
import { withCronLease } from "../../shared/utils/cron-lease.util";
import { ContextLogger } from "../../shared/logging/context-logger";
import { RequestContextService } from "../../shared/context/request-context.service";
import type { FileOwnerType, FilePurpose } from "./storage.types";

const MAX_ATTEMPTS = 5;
const LEASE_KEY = "hrms:cron-lease:storage:pending-finalize";
const BATCH_SIZE = 100;

@Injectable()
export class PendingFinalizeService implements OnModuleInit, OnModuleDestroy {
  private readonly logger: ContextLogger;
  private timer?: NodeJS.Timeout;

  constructor(
    private readonly config: ConfigService,
    private readonly storage: StorageService,
    private readonly redis: RedisService,
    requestContext: RequestContextService,
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
  ) {
    this.logger = new ContextLogger(requestContext, PendingFinalizeService.name);
  }

  onModuleInit() {
    const intervalMs = Number(
      this.config.get("STORAGE_FINALIZE_RETRY_INTERVAL_MS") || 2 * 60 * 1000,
    );
    if (!Number.isFinite(intervalMs) || intervalMs <= 0) return;

    this.timer = setInterval(() => {
      void this.runWithLease();
    }, intervalMs);
    this.timer.unref?.();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  /**
   * Enqueue a pending finalization record.
   * Call this BEFORE finalizeUpload, AFTER the owning DB transaction commits.
   */
  async enqueue(params: {
    fileId: string;
    ownerType: FileOwnerType;
    ownerId: string;
    targetKey: string;
  }): Promise<void> {
    await this.db
      .insert(schema.pendingFileFinalizations)
      .values({
        fileId: params.fileId,
        ownerType: params.ownerType,
        ownerId: params.ownerId,
        targetKey: params.targetKey,
        nextRetryAt: new Date(),
      })
      .onConflictDoNothing();
  }

  /**
   * Remove a pending finalization record after successful finalization.
   */
  async dequeue(fileId: string): Promise<void> {
    await this.db
      .delete(schema.pendingFileFinalizations)
      .where(eq(schema.pendingFileFinalizations.fileId, fileId));
  }

  private async runWithLease(): Promise<void> {
    const redisClient = this.redis.getClientOrNull();
    if (!redisClient) {
      await this.processBatch();
      return;
    }

    await withCronLease(
      redisClient,
      LEASE_KEY,
      120,
      () => undefined,
      () => this.processBatch(),
    ).catch((err: unknown) => {
      this.logger.error({
        event: "file.pending_finalize.lease_error",
        error: (err as Error).message,
      });
    });
  }

  private async processBatch(): Promise<void> {
    const rows = await this.db
      .select()
      .from(schema.pendingFileFinalizations)
      .where(
        and(
          lt(schema.pendingFileFinalizations.nextRetryAt, sql`NOW()`),
          lt(schema.pendingFileFinalizations.attempts, MAX_ATTEMPTS),
        ),
      )
      .limit(BATCH_SIZE);

    if (!rows.length) return;

    this.logger.log({
      event: "file.pending_finalize.batch_start",
      count: rows.length,
    });

    for (const row of rows) {
      await this.retryOne(row);
    }
  }

  private async retryOne(
    row: typeof schema.pendingFileFinalizations.$inferSelect,
  ): Promise<void> {
    const [file] = await this.db
      .select()
      .from(schema.files)
      .where(eq(schema.files.id, row.fileId))
      .limit(1);

    if (!file) {
      // File deleted externally — clean up pending record
      await this.db
        .delete(schema.pendingFileFinalizations)
        .where(eq(schema.pendingFileFinalizations.id, row.id));
      return;
    }

    if (file.status === "active") {
      // Already finalized successfully — remove pending record
      await this.db
        .delete(schema.pendingFileFinalizations)
        .where(eq(schema.pendingFileFinalizations.id, row.id));
      return;
    }

    const newAttempts = row.attempts + 1;
    const backoffMinutes = Math.pow(2, row.attempts); // 1, 2, 4, 8, 16 minutes
    const nextRetryAt = new Date(Date.now() + backoffMinutes * 60 * 1000);

    try {
      await this.storage.finalizeUpload({
        fileToken: row.fileId,
        ownerType: row.ownerType as FileOwnerType,
        ownerId: row.ownerId,
        purpose: file.purpose as FilePurpose,
      });

      // Success — remove record
      await this.db
        .delete(schema.pendingFileFinalizations)
        .where(eq(schema.pendingFileFinalizations.id, row.id));

      this.logger.log({
        event: "file.pending_finalize.retry_success",
        fileId: row.fileId,
        attempt: newAttempts,
      });
    } catch (err: unknown) {
      const errorMessage = (err as Error).message;

      if (newAttempts >= MAX_ATTEMPTS) {
        // Mark file as orphan after exhausting retries
        await this.db
          .update(schema.files)
          .set({ status: "orphan", updatedAt: new Date() })
          .where(eq(schema.files.id, row.fileId));

        await this.db
          .delete(schema.pendingFileFinalizations)
          .where(eq(schema.pendingFileFinalizations.id, row.id));

        this.logger.error({
          event: "file.pending_finalize.exhausted",
          fileId: row.fileId,
          attempts: newAttempts,
          lastError: errorMessage,
        });
        return;
      }

      // Update attempt counter and schedule next retry
      await this.db
        .update(schema.pendingFileFinalizations)
        .set({
          attempts: newAttempts,
          lastError: errorMessage,
          nextRetryAt,
        })
        .where(eq(schema.pendingFileFinalizations.id, row.id));

      this.logger.warn({
        event: "file.pending_finalize.retry_fail",
        fileId: row.fileId,
        attempt: newAttempts,
        nextRetryAt,
        error: errorMessage,
      });
    }
  }
}
