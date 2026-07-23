import { promises as fs } from "fs";
import { createHash, randomUUID } from "crypto";
import { join } from "path";
import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { RequestContextService } from "../../shared/context/request-context.service";
import { ContextLogger } from "../../shared/logging/context-logger";
import { throwUnprocessable } from "../../shared/utils/http-error";
import { FileRepository } from "./file.repository";
import { S3ClientService } from "./s3-client.service";
import { StorageUrlService } from "./storage-url.service";
import { StorageObjectService } from "./storage-object.service";
import type {
  FileOwnerType,
  FinalizeRequest,
  FinalizeResult,
  StorageObjectMeta,
  StoreFileInput,
  StoreFileResult,
  UploadTempInput,
  UploadTempResult,
} from "./storage.types";
import {
  extractStorageKey,
  safeExt,
  safeExtForMime,
  isS3NoSuchKey,
  isTempKey,
  TEMP_TTL_MS,
  resolveTempKey,
  resolveTargetKey,
  resolveArchiveKey,
  stripArchivePrefix,
} from "./storage-path.util";
import { FileAuditLogService } from "./file-audit-log.service";
import { VirusScannerService } from "./virus-scanner.service";
import { MetricsService } from "../../shared/metrics/metrics.service";
@Injectable()
export class StorageService {
  private readonly logger: ContextLogger;
  constructor(
    readonly s3Client: S3ClientService,
    readonly storageUrl: StorageUrlService,
    readonly storageObject: StorageObjectService,
    requestContext: RequestContextService,
    private readonly fileRepo: FileRepository,
    private readonly auditLog: FileAuditLogService,
    private readonly virusScanner: VirusScannerService,
    private readonly metrics: MetricsService,
  ) {
    this.logger = new ContextLogger(requestContext, StorageService.name);
  }
  isS3(): boolean {
    return this.s3Client.isS3();
  }
  isSignedUrlEnabled(): boolean {
    return this.storageUrl.isSignedUrlEnabled();
  }
  getUrl(key: string): string {
    return this.storageUrl.getUrl(key);
  }
  getPublicUrl(key: string): string | null {
    return this.storageUrl.getPublicUrl(key);
  }
  // ------------------------------------------------------------------
  // Delegated to StorageObjectService
  // ------------------------------------------------------------------
  async putObject(key: string, buffer: Buffer, mimeType: string): Promise<void> {
    return this.storageObject.putObject(key, buffer, mimeType);
  }
  async copyObject(sourceKey: string, targetKey: string): Promise<void> {
    return this.storageObject.copyObject(sourceKey, targetKey);
  }
  async deleteObject(key: string): Promise<void> {
    return this.storageObject.deleteObject(key);
  }
  async getObjectMeta(key: string): Promise<StorageObjectMeta | null> {
    return this.storageObject.getObjectMeta(key);
  }
  async getObjectStream(
    key: string,
  ): Promise<{ stream: NodeJS.ReadableStream; contentType: string | undefined }> {
    return this.storageObject.getObjectStream(key);
  }
  async *listObjects(prefix: string): AsyncGenerator<string> {
    yield* this.storageObject.listObjects(prefix);
  }
  async getPresignedPutUrl(
    fileId: string,
    key: string,
    mimeType: string,
    expiresInSec = 300,
  ): Promise<string> {
    return this.storageObject.getPresignedPutUrl(fileId, key, mimeType, expiresInSec);
  }
  async getSignedFileUrl(key: string): Promise<string | null> {
    return this.storageObject.getSignedFileUrl(key);
  }
  async createMultipartUpload(key: string, mimeType: string): Promise<string> {
    return this.storageObject.createMultipartUpload(key, mimeType);
  }
  async getPresignedPartUrls(
    uploadId: string,
    key: string,
    partCount: number,
    expiresInSec = 3600,
  ): Promise<string[]> {
    return this.storageObject.getPresignedPartUrls(uploadId, key, partCount, expiresInSec);
  }
  async completeMultipartUpload(
    uploadId: string,
    key: string,
    parts: { partNumber: number; etag: string }[],
  ): Promise<void> {
    return this.storageObject.completeMultipartUpload(uploadId, key, parts);
  }
  async objectExists(key: string): Promise<boolean> {
    const meta = await this.getObjectMeta(key);
    return meta !== null;
  }
  // ------------------------------------------------------------------
  // Phase 1: Upload to temp
  // ------------------------------------------------------------------
  async uploadTemp(input: UploadTempInput): Promise<UploadTempResult> {
    const { originalName, ownerType, ownerId, purpose, uploadedBy } = input;
    let { mimeType } = input;
    let { buffer } = input;
    if (mimeType && ["image/jpeg", "image/png", "image/webp"].includes(mimeType)) {
      try {
        const sharpModule = await import("sharp");
        const sharp = sharpModule.default ?? sharpModule;
        const pipeline = sharp(buffer).rotate();
        const stripped =
          purpose === "avatar"
            ? await pipeline
                .resize(512, 512, { fit: "cover", withoutEnlargement: true })
                .jpeg({ quality: 85, mozjpeg: true })
                .toBuffer()
            : await pipeline.toBuffer();
        if (stripped.length > 0) {
          this.logger.debug({
            event: "file.upload.exif_stripped",
            originalBytes: buffer.length,
            strippedBytes: stripped.length,
          });
          buffer = stripped;
          if (purpose === "avatar") {
            mimeType = "image/jpeg";
          }
        }
      } catch (err: unknown) {
        this.logger.warn({
          event: "file.upload.exif_strip_skip",
          error: (err as Error).message,
        });
      }
    }
    const sha256 = createHash("sha256").update(buffer).digest("hex");
    const scanResult = await this.virusScanner.scan(buffer);
    if (scanResult.status !== "clean") {
      this.metrics.incrementUploadFailure(purpose, "virus_scan_failed");
      throwUnprocessable("File failed virus scan", "FILE_SCAN_FAILED", {
        status: scanResult.status,
        details: scanResult.details,
      });
    }
    const ext = safeExtForMime(mimeType) ?? safeExt(originalName);
    const fileId = randomUUID();
    const key = resolveTempKey(fileId, ext);
    const expiresAt = new Date(Date.now() + TEMP_TTL_MS);
    this.logger.log({
      event: "file.upload.start",
      fileId,
      ownerType,
      ownerId,
      purpose,
      sizeBytes: buffer.length,
      mimeType,
    });
    const existing = await this.fileRepo.findActiveBySha256(
      sha256, ownerType, ownerId, purpose,
    );
    if (existing) {
      this.logger.log({
        event: "file.upload.deduplicated",
        fileId: existing.id,
        ownerId,
        purpose,
      });
      return {
        fileId: existing.id,
        tempFileToken: existing.id,
        key: existing.key,
        url: this.getUrl(existing.key),
        expiresAt: new Date(Date.now() + TEMP_TTL_MS),
        deduplicated: true,
        originalName,
        mimeType,
        sizeBytes: buffer.length,
      };
    }
    await this.fileRepo.insert({
      id: fileId,
      key,
      bucket: this.s3Client.bucket,
      ownerType,
      ownerId,
      purpose,
      status: "temp",
      mimeType,
      sizeBytes: buffer.length,
      sha256,
      uploadedBy,
      expiresAt,
      scanStatus: "clean",
      scanResult: scanResult.details,
      scannedAt: new Date(),
    });
    try {
      await this.putObject(key, buffer, mimeType);
      await this.auditLog
        .upload(fileId, uploadedBy, {
          purpose,
          ownerType,
          ownerId,
          sizeBytes: buffer.length,
          mimeType,
        })
        .catch(() => undefined);
    } catch (err: unknown) {
      await this.fileRepo.deleteById(fileId).catch(() => undefined);
      this.logger.error({
        event: "file.upload.minio_fail",
        fileId,
        key,
        error: (err as Error).message,
      });
      this.metrics.incrementUploadFailure(purpose, "storage_unavailable");
      throw new ServiceUnavailableException("Storage temporarily unavailable");
    }
    this.logger.log({
      event: "file.upload.success",
      fileId,
      key,
      sizeBytes: buffer.length,
    });
    this.metrics.incrementUploadSuccess(purpose);
    this.metrics.observeUploadDuration(purpose, 0);
    return {
      fileId,
      tempFileToken: fileId,
      key,
      url: this.getUrl(key),
      expiresAt,
      deduplicated: false,
      originalName,
      mimeType,
      sizeBytes: buffer.length,
    };
  }
  // ------------------------------------------------------------------
  // Phase 2: Finalize (promote temp -> active)
  // ------------------------------------------------------------------
  async finalizeUpload(req: FinalizeRequest): Promise<FinalizeResult> {
    const { fileToken, ownerType, ownerId, purpose } = req;
    this.logger.log({
      event: "file.finalize.start",
      fileToken,
      ownerType,
      ownerId,
      purpose,
    });
    const file = await this.fileRepo.findPendingFile(
      fileToken, ownerType, purpose,
    );
    if (!file) {
      this.metrics.incrementUploadFailure(purpose, "file_not_found");
      throwUnprocessable("File token not found", "FILE_TOKEN_NOT_FOUND", { fileToken });
    }
    if (file.status === "active") {
      if (file.ownerId !== ownerId) {
        throwUnprocessable("File token not found", "FILE_TOKEN_NOT_FOUND", { fileToken });
      }
      this.logger.log({
        event: "file.finalize.already_active",
        fileId: file.id,
        key: file.key,
      });
      return { fileId: file.id, key: file.key, url: this.getUrl(file.key) };
    }
    if (file.status === "orphan") {
      throwUnprocessable("File token has expired", "FILE_TOKEN_EXPIRED", { fileToken });
    }
    if (file.expiresAt && file.expiresAt < new Date()) {
      await this.fileRepo.update(fileToken, { status: "orphan", updatedAt: new Date() });
      this.logger.warn({
        event: "file.finalize.expired",
        fileId: file.id,
        expiresAt: file.expiresAt,
      });
      throwUnprocessable("File token has expired", "FILE_TOKEN_EXPIRED", { fileToken });
    }
    const ext = file.key.split(".").pop() ?? "bin";
    const targetKey = resolveTargetKey(ownerType, ownerId, fileToken, ext);
    const existingMeta = await this.getObjectMeta(targetKey);
    if (!existingMeta) {
      try {
        await this.copyObject(file.key, targetKey);
      } catch (err: unknown) {
        if (isS3NoSuchKey(err)) {
          await this.fileRepo.update(fileToken, { status: "orphan", updatedAt: new Date() });
          this.logger.warn({
            event: "file.finalize.source_missing",
            fileId: file.id,
            sourceKey: file.key,
          });
          this.metrics.incrementUploadFailure(purpose, "source_expired");
          throwUnprocessable("File token has expired", "FILE_TOKEN_EXPIRED", { fileToken });
        }
        this.logger.error({
          event: "file.finalize.copy_fail",
          fileId: file.id,
          sourceKey: file.key,
          targetKey,
          error: (err as Error).message,
        });
        throw err;
      }
    }
    this.deleteObject(file.key).catch((err: unknown) => {
      this.logger.warn({
        event: "file.finalize.temp_delete_fail",
        key: file.key,
        error: (err as Error).message,
      });
    });
    await this.fileRepo.update(fileToken, {
      ownerId,
      key: targetKey,
      status: "active",
      finalizedAt: new Date(),
      expiresAt: null,
      updatedAt: new Date(),
    });
    await this.auditLog
      .finalize(file.id, file.uploadedBy ?? undefined, {
        sourceKey: file.key,
        targetKey,
        purpose,
      })
      .catch(() => undefined);
    this.logger.log({
      event: "file.finalize.success",
      fileId: file.id,
      sourceKey: file.key,
      targetKey,
    });
    this.metrics.incrementUploadSuccess(purpose);
    return { fileId: file.id, key: targetKey, url: this.getUrl(targetKey) };
  }
  // ------------------------------------------------------------------
  // Phase 2b: Store direct (no temp stage)
  // ------------------------------------------------------------------
  async storeFile(input: StoreFileInput): Promise<StoreFileResult> {
    const { originalName, ownerType, ownerId, purpose, uploadedBy } = input;
    let { mimeType } = input;
    let { buffer } = input;
    if (mimeType && ["image/jpeg", "image/png", "image/webp"].includes(mimeType)) {
      try {
        const sharpModule = await import("sharp");
        const sharp = sharpModule.default ?? sharpModule;
        const pipeline = sharp(buffer).rotate();
        const stripped =
          purpose === "avatar"
            ? await pipeline
                .resize(512, 512, { fit: "cover", withoutEnlargement: true })
                .jpeg({ quality: 85, mozjpeg: true })
                .toBuffer()
            : await pipeline.toBuffer();
        if (stripped.length > 0) {
          this.logger.debug({
            event: "file.store.exif_stripped",
            originalBytes: buffer.length,
            strippedBytes: stripped.length,
          });
          buffer = stripped;
          if (purpose === "avatar") {
            mimeType = "image/jpeg";
          }
        }
      } catch (err: unknown) {
        this.logger.warn({
          event: "file.store.exif_strip_skip",
          error: (err as Error).message,
        });
      }
    }
    const sha256 = createHash("sha256").update(buffer).digest("hex");
    const scanResult = await this.virusScanner.scan(buffer);
    if (scanResult.status !== "clean") {
      this.metrics.incrementUploadFailure(purpose, "virus_scan_failed");
      throwUnprocessable("File failed virus scan", "FILE_SCAN_FAILED", {
        status: scanResult.status,
        details: scanResult.details,
      });
    }
    const ext = safeExtForMime(mimeType) ?? safeExt(originalName);
    const fileId = randomUUID();
    const key = resolveTargetKey(ownerType, ownerId, fileId, ext);
    this.logger.log({
      event: "file.store.start",
      fileId,
      key,
      ownerType,
      ownerId,
      purpose,
      sizeBytes: buffer.length,
      mimeType,
    });
    const existing = await this.fileRepo.findActiveBySha256(
      sha256, ownerType, ownerId, purpose,
    );
    if (existing) {
      this.logger.log({
        event: "file.store.deduplicated",
        fileId: existing.id,
        ownerId,
        purpose,
      });
      return {
        fileId: existing.id,
        key: existing.key,
        url: this.getUrl(existing.key),
        deduplicated: true,
        originalName,
        mimeType,
        sizeBytes: buffer.length,
      };
    }
    await this.fileRepo.insert({
      id: fileId,
      key,
      bucket: this.s3Client.bucket,
      ownerType,
      ownerId,
      purpose,
      status: "active",
      mimeType,
      sizeBytes: buffer.length,
      sha256,
      uploadedBy,
      finalizedAt: new Date(),
      scanStatus: "clean",
      scanResult: scanResult.details,
      scannedAt: new Date(),
    });
    try {
      await this.putObject(key, buffer, mimeType);
      await this.auditLog
        .upload(fileId, uploadedBy, {
          purpose,
          ownerType,
          ownerId,
          sizeBytes: buffer.length,
          mimeType,
        })
        .catch(() => undefined);
    } catch (err: unknown) {
      await this.fileRepo.deleteById(fileId).catch(() => undefined);
      this.logger.error({
        event: "file.store.storage_fail",
        fileId,
        key,
        error: (err as Error).message,
      });
      this.metrics.incrementUploadFailure(purpose, "storage_unavailable");
      throw new ServiceUnavailableException("Storage temporarily unavailable");
    }
    this.logger.log({
      event: "file.store.success",
      fileId,
      key,
      sizeBytes: buffer.length,
    });
    this.metrics.incrementUploadSuccess(purpose);
    this.metrics.observeUploadDuration(purpose, 0);
    return {
      fileId,
      key,
      url: this.getUrl(key),
      deduplicated: false,
      originalName,
      mimeType,
      sizeBytes: buffer.length,
    };
  }
  async promoteTempTo(
    tempUrlOrKey: string,
    targetPrefix: string,
  ): Promise<string | null> {
    const key = extractStorageKey(tempUrlOrKey);
    if (!key || !isTempKey(key)) return null;
    const file = await this.fileRepo.findByKey(key);
    if (!file) return null;
    const ext = file.key.split(".").pop() ?? "bin";
    const normalizedPrefix = targetPrefix.replace(/^\/+|\/+$/g, "");
    const targetKey = `${normalizedPrefix}/${file.id}.${ext}`;
    if (file.status === "active" && file.key === targetKey) {
      return this.getUrl(targetKey);
    }
    try {
      await this.copyObject(file.key, targetKey);
    } catch (err: unknown) {
      if (isS3NoSuchKey(err)) return null;
      throw err;
    }
    this.deleteObject(file.key).catch(() => undefined);
    await this.fileRepo.update(file.id, {
      key: targetKey,
      status: "active",
      finalizedAt: new Date(),
      expiresAt: null,
      updatedAt: new Date(),
    });
    return this.getUrl(targetKey);
  }
  async purgeOwnerFiles(ownerType: FileOwnerType, ownerId: string): Promise<void> {
    const files = await this.fileRepo.findAllByOwner(ownerType, ownerId);
    await Promise.all(
      files.map(async (f: any) => {
        try {
          await this.deleteObject(f.key);
          await this.fileRepo.deleteById(f.id);
          this.logger.log({ event: "file.purge.success", fileId: f.id, key: f.key });
        } catch (err: unknown) {
          this.logger.error({ event: "file.purge.fail", fileId: f.id, key: f.key, error: (err as Error).message });
        }
      }),
    );
  }
  async deleteFiles(fileIds: string[]): Promise<void> {
    if (!fileIds.length) return;
    const rows = await this.fileRepo.findByIds(fileIds);
    if (!rows.length) return;
    await this.fileRepo.markArchived(fileIds);
    await Promise.allSettled(
      rows.map((f: any) =>
        this.deleteObject(f.key).catch((err: unknown) => {
          this.logger.warn({ event: "file.delete.object_fail", fileId: f.id, key: f.key, error: (err as Error).message });
        }).then(async () => {
          await this.auditLog.delete(f.id, "system", { key: f.key }).catch(() => undefined);
        }),
      ),
    );
    this.logger.log({ event: "file.delete.success", fileIds, count: rows.length });
  }
  async cleanupExpiredTemp(batchSize = 500): Promise<number> {
    const rows = await this.fileRepo.findExpiredTemp(batchSize);
    if (!rows.length) return 0;
    await Promise.allSettled(
      rows.map(async (row: any) => {
        await this.deleteObject(row.key).catch(() => undefined);
        await this.fileRepo.markOrphan(row.id);
        this.logger.log({ event: "file.gc.temp_expired", fileId: row.id, key: row.key });
      }),
    );
    return rows.length;
  }
  async hardDeleteOrphans(olderThanDays = 7, batchSize = 200): Promise<number> {
    const rows = await this.fileRepo.findOrphanArchived(olderThanDays, batchSize);
    if (!rows.length) return 0;
    await Promise.allSettled(
      rows.map(async (row: any) => {
        await this.deleteObject(row.key).catch(() => undefined);
        await this.fileRepo.deleteById(row.id);
        this.logger.log({ event: "file.gc.orphan_hard_deleted", fileId: row.id, key: row.key });
      }),
    );
    return rows.length;
  }
  async archiveOwnerFiles(ownerType: FileOwnerType, ownerId: string): Promise<void> {
    const rows = await this.fileRepo.findActiveByOwner(ownerType, ownerId);
    if (!rows.length) return;
    await Promise.allSettled(
      rows.map(async (f: any) => {
        const archiveKey = resolveArchiveKey(f.key);
        try {
          await this.copyObject(f.key, archiveKey);
          await this.deleteObject(f.key).catch(() => undefined);
          await this.fileRepo.updateKeyAndStatus(f.id, archiveKey, "archived");
          this.logger.log({ event: "file.archive.success", fileId: f.id, sourceKey: f.key, archiveKey });
        } catch (err: unknown) {
          this.logger.error({ event: "file.archive.fail", fileId: f.id, key: f.key, error: (err as Error).message });
        }
      }),
    );
  }
  async restoreOwnerFiles(ownerType: FileOwnerType, ownerId: string): Promise<void> {
    const rows = await this.fileRepo.findArchivedByOwner(ownerType, ownerId);
    if (!rows.length) return;
    await Promise.allSettled(
      rows.map(async (f: any) => {
        const originalKey = stripArchivePrefix(f.key);
        if (originalKey === f.key) return;
        try {
          await this.copyObject(f.key, originalKey);
          await this.deleteObject(f.key).catch(() => undefined);
          await this.fileRepo.updateKeyAndStatus(f.id, originalKey, "active");
          this.logger.log({ event: "file.restore.success", fileId: f.id, sourceKey: f.key, restoredKey: originalKey });
        } catch (err: unknown) {
          this.logger.error({ event: "file.restore.fail", fileId: f.id, key: f.key, error: (err as Error).message });
        }
      }),
    );
  }
  async insertPendingUploadRecord(values: {
    id: string; key: string; bucket: string; ownerType: string;
    ownerId: string; purpose: string; mimeType: string;
    sizeBytes: number; uploadedBy: string;
  }) {
    await this.fileRepo.insert({ ...values, status: "pending_upload" } as any);
  }
  async confirmPendingUpload(fileId: string, purpose?: string): Promise<void> {
    const updates: Record<string, unknown> = { status: "active", finalizedAt: new Date() };
    if (purpose) updates.purpose = purpose;
    await this.fileRepo.update(fileId, { ...updates, updatedAt: new Date() });
  }
  async getFileById(fileId: string) {
    return this.fileRepo.findById(fileId);
  }
  isPublicPurpose(purpose: string): boolean {
    return ["avatar"].includes(purpose);
  }
  async healthCheck(): Promise<{ ok: boolean; backend: string; detail?: string }> {
    if (this.s3Client.isS3()) {
      const result = await this.s3Client.healthCheckS3();
      return { ...result, backend: "s3" };
    }
    try {
      const publicDir = join(process.cwd(), "public");
      try { await fs.access(publicDir); } catch { await fs.mkdir(publicDir, { recursive: true }); }
      return { ok: true, backend: "local" };
    } catch (err: unknown) {
      return { ok: false, backend: "local", detail: (err as Error).message || "local_storage_unreachable" };
    }
  }
}
