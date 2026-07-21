import { Injectable } from "@nestjs/common";
import { randomUUID } from "crypto";
import { ConfigService } from "@nestjs/config";
import { StorageService } from "../../../infrastructure/storage/storage.service";
import {
  uploadPolicyByPurpose,
} from "../../../shared/upload/upload-policy";
import { throwBadRequest } from "../../../shared/utils/http-error";
import { ContextLogger } from "../../../shared/logging/context-logger";
import { RequestContextService } from "../../../shared/context/request-context.service";

export interface PresignedUploadInput {
  purpose: "avatar" | "document" | "attachment" | "certification";
  ownerType: "employee" | "task" | "user";
  ownerId: string;
  mimeType: string;
  size: number;
  uploadedBy: string;
}

export interface PresignedUploadResult {
  fileId: string;
  uploadUrl: string;
  expiresIn: number;
  key: string;
}

const PRESIGNED_TTL_SEC = 300;
const OWNER_TYPE_PREFIX: Record<string, string> = {
  employee: "employees",
  task: "tasks",
  user: "users",
};

@Injectable()
export class PresignedUploadUseCase {
  private readonly logger: ContextLogger;

  constructor(
    private readonly storage: StorageService,
    private readonly config: ConfigService,
    private readonly requestContext: RequestContextService,
  ) {
    this.logger = new ContextLogger(requestContext, PresignedUploadUseCase.name);
  }

  async execute(input: PresignedUploadInput): Promise<PresignedUploadResult> {
    const { purpose, ownerType, ownerId, mimeType, size, uploadedBy } = input;

    const purposeConfig = uploadPolicyByPurpose[purpose as keyof typeof uploadPolicyByPurpose];
    if (!purposeConfig) {
      throwBadRequest(`Unknown upload purpose: ${purpose}`, "INVALID_PURPOSE");
    }

    const allowedMimes = [...purposeConfig.mimeTypes];
    const allowedSet = new Set(allowedMimes.map((m) => m.toLowerCase()));
    if (!allowedSet.has(mimeType.toLowerCase())) {
      throwBadRequest(
        `File type "${mimeType}" is not allowed for purpose "${purpose}"`,
        "UNSUPPORTED_MEDIA_TYPE",
      );
    }

    const maxBytes = purposeConfig.maxFileSizeBytes ?? 10 * 1024 * 1024;
    if (size > maxBytes) {
      throwBadRequest(
        `File size ${size} exceeds maximum of ${maxBytes} for purpose "${purpose}"`,
        "FILE_SIZE_EXCEEDED",
      );
    }

    const fileId = randomUUID();
    const ext = this.safeExtFromMime(mimeType);
    const prefix = OWNER_TYPE_PREFIX[ownerType] || "others";
    const key = `uploads/${prefix}/${ownerId}/${fileId}.${ext}`;

    if (!this.storage.isS3()) {
      throwBadRequest("Presigned uploads require S3 storage backend", "STORAGE_BACKEND_NOT_S3");
    }

    const uploadUrl = await this.storage.getPresignedPutUrl(fileId, key, mimeType, PRESIGNED_TTL_SEC);

    const bucket = this.config.get("STORAGE_BUCKET") || "btn-hrms";
    await this.storage.insertPendingUploadRecord({
      id: fileId,
      key,
      bucket,
      ownerType,
      ownerId,
      purpose,
      mimeType,
      sizeBytes: size,
      uploadedBy,
    });

    this.logger.log({
      event: "presigned_upload.created",
      fileId,
      key,
      purpose,
      size,
    });

    return { fileId, uploadUrl, expiresIn: PRESIGNED_TTL_SEC, key };
  }

  private safeExtFromMime(mimeType: string): string {
    const map: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
      "image/gif": "gif",
      "image/svg+xml": "svg",
      "application/pdf": "pdf",
      "application/msword": "doc",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
      "application/vnd.ms-excel": "xls",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
      "text/plain": "txt",
      "text/csv": "csv",
    };
    return map[mimeType] || "bin";
  }
}
