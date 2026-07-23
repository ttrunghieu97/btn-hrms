import { Injectable, Inject } from "@nestjs/common";
import { DATABASE_CONNECTION } from "../../../../infrastructure/database/database.provider";
import type { AppDatabase } from "../../../../infrastructure/database/database-client.type";
import { eq, and, desc, inArray, count } from "drizzle-orm";
import * as schema from "../../../../infrastructure/database/schema";

export interface LoginHistoryEntryDto {
  id: string;
  action: "login_success" | "login_failed";
  timestamp: Date;
  clientIp: string | null;
  userAgent: string | null;
  reason: string | null;
}

@Injectable()
export class ListLoginHistoryUseCase {
  constructor(
    @Inject(DATABASE_CONNECTION) private readonly db: AppDatabase,
  ) {}

  async execute(
    userId: string,
    options?: { page?: number; limit?: number },
  ): Promise<{ entries: LoginHistoryEntryDto[]; total: number }> {
    const page = options?.page ?? 1;
    const limit = Math.min(options?.limit ?? 20, 100);
    const offset = (page - 1) * limit;

    const loginActions = ["auth_login", "auth_login_failed"];

    const whereClause = and(
      eq(schema.auditLogs.actorUserId, userId),
      eq(schema.auditLogs.entity, "auth"),
      inArray(schema.auditLogs.action, loginActions),
    );

    const [totalResult] = await this.db
      .select({ value: count() })
      .from(schema.auditLogs)
      .where(whereClause);
    const total = totalResult?.value ? Number(totalResult.value) : 0;

    const rows = await this.db
      .select({
        id: schema.auditLogs.id,
        action: schema.auditLogs.action,
        timestamp: schema.auditLogs.createdAt,
        metadata: schema.auditLogs.metadata,
      })
      .from(schema.auditLogs)
      .where(whereClause)
      .orderBy(desc(schema.auditLogs.createdAt))
      .limit(limit)
      .offset(offset);

    const entries: LoginHistoryEntryDto[] = rows.map((row) => {
      const meta = (row.metadata ?? {}) as Record<string, unknown>;
      const isSuccess = row.action === "auth_login";
      return {
        id: row.id,
        action: isSuccess ? "login_success" : "login_failed",
        timestamp: row.timestamp,
        clientIp: ((meta.clientIp as string) || (meta.metadata as Record<string, unknown>)?.clientIp as string) ?? null,
        userAgent: ((meta.userAgent as string) || (meta.metadata as Record<string, unknown>)?.userAgent as string) ?? null,
        reason: isSuccess ? null : ((meta.reason as string) || (meta.metadata as Record<string, unknown>)?.reason as string) ?? null,
      };
    });

    return { entries, total };
  }
}
