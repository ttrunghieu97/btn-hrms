import { Injectable, Inject } from "@nestjs/common";
import { and, eq, or } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { DATABASE_CONNECTION } from "../database/database.provider";
import * as schema from "../database/schema";
import type { FileEntity } from "./storage.types";

@Injectable()
export class FileAccessService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  /**
   * Single indexed lookup by storage key.
   * Returns null if file does not exist or is not readable.
   * Auth enforcement (ownership check) is the caller's responsibility.
   */
  async resolve(key: string): Promise<FileEntity | null> {
    const normalizedKey = key.replace(/^\/+/, "");

    const [file] = await this.db
      .select()
      .from(schema.files)
      .where(
        and(
          eq(schema.files.key, normalizedKey),
          or(
            eq(schema.files.status, "active"),
            eq(schema.files.status, "temp"),
          ),
        ),
      )
      .limit(1);

    return (file as FileEntity) ?? null;
  }

  /**
   * Checks whether a given user has access to read a file.
   * Super-admins bypass ownership checks.
   * Regular users can only access their own employee's files.
   * Infected/quarantined files are blocked for all non-super-admin users.
   */
  canAccess(
    file: FileEntity & { scanStatus?: string | null },
    user: {
      id: string;
      employeeId?: string;
      isSuperAdmin?: boolean;
      permissions?: string[];
    },
  ): boolean {
    // Block infected files for regular users
    if (file.scanStatus === "infected" && !user.isSuperAdmin) {
      return false;
    }

    if (user.isSuperAdmin) return true;
    if (file.purpose === "avatar" && file.status === "active") return true;
    if (file.ownerType === "employee" && user.permissions?.includes("employees:view")) {
      return true;
    }
    if (file.ownerType === "employee" && user.employeeId) {
      return file.ownerId === user.employeeId;
    }
    if (file.uploadedBy === user.id) return true;
    return false;
  }
}
