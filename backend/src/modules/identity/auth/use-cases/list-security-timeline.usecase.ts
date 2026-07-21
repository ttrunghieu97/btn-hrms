import { Injectable, Inject } from "@nestjs/common";
import { DATABASE_CONNECTION } from "../../../../infrastructure/database/database.provider";
import type { AppDatabase } from "../../../../infrastructure/database/database-client.type";
import { eq, and, desc, inArray, count } from "drizzle-orm";
import * as schema from "../../../../infrastructure/database/schema";

export interface SecurityTimelineEntryDto {
  id: string;
  action: string;
  entity: string;
  timestamp: Date;
  metadata: Record<string, unknown> | null;
}

const SECURITY_ACTIONS = [
  "auth_login",
  "auth_login_failed",
  "auth_logout",
  "auth_logout_all",
  "auth_change_password",
  "auth_refresh",
  "auth_refresh_token_reuse_detected",
  "auth_session_revoke",
  "identity_password_reset",
  "identity_roles_updated",
  "identity_user_disabled",
];

const ACTION_LABELS: Record<string, string> = {
  auth_login: "Đăng nhập thành công",
  auth_login_failed: "Đăng nhập thất bại",
  auth_logout: "Đăng xuất",
  auth_logout_all: "Đăng xuất tất cả",
  auth_change_password: "Đổi mật khẩu",
  auth_refresh: "Làm mới token",
  auth_refresh_token_reuse_detected: "Phát hiện token bị dùng lại",
  auth_session_revoke: "Thu hồi session",
  identity_password_reset: "Reset mật khẩu",
  identity_roles_updated: "Cập nhật phân quyền",
  identity_user_disabled: "Vô hiệu hoá tài khoản",
};

@Injectable()
export class ListSecurityTimelineUseCase {
  constructor(
    @Inject(DATABASE_CONNECTION) private readonly db: AppDatabase,
  ) {}

  async execute(
    userId: string,
    options?: { page?: number; limit?: number },
  ): Promise<{
    entries: SecurityTimelineEntryDto[];
    total: number;
  }> {
    const page = options?.page ?? 1;
    const limit = Math.min(options?.limit ?? 30, 100);
    const offset = (page - 1) * limit;

    const whereClause = and(
      eq(schema.auditLogs.actorUserId, userId),
      inArray(schema.auditLogs.action, SECURITY_ACTIONS),
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
        entity: schema.auditLogs.entity,
        timestamp: schema.auditLogs.createdAt,
        metadata: schema.auditLogs.metadata,
      })
      .from(schema.auditLogs)
      .where(whereClause)
      .orderBy(desc(schema.auditLogs.createdAt))
      .limit(limit)
      .offset(offset);

    const entries: SecurityTimelineEntryDto[] = rows.map((row) => ({
      id: row.id,
      action: ACTION_LABELS[row.action] || row.action,
      entity: row.entity,
      timestamp: row.timestamp,
      metadata: row.metadata as Record<string, unknown> | null,
    }));

    return { entries, total };
  }
}
