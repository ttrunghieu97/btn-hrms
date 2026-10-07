import { Injectable } from "@nestjs/common";
import { StorageService } from "../../../infrastructure/storage/storage.service";
import { ScanQueueService } from "../../../infrastructure/storage/scan-queue.service";
import { ImageProcessingService } from "../../../infrastructure/storage/image-processing.service";
import type {
  FileOwnerType,
  FilePurpose,
} from "../../../infrastructure/storage/storage.types";
import { throwBadRequest } from "../../../shared/utils/http-error";
import { ContextLogger } from "../../../shared/logging/context-logger";
import { RequestContextService } from "../../../shared/context/request-context.service";

export interface FinalizeAttachmentBindingInput {
  fileToken: string;
  ownerType: FileOwnerType;
  ownerId: string;
  purpose: FilePurpose;
}

export interface FinalizeAttachmentBindingResult {
  attachmentId: string;
  fileId: string;
  key: string;
  url: string;
  ownerType: FileOwnerType;
  ownerId: string;
  purpose: FilePurpose;
}

@Injectable()
export class FinalizeAttachmentBindingUseCase {
  private readonly logger: ContextLogger;
  constructor(
    private readonly storage: StorageService,
    private readonly scanQueue: ScanQueueService,
    private readonly requestContext: RequestContextService,
    private readonly imageProcessing: ImageProcessingService,
  ) {
    this.logger = new ContextLogger(this.requestContext, FinalizeAttachmentBindingUseCase.name);
  }

  async execute(
    input: FinalizeAttachmentBindingInput,
  ): Promise<FinalizeAttachmentBindingResult> {
    if (!input.fileToken) {
      throwBadRequest(
        "Temp file token is required",
        "TEMP_FILE_TOKEN_REQUIRED",
      );
    }

    const uploadedBy = this.requestContext.get?.()?.userId ?? undefined;
    const result = await this.storage.finalizeUpload({
      fileToken: input.fileToken,
      ownerType: input.ownerType,
      ownerId: input.ownerId,
      purpose: input.purpose,
      ...(uploadedBy ? { uploadedBy } : {}),
    });

    void this.scanQueue;

    // Trigger image processing (non-blocking, best-effort)
    await this.imageProcessing.enqueue({
      fileId: result.fileId,
      key: result.key,
    }).catch((err: unknown) => {
      this.logger.warn({
        event: "file.finalize.image_enqueue_fail",
        fileId: result.fileId,
        error: (err as Error).message,
      });
    });

    return {
      attachmentId: result.fileId,
      fileId: result.fileId,
      key: result.key,
      url: result.url,
      ownerType: input.ownerType,
      ownerId: input.ownerId,
      purpose: input.purpose,
    };
  }
}
