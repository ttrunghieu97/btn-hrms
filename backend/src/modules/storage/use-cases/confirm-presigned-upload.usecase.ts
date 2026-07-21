import { Injectable } from "@nestjs/common";
import { StorageService } from "../../../infrastructure/storage/storage.service";
import { ScanQueueService } from "../../../infrastructure/storage/scan-queue.service";
import { ImageProcessingService } from "../../../infrastructure/storage/image-processing.service";
import {
  throwNotFound,
  throwBadRequest,
} from "../../../shared/utils/http-error";
import { ContextLogger } from "../../../shared/logging/context-logger";
import { RequestContextService } from "../../../shared/context/request-context.service";

export interface ConfirmPresignedUploadInput {
  fileId: string;
  uploadedBy: string;
}

export interface ConfirmPresignedUploadResult {
  fileId: string;
  key: string;
  url: string;
  status: string;
}

@Injectable()
export class ConfirmPresignedUploadUseCase {
  private readonly logger: ContextLogger;

  constructor(
    private readonly storage: StorageService,
    private readonly scanQueue: ScanQueueService,
    private readonly imageProcessing: ImageProcessingService,
    private readonly requestContext: RequestContextService,
  ) {
    this.logger = new ContextLogger(requestContext, ConfirmPresignedUploadUseCase.name);
  }

  async execute(
    input: ConfirmPresignedUploadInput,
  ): Promise<ConfirmPresignedUploadResult> {
    const { fileId, uploadedBy } = input;

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

    if (file.uploadedBy !== uploadedBy) {
      throwNotFound("File not found", "FILE_NOT_FOUND");
    }

    const exists = await this.storage.objectExists(file.key);
    if (!exists) {
      throwNotFound(
        "Uploaded file not found in storage. The file may not have been uploaded yet or the presigned URL has expired.",
        "UPLOAD_NOT_FOUND",
      );
    }

    const meta = await this.storage.getObjectMeta(file.key);
    if (!meta) {
      throwNotFound("Uploaded file metadata not found", "UPLOAD_NOT_FOUND");
    }

    if (typeof meta.size === "number" && file.sizeBytes !== null && meta.size !== file.sizeBytes) {
      throwBadRequest(
        `Uploaded file size mismatch: expected ${file.sizeBytes}, got ${meta.size}`,
        "FILE_SIZE_MISMATCH",
      );
    }

    if (
      meta.contentType &&
      file.mimeType &&
      meta.contentType.toLowerCase().split(";")[0] !== file.mimeType.toLowerCase()
    ) {
      throwBadRequest(
        `Uploaded file content type mismatch: expected ${file.mimeType}, got ${meta.contentType}`,
        "FILE_TYPE_MISMATCH",
      );
    }

    await this.storage.confirmPendingUpload(fileId, file.purpose);

    await this.scanQueue.enqueue(fileId).catch((err: unknown) => {
      this.logger.warn({
        event: "file.confirm.scan_enqueue_fail",
        fileId,
        error: (err as Error).message,
      });
    });

    await this.imageProcessing.enqueue({ fileId, key: file.key }).catch((err: unknown) => {
      this.logger.warn({
        event: "file.confirm.image_enqueue_fail",
        fileId,
        error: (err as Error).message,
      });
    });

    this.logger.log({
      event: "presigned_upload.confirmed",
      fileId,
      key: file.key,
    });

    return {
      fileId: file.id,
      key: file.key,
      url: this.storage.getUrl(file.key),
      status: "active",
    };
  }
}
