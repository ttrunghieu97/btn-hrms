export type StorageBackend = "local" | "s3";

export type FileStatus = "temp" | "active" | "archived" | "replaced" | "orphan" | "finalize_failed" | "pending_upload";
export type FileOwnerType = "employee" | "task" | "user" | "application";
export type FilePurpose =
  | "avatar"
  | "document"
  | "attachment"
  | "certification"
  | "cv";

export interface FileEntity {
  id: string;
  key: string;
  bucket: string;
  ownerType: FileOwnerType;
  ownerId: string;
  purpose: FilePurpose;
  status: FileStatus;
  mimeType: string | null;
  sizeBytes: number | null;
  sha256: string | null;
  uploadedBy: string | null;
  finalizedAt: Date | null;
  expiresAt: Date | null;
  scanStatus: string | null;
  scanResult: string | null;
  scannedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UploadTempInput {
  buffer: Buffer;
  mimeType: string;
  originalName: string;
  ownerType: FileOwnerType;
  ownerId: string;
  purpose: FilePurpose;
  uploadedBy: string;
}

export interface UploadTempResult {
  fileId: string;
  tempFileToken: string;
  key: string;
  url: string;
  expiresAt: Date;
  deduplicated: boolean;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
}

export interface StoreFileInput {
  buffer: Buffer;
  mimeType: string;
  originalName: string;
  ownerType: FileOwnerType;
  ownerId: string;
  purpose: FilePurpose;
  uploadedBy: string;
}

export interface StoreFileResult {
  fileId: string;
  key: string;
  url: string;
  deduplicated: boolean;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
}

export interface FinalizeRequest {
  fileToken: string;
  ownerType: FileOwnerType;
  ownerId: string;
  purpose: FilePurpose;
  uploadedBy?: string;
}

export interface FinalizeResult {
  fileId: string;
  key: string;
  url: string;
}

export interface StorageObjectMeta {
  etag?: string;
  lastModified?: Date;
  size?: number;
  contentType?: string;
}

export interface PendingFinalizeEntity {
  id: string;
  fileId: string;
  ownerType: FileOwnerType;
  ownerId: string;
  targetKey: string;
  attempts: number;
  lastError: string | null;
  nextRetryAt: Date;
  createdAt: Date;
}
