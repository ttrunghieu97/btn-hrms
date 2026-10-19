import { Injectable } from "@nestjs/common";
import { randomUUID } from "crypto";
import { ConfigService } from "@nestjs/config";
import { StorageService } from "../../../infrastructure/storage/storage.service";
import {
  uploadPolicyByPurpose,
  uploadPolicy,
} from "../../../shared/upload/upload-policy";
import { throwBadRequest, throwForbidden } from "../../../shared/utils/http-error";
import { ContextLogger } from "../../../shared/logging/context-logger";
import { RequestContextService } from "../../../shared/context/request-context.service";

export interface MultipartInitInput {
  purpose: "avatar" | "document" | "attachment" | "certification";
  ownerType: "employee" | "task" | "user";
  ownerId: string;
  mimeType: string;
  fileName: string;
  size: number;
  uploadedBy: string;
}

export interface PresignedPart {
  partNumber: number;
  url: string;
}

export interface MultipartInitResult {
  fileId: string;
  uploadId: string;
  key: string;
  parts: PresignedPart[];
  partSize: number;
  expiresIn: number;
}

const MULTIPART_MIN_SIZE = 50 * 1024 * 1024; // 50MB
const MULTIPART_DEFAULT_MAX_SIZE = 500 * 1024 * 1024; // 500MB
const PART_SIZE = 5 * 1024 * 1024; // 5MB
const PRESIGNED_TTL_SEC = 3600; // 1 hour (longer for large uploads)
const OWNER_TYPE_PREFIX: Record<string, string> = {
  employee: "employees",
  task: "tasks",
  user: "users",
};

@Injectable()
export class MultipartInitUseCase {
  private readonly logger: ContextLogger;

  constructor(
    private readonly storage: StorageService,
    private readonly config: ConfigService,
    private readonly requestContext: RequestContextService,
  ) {
    this.logger = new ContextLogger(requestContext, MultipartInitUseCase.name);
  }

  async execute(input: MultipartInitInput): Promise<MultipartInitResult> {
    const { purpose, ownerType, ownerId, mimeType, size, uploadedBy } = input;

    const actor =
      typeof this.requestContext?.get === "function"
        ? this.requestContext.get()
        : undefined;
    if (actor && actor.userId) {
      if (ownerType === "employee") {
        const isSelf = actor.employeeId && String(actor.employeeId) === String(ownerId);
        const canManage =
          actor.isSuperAdmin ||
          actor.permissions?.some((p) =>
            [
              "employee:manage:sensitive",
              "employee:edit",
              "employee:manage",
              "employees:manage:sensitive",
              "employees:edit",
              "employees:manage",
              "sys:all",
            ].includes(p),
          );
        if (!isSelf && !canManage) {
          throwForbidden(
            "Cannot upload files for another employee without management permissions",
            "FORBIDDEN",
          );
        }
      } else if (ownerType === "user") {
        const isSelf = String(actor.userId) === String(ownerId);
        const canManage =
          actor.isSuperAdmin ||
          actor.permissions?.some((p) => ["users:edit", "sys:all"].includes(p));
        if (!isSelf && !canManage) {
          throwForbidden(
            "Cannot upload files for another user without management permissions",
            "FORBIDDEN",
          );
        }
      }
    }

    // Validate purpose
    const purposeConfig = uploadPolicyByPurpose[purpose as keyof typeof uploadPolicyByPurpose];
    if (!purposeConfig) {
      throwBadRequest(`Unknown upload purpose: ${purpose}`, "INVALID_PURPOSE");
    }

    if (purpose === "avatar") {
      throwBadRequest(
        "Multipart uploads are not supported for avatars",
        "INVALID_PURPOSE",
      );
    }

    // Validate mime type
    const allowedMimes = [
      ...purposeConfig.mimeTypes,
      ...uploadPolicy.mimeTypes.document,
    ];
    const allowedSet = new Set(allowedMimes.map((m) => m.toLowerCase()));
    if (!allowedSet.has(mimeType.toLowerCase())) {
      throwBadRequest(
        `File type "${mimeType}" is not allowed for purpose "${purpose}"`,
        "UNSUPPORTED_MEDIA_TYPE",
      );
    }

    // Gate: only use multipart for files >= 50MB
    if (size < MULTIPART_MIN_SIZE) {
      throwBadRequest(
        `File size ${size} is below multipart threshold of ${MULTIPART_MIN_SIZE}. Use regular presigned upload instead.`,
        "USE_PRESIGNED_UPLOAD",
      );
    }

    // Validate size against multipart maximum limit
    const configuredMultipartMax = Number(this.config.get("UPLOAD_MULTIPART_MAX_BYTES"));
    const maxMultipartBytes =
      Number.isFinite(configuredMultipartMax) && configuredMultipartMax > 0
        ? configuredMultipartMax
        : Math.max(purposeConfig.maxFileSizeBytes ?? 0, MULTIPART_DEFAULT_MAX_SIZE);
    if (size > maxMultipartBytes) {
      throwBadRequest(
        `File size ${size} exceeds maximum multipart size of ${maxMultipartBytes} for purpose "${purpose}"`,
        "FILE_SIZE_EXCEEDED",
      );
    }

    if (!this.storage.isS3()) {
      throwBadRequest("Multipart uploads require S3 storage backend", "STORAGE_BACKEND_NOT_S3");
    }

    const fileId = randomUUID();
    const ext = this.safeExtFromMime(mimeType);
    const prefix = OWNER_TYPE_PREFIX[ownerType] || "others";
    const key = `uploads/${prefix}/${ownerId}/${fileId}.${ext}`;

    // Calculate number of parts
    const partCount = Math.ceil(size / PART_SIZE);
    const actualPartSize = Math.ceil(size / partCount);

    // Init multipart upload in S3
    const uploadId = await this.storage.createMultipartUpload(key, mimeType);

    // Generate presigned URLs for each part
    const presignedUrls = await this.storage.getPresignedPartUrls(
      uploadId,
      key,
      partCount,
      PRESIGNED_TTL_SEC,
    );

    const parts: PresignedPart[] = presignedUrls.map((url, i) => ({
      partNumber: i + 1,
      url,
    }));

    // Create DB record (pending_upload)
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
      event: "multipart_upload.init",
      fileId,
      uploadId,
      key,
      purpose,
      size,
      partCount,
      partSize: actualPartSize,
    });

    return {
      fileId,
      uploadId,
      key,
      parts,
      partSize: actualPartSize,
      expiresIn: PRESIGNED_TTL_SEC,
    };
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
