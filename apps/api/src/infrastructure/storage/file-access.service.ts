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

    if (user.isSuperAdmin || user.permissions?.includes("sys:all") || user.permissions?.includes("ALL")) {
      return true;
    }
    if (file.purpose === "avatar" && file.status === "active") return true;

    // Direct ownership & upload access
    if (file.uploadedBy === user.id) return true;
    if (file.ownerType === "employee" && user.employeeId && file.ownerId === user.employeeId) {
      return true;
    }

    const perms = user.permissions ?? [];

    // Domain-level permissions
    if (
      file.ownerType === "employee" &&
      (perms.includes("employees:view") || perms.includes("employees:view:all") || perms.includes("employees:edit"))
    ) {
      return true;
    }

    if (
      file.ownerType === "leave" &&
      (perms.includes("leave:view") || perms.includes("leave:approve") || perms.includes("leave:view:all") || perms.includes("leave:view:department") || perms.includes("leave:manage"))
    ) {
      return true;
    }

    if (
      file.ownerType === "task" &&
      (perms.includes("tasks:view") || perms.includes("tasks:view:all") || perms.includes("tasks:edit") || perms.includes("tasks:manage") || perms.includes("tasks:assign"))
    ) {
      return true;
    }

    if (
      file.ownerType === "attendance" &&
      (perms.includes("attendance:view") || perms.includes("attendance:view:all") || perms.includes("attendance:report") || perms.includes("attendance:manage"))
    ) {
      return true;
    }

    if (
      file.ownerType === "payroll" &&
      (perms.includes("payroll:view") || perms.includes("payroll:view:all") || perms.includes("payroll:manage") || perms.includes("payroll:manage_periods"))
    ) {
      return true;
    }

    return false;
  }
}
