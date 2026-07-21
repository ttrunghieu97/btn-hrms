import { Injectable } from "@nestjs/common";
import { StorageService } from "../../../infrastructure/storage/storage.service";
import { ScanQueueService } from "../../../infrastructure/storage/scan-queue.service";
import { ImageProcessingService } from "../../../infrastructure/storage/image-processing.service";
import { MetricsService } from "../../../shared/metrics/metrics.service";
import {
  throwNotFound,
  throwBadRequest,
} from "../../../shared/utils/http-error";
import { ContextLogger } from "../../../shared/logging/context-logger";
import { RequestContextService } from "../../../shared/context/request-context.service";

export interface CompletedPart {
  partNumber: number;
  etag: string;
}

export interface MultipartCompleteInput {
  fileId: string;
  uploadId: string;
  parts: CompletedPart[];
}

export interface MultipartCompleteResult {
  fileId: string;
  key: string;
  url: string;
  status: string;
}

@Injectable()
export class MultipartCompleteUseCase {
  private readonly logger: ContextLogger;

  constructor(
    private readonly storage: StorageService,
    private readonly scanQueue: ScanQueueService,
    private readonly imageProcessing: ImageProcessingService,
    private readonly metrics: MetricsService,
    private readonly requestContext: RequestContextService,
  ) {
    this.logger = new ContextLogger(requestContext, MultipartCompleteUseCase.name);
  }

  async execute(input: MultipartCompleteInput): Promise<MultipartCompleteResult> {
    const { fileId, uploadId, parts } = input;

    // Validate parts
    if (!parts?.length) {
      throwBadRequest("At least one part is required", "INVALID_PARTS");
    }

    // Sort by partNumber ascending (S3 requirement)
    const sortedParts = [...parts].sort((a, b) => a.partNumber - b.partNumber);
    for (const [index, part] of sortedParts.entries()) {
      const expectedPartNumber = index + 1;
      if (part.partNumber !== expectedPartNumber) {
        throwBadRequest(
          `Part numbers must be sequential starting from 1. Missing part ${expectedPartNumber}.`,
          "INVALID_PART_SEQUENCE",
        );
      }
    }

    // Fetch file record to get key and purpose
    const file = await this.storage.getFileById(fileId);
    if (!file) {
      throwNotFound("File not found", "FILE_NOT_FOUND");
    }

    if (file.status !== "pending_upload") {
      throwBadRequest(
        `File "${fileId}" is in status "${file.status}", expected "pending_upload"`,
        "INVALID_FILE_STATUS",
      );
    }

    // Complete the multipart upload in S3
    await this.storage.completeMultipartUpload(uploadId, file.key, sortedParts);

    // Update DB record to active
    await this.storage.confirmPendingUpload(fileId, file.purpose);

    // Enqueue async processing jobs (best-effort)
    await this.scanQueue.enqueue(fileId).catch((err: unknown) => {
      this.logger.warn({
        event: "multipart_upload.scan_enqueue_fail",
        fileId,
        error: (err as Error).message,
      });
    });

    await this.imageProcessing.enqueue({ fileId, key: file.key }).catch((err: unknown) => {
      this.logger.warn({
        event: "multipart_upload.image_enqueue_fail",
        fileId,
        error: (err as Error).message,
      });
    });

    this.logger.log({
      event: "multipart_upload.completed",
      fileId,
      uploadId,
      key: file.key,
      partCount: sortedParts.length,
    });

    return {
      fileId: file.id,
      key: file.key,
      url: this.storage.getUrl(file.key),
      status: "active",
    };
  }
}
