import { Injectable, OnModuleInit, OnModuleDestroy, Inject } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { eq, and } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { DATABASE_CONNECTION } from "../database/database.provider";
import * as schema from "../database/schema";
import { StorageService } from "./storage.service";
import { VirusScannerService } from "./virus-scanner.service";
import { RedisService } from "../redis/redis.service";
import { withCronLease } from "../../shared/utils/cron-lease.util";
import { ContextLogger } from "../../shared/logging/context-logger";
import { RequestContextService } from "../../shared/context/request-context.service";
import { MetricsService } from "../../shared/metrics/metrics.service";

const BATCH_SIZE = 50;
const LEASE_KEY = "hrms:cron-lease:storage:scan-queue";

/**
 * Cron-based scan queue processor.
 *
 * Picks up files with scan_status = 'pending' (set after finalize)
 * and sends them to ClamAV for scanning. Updates scan_status to
 * 'clean' or 'infected' after scan completes.
 *
 * Uses Redis lease for horizontal scaling (multi-instance safety).
 */
@Injectable()
export class ScanQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger: ContextLogger;
  private timer?: NodeJS.Timeout;

  constructor(
    private readonly config: ConfigService,
    private readonly storage: StorageService,
    private readonly scanner: VirusScannerService,
    private readonly redis: RedisService,
    requestContext: RequestContextService,
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly metrics: MetricsService,
  ) {
    this.logger = new ContextLogger(requestContext, ScanQueueService.name);
  }

  onModuleInit() {
    if (!this.scanner.isEnabled()) {
      this.logger.log({ event: "scan_queue.disabled", reason: "CLAMAV_ENABLED=false" });
      return;
    }

    const intervalMs = Number(
      this.config.get("SCAN_QUEUE_INTERVAL_MS") || 15_000, // 15 seconds
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
   * Mark a file for scan. Called after finalize.
   */
  async enqueue(fileId: string): Promise<void> {
    if (!this.scanner.isEnabled()) return;
    await this.db
      .update(schema.files)
      .set({ scanStatus: "pending", updatedAt: new Date() })
      .where(eq(schema.files.id, fileId));
  }

  private async runWithLease(): Promise<void> {
    const redisClient = this.redis.getClientOrNull();
    const ttlSeconds = 60;

    const run = () => this.processBatch();

    if (!redisClient) {
      await run().catch((err: unknown) => {
        this.logger.error({
          event: "scan_queue.run_error",
          error: (err as Error).message,
        });
      });
      return;
    }

    await withCronLease(redisClient, LEASE_KEY, ttlSeconds, () => undefined, run).catch(
      (err: unknown) => {
        this.logger.error({
          event: "scan_queue.lease_error",
          error: (err as Error).message,
        });
      },
    );
  }

  private async processBatch(): Promise<void> {
    const rows = await this.db
      .select({
        id: schema.files.id,
        key: schema.files.key,
        sha256: schema.files.sha256,
      })
      .from(schema.files)
      .where(
        and(
          eq(schema.files.scanStatus, "pending"),
          eq(schema.files.status, "active"),
        ),
      )
      .limit(BATCH_SIZE);

    if (!rows.length) return;

    this.logger.log({
      event: "scan_queue.batch_start",
      count: rows.length,
    });

    for (const row of rows) {
      await this.scanOne(row);
    }
  }

  private async scanOne(row: { id: string; key: string; sha256: string | null }) {
    // Mark as scanning
    await this.db
      .update(schema.files)
      .set({ scanStatus: "scanning", updatedAt: new Date() })
      .where(eq(schema.files.id, row.id));

    try {
      // Fetch the file from storage for scanning
      const { stream } = await this.storage.getObjectStream(row.key);
      const chunks: Buffer[] = [];
      for await (const chunk of stream) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      const fileBuffer = Buffer.concat(chunks);

      const result = await this.scanner.scan(fileBuffer);

      await this.db
        .update(schema.files)
        .set({
          scanStatus: result.status,
          scanResult: result.details,
          scannedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(schema.files.id, row.id));

      this.logger.log({
        event: "scan_queue.file_scanned",
        fileId: row.id,
        result: result.status,
        details: result.details,
      });

      this.metrics.incrementVirusScanResult(result.status);
    } catch (err: unknown) {
      const msg = (err as Error).message;
      this.logger.error({
        event: "scan_queue.scan_fail",
        fileId: row.id,
        error: msg,
      });

      // Mark as error, logged for ops review
      await this.db
        .update(schema.files)
        .set({
          scanStatus: "error",
          scanResult: `Scan failed: ${msg}`,
          scannedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(schema.files.id, row.id));

      this.metrics.incrementVirusScanResult("error");
    }
  }

}
