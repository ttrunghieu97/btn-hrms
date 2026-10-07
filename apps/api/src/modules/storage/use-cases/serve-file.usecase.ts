import { Injectable } from "@nestjs/common";
import { StorageService } from "../../../infrastructure/storage/storage.service";
import { FileAccessService } from "../../../infrastructure/storage/file-access.service";
import { throwForbidden, throwNotFound } from "../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../shared/constants/error-codes";
import { ContextLogger } from "../../../shared/logging/context-logger";
import { RequestContextService } from "../../../shared/context/request-context.service";
import type { AuthUser } from "../../../core/security/types/auth-user.interface";
import type { FileEntity } from "../../../infrastructure/storage/storage.types";

export interface ServeFileResult {
  file: FileEntity;
  type: "redirect" | "stream";
  url?: string;
  stream?: NodeJS.ReadableStream;
  contentType?: string;
  etag?: string;
  lastModified?: Date;
  sizeBytes?: number;
  /** Cache-Control policy derived from file purpose. */
  cacheControl: string;
}

const PUBLIC_CACHE = "public, immutable, max-age=31536000";
const PRIVATE_CACHE = "private, max-age=0, must-revalidate";
const REDIRECT_CACHE = "private, max-age=240";

@Injectable()
export class ServeFileUseCase {
  private readonly logger: ContextLogger;

  constructor(
    private readonly storage: StorageService,
    private readonly fileAccess: FileAccessService,
    requestContext: RequestContextService,
  ) {
    this.logger = new ContextLogger(requestContext, ServeFileUseCase.name);
  }

  async execute(key: string, user: AuthUser): Promise<ServeFileResult> {
    // Single indexed DB query
    const file = await this.fileAccess.resolve(key);
    if (!file) {
      this.logger.warn({
        event: "file.serve.not_found",
        key,
        userId: user.id,
      });
      throwNotFound("File not found", ERROR_CODES.INVALID_REQUEST);
    }

    if (file.status === "temp" && file.expiresAt && file.expiresAt < new Date()) {
      this.logger.warn({
        event: "file.serve.temp_expired",
        key,
        userId: user.id,
        expiresAt: file.expiresAt,
      });
      throwNotFound("File expired", ERROR_CODES.INVALID_REQUEST);
    }

    if (
      !user.isSuperAdmin &&
      file.scanStatus &&
      file.scanStatus !== "clean"
    ) {
      this.logger.warn({
        event: "file.serve.scan_blocked",
        key,
        userId: user.id,
        scanStatus: file.scanStatus,
      });
      throwForbidden("File is not available", ERROR_CODES.PERMISSION_DENIED);
    }

    // Authorization: super-admin bypass, otherwise ownership check
    if (!this.fileAccess.canAccess(file, user)) {
      this.logger.warn({
        event: "file.serve.access_denied",
        key,
        userId: user.id,
        ownerType: file.ownerType,
        ownerId: file.ownerId,
      });
      throwForbidden("Access denied", ERROR_CODES.PERMISSION_DENIED);
    }

    const meta = await this.storage.getObjectMeta(key);

    const isPublic = this.storage.isPublicPurpose(file.purpose);

    // CDN redirect for public files when public endpoint is configured
    if (isPublic) {
      const cdnUrl = this.storage.getPublicUrl(key);
      if (cdnUrl) {
        return {
          file,
          type: "redirect",
          url: cdnUrl,
          etag: meta?.etag,
          lastModified: meta?.lastModified,
          cacheControl: PUBLIC_CACHE,
        };
      }
    }

    // Signed URL redirect (private files or no CDN configured)
    if (this.storage.isSignedUrlEnabled()) {
      const signed = await this.storage.getSignedFileUrl(key);
      if (signed) {
        return {
          file,
          type: "redirect",
          url: signed,
          etag: meta?.etag,
          lastModified: meta?.lastModified,
          cacheControl: isPublic ? PUBLIC_CACHE : REDIRECT_CACHE,
        };
      }
    }

    // Proxy stream
    const { stream, contentType } = await this.storage.getObjectStream(key);

    return {
      file,
      type: "stream",
      stream,
      contentType: contentType || file.mimeType || undefined,
      etag: meta?.etag,
      lastModified: meta?.lastModified,
      sizeBytes: file.sizeBytes || undefined,
      cacheControl: isPublic ? PUBLIC_CACHE : PRIVATE_CACHE,
    };
  }
}
