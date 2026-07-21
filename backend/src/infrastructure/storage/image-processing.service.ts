import { Injectable, Inject, Optional } from "@nestjs/common";
import { Queue } from "bullmq";
import { eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { DATABASE_CONNECTION } from "../database/database.provider";
import * as schema from "../database/schema";
import { ContextLogger } from "../../shared/logging/context-logger";
import { RequestContextService } from "../../shared/context/request-context.service";

export interface ImageProcessingRequest {
  fileId: string;
  key: string;
}

/**
 * Thin wrapper around the image-processing BullMQ queue.
 *
 * Enqueues thumbnail generation / image optimization jobs after
 * a file has been finalized. Looks up the file's mimeType from DB
 * internally so callers only need the fileId and key.
 *
 * When REDIS_URL is not configured the queue is null and enqueue()
 * silently skips — the upload flow is never blocked.
 */
@Injectable()
export class ImageProcessingService {
  private readonly logger: ContextLogger;

  constructor(
    @Optional() @Inject("IMAGE_PROCESSING_QUEUE")
    private readonly queue: Queue | null,
    requestContext: RequestContextService,
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
  ) {
    this.logger = new ContextLogger(requestContext, ImageProcessingService.name);
  }

  /**
   * Enqueue a file for image processing (thumbnail generation).
   * Non-blocking, best-effort. Fails silently on Redis outage
   * so the upload flow is never blocked.
   */
  async enqueue(request: ImageProcessingRequest): Promise<void> {
    if (!this.queue) {
      return; // Redis not configured — skip silently
    }

    try {
      // Look up mimeType from DB for the processor
      const [file] = await this.db
        .select({ mimeType: schema.files.mimeType, purpose: schema.files.purpose })
        .from(schema.files)
        .where(eq(schema.files.id, request.fileId))
        .limit(1);

      if (!file) {
        this.logger.warn({
          event: "image_processing.enqueue_skip",
          fileId: request.fileId,
          reason: "file_not_found",
        });
        return;
      }

      // Only enqueue for image files
      const mime = file.mimeType ?? "";
      if (!["image/jpeg", "image/png", "image/webp"].includes(mime)) {
        return;
      }

      await this.queue.add(
        "optimize",
        {
          fileId: request.fileId,
          key: request.key,
          mimeType: mime,
          purpose: file.purpose,
        },
        {
          attempts: 3,
          backoff: { type: "exponential", delay: 2000 },
        },
      );

      this.logger.log({
        event: "image_processing.enqueued",
        fileId: request.fileId,
        key: request.key,
        purpose: file.purpose,
        mimeType: mime,
      });
    } catch (err: unknown) {
      // Never block the upload flow — processing can be retried later
      this.logger.warn({
        event: "image_processing.enqueue_fail",
        fileId: request.fileId,
        error: (err as Error).message,
      });
    }
  }
}
