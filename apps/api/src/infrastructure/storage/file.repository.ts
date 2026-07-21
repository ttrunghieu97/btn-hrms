import { Injectable, Inject } from "@nestjs/common";
import {
  and,
  eq,
  inArray,
  lt,
  or,
  sql,
} from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { DATABASE_CONNECTION } from "../database/database.provider";
import * as schema from "../database/schema";
import type {
  FileOwnerType,
  FilePurpose,
  FileStatus,
} from "./storage.types";

export interface FileRow {
  id: string;
  key: string;
  bucket: string;
  ownerType: string;
  ownerId: string;
  purpose: string;
  status: FileStatus;
  mimeType: string | null;
  sizeBytes: number | null;
  sha256: string | null;
  uploadedBy: string | null;
  finalizedAt: Date | null;
  expiresAt: Date | null;
  finalizeAttempts: number;
  lastFinalizeAt: Date | null;
  lastFinalizeError: string | null;
  thumbnailKey: string | null;
  legalHoldAt: Date | null;
  retentionDays: number | null;
  scanStatus: string | null;
  scanResult: string | null;
  scannedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type FileIdKey = Pick<FileRow, "id" | "key">;

@Injectable()
export class FileRepository {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  /** Find a file by its id. Returns full row. */
  async findById(fileId: string): Promise<FileRow | undefined> {
    const [row] = await this.db
      .select()
      .from(schema.files)
      .where(eq(schema.files.id, fileId))
      .limit(1);
    return row;
  }

  /** Find a file by its storage key. */
  async findByKey(key: string): Promise<FileRow | undefined> {
    const [row] = await this.db
      .select()
      .from(schema.files)
      .where(eq(schema.files.key, key))
      .limit(1);
    return row;
  }

  /** Find an active file with matching content hash, owner, and purpose (dedup). */
  async findActiveBySha256(
    sha256: string,
    ownerType: FileOwnerType,
    ownerId: string,
    purpose: FilePurpose,
  ): Promise<Pick<FileRow, "id" | "key"> | undefined> {
    const [row] = await this.db
      .select({ id: schema.files.id, key: schema.files.key })
      .from(schema.files)
      .where(
        and(
          eq(schema.files.sha256, sha256),
          eq(schema.files.ownerType, ownerType),
          eq(schema.files.ownerId, ownerId),
          eq(schema.files.purpose, purpose),
          eq(schema.files.status, "active"),
        ),
      )
      .limit(1);
    return row;
  }

  /** Insert a new file record. */
  async insert(values: Partial<FileRow>): Promise<void> {
    await this.db.insert(schema.files).values(values as FileRow);
  }

  /** Update a file record by id. */
  async update(fileId: string, values: Partial<FileRow>): Promise<void> {
    await this.db
      .update(schema.files)
      .set(values)
      .where(eq(schema.files.id, fileId));
  }

  /** Delete a file record by id. */
  async deleteById(fileId: string): Promise<void> {
    await this.db
      .delete(schema.files)
      .where(eq(schema.files.id, fileId));
  }

  /** Find a pending (temp) file matching ownership for finalization. */
  async findPendingFile(
    fileToken: string,
    ownerType: FileOwnerType,
    purpose: FilePurpose,
    uploadedBy?: string,
  ): Promise<FileRow | undefined> {
    const conditions = [
      eq(schema.files.id, fileToken),
      eq(schema.files.ownerType, ownerType),
      eq(schema.files.purpose, purpose),
    ];
    if (uploadedBy) {
      conditions.push(eq(schema.files.uploadedBy, uploadedBy));
    }
    const [row] = await this.db
      .select()
      .from(schema.files)
      .where(and(...conditions))
      .limit(1);
    return row;
  }

  /** Batch find files by ids, returning only id + key. */
  async findByIds(fileIds: string[]): Promise<FileIdKey[]> {
    if (!fileIds.length) return [];
    return this.db
      .select({ id: schema.files.id, key: schema.files.key })
      .from(schema.files)
      .where(inArray(schema.files.id, fileIds));
  }

  /** Find all active files for an owner type + id (archive/restore/purge). */
  async findActiveByOwner(
    ownerType: FileOwnerType,
    ownerId: string,
  ): Promise<FileIdKey[]> {
    return this.db
      .select({ id: schema.files.id, key: schema.files.key })
      .from(schema.files)
      .where(
        and(
          eq(schema.files.ownerType, ownerType),
          eq(schema.files.ownerId, ownerId),
          eq(schema.files.status, "active"),
        ),
      );
  }

  /** Find all archived files for an owner type + id (restore). */
  async findArchivedByOwner(
    ownerType: FileOwnerType,
    ownerId: string,
  ): Promise<FileIdKey[]> {
    return this.db
      .select({ id: schema.files.id, key: schema.files.key })
      .from(schema.files)
      .where(
        and(
          eq(schema.files.ownerType, ownerType),
          eq(schema.files.ownerId, ownerId),
          eq(schema.files.status, "archived"),
        ),
      );
  }

  /** Find all files for an owner type + id (purge all statuses). */
  async findAllByOwner(
    ownerType: FileOwnerType,
    ownerId: string,
  ): Promise<FileIdKey[]> {
    return this.db
      .select({ id: schema.files.id, key: schema.files.key })
      .from(schema.files)
      .where(
        and(
          eq(schema.files.ownerType, ownerType),
          eq(schema.files.ownerId, ownerId),
        ),
      );
  }

  /** Find expired temp files (for GC). */
  async findExpiredTemp(batchSize: number): Promise<FileIdKey[]> {
    return this.db
      .select({ id: schema.files.id, key: schema.files.key })
      .from(schema.files)
      .where(
        and(
          eq(schema.files.status, "temp"),
          lt(schema.files.expiresAt, sql`NOW()`),
        ),
      )
      .limit(batchSize);
  }

  /** Find orphan/archived files older than N days (for hard-delete GC). */
  async findOrphanArchived(
    olderThanDays: number,
    batchSize: number,
  ): Promise<FileIdKey[]> {
    return this.db
      .select({ id: schema.files.id, key: schema.files.key })
      .from(schema.files)
      .where(
        and(
          or(
            eq(schema.files.status, "orphan"),
            eq(schema.files.status, "archived"),
          ),
          lt(
            schema.files.updatedAt,
            sql`NOW() - make_interval(days => ${olderThanDays})`,
          ),
        ),
      )
      .limit(batchSize);
  }

  /** Mark multiple files as archived. */
  async markArchived(fileIds: string[]): Promise<void> {
    if (!fileIds.length) return;
    await this.db
      .update(schema.files)
      .set({ status: "archived", updatedAt: new Date() })
      .where(inArray(schema.files.id, fileIds));
  }

  /** Mark a single file as orphan. */
  async markOrphan(fileId: string): Promise<void> {
    await this.db
      .update(schema.files)
      .set({ status: "orphan", updatedAt: new Date() })
      .where(eq(schema.files.id, fileId));
  }

  /** Update file key (used during archive/restore promotion). */
  async updateKeyAndStatus(
    fileId: string,
    key: string,
    status: FileStatus,
  ): Promise<void> {
    await this.db
      .update(schema.files)
      .set({
        key,
        status,
        updatedAt: new Date(),
      })
      .where(eq(schema.files.id, fileId));
  }

  /** Soft-delete by setting expiresAt in the past. */
  async markTempExpired(fileId: string): Promise<void> {
    await this.db
      .update(schema.files)
      .set({
        status: "orphan",
        updatedAt: new Date(),
      })
      .where(eq(schema.files.id, fileId));
  }

  /** Get file metadata by id (subset used by getFileById). */
  async findFileMeta(fileId: string): Promise<{
    id: string;
    key: string;
    status: string;
    mimeType: string | null;
    purpose: string;
    ownerType: string;
    ownerId: string;
    uploadedBy: string | null;
    sizeBytes: number | null;
  } | null> {
    const [row] = await this.db
      .select({
        id: schema.files.id,
        key: schema.files.key,
        status: schema.files.status,
        mimeType: schema.files.mimeType,
        purpose: schema.files.purpose,
        ownerType: schema.files.ownerType,
        ownerId: schema.files.ownerId,
        uploadedBy: schema.files.uploadedBy,
        sizeBytes: schema.files.sizeBytes,
      })
      .from(schema.files)
      .where(eq(schema.files.id, fileId))
      .limit(1);
    return row ?? null;
  }
}
