import { Injectable } from "@nestjs/common";
import { randomUUID } from "crypto";
import { StorageService } from "../../../../infrastructure/storage/storage.service";

export type SelfieStorageResult = {
  /** Canonical storage key (e.g. "attendance/selfies/<yyyy>/<mm>/<id>.jpg"). */
  key: string;
  /** Public-facing URL (matches StorageService.getPublicPath). */
  url: string;
};

/**
 * Thin wrapper around StorageService that keeps selfie keys under a
 * predictable prefix and attaches the correct content-type. Retention
 * and purging are handled by the existing StorageCleanupService + a
 * future `selfie-purge` cron (§10.3).
 */
@Injectable()
export class SelfieStorageService {
  constructor(private readonly storage: StorageService) {}

  async upload(
    employeeId: string,
    buffer: Buffer,
    mime: string,
    uploadedBy?: string,
  ): Promise<SelfieStorageResult> {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, "0");
    const ext = mime === "image/png" ? "png" : "jpg";
    const fileId = randomUUID();
    const originalName = `${fileId}.${ext}`;
    const targetPrefix = `attendance/selfies/${year}/${month}/${employeeId}`;
    const upload = await this.storage.uploadTemp({
      buffer,
      mimeType: mime,
      originalName,
      ownerType: "employee",
      ownerId: employeeId,
      purpose: "attachment",
      uploadedBy: uploadedBy ?? employeeId,
    });
    const url =
      (await this.storage.promoteTempTo(upload.url, targetPrefix)) ?? upload.url;
    const key = url.startsWith("/public/")
      ? url.slice("/public/".length)
      : url.startsWith("/files/")
        ? url.slice("/files/".length)
        : upload.key;
    return { key, url };
  }
}



