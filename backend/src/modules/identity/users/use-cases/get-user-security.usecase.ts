import { Injectable, Inject } from "@nestjs/common";
import { DATABASE_CONNECTION } from "../../../../infrastructure/database/database.provider";
import type { AppDatabase } from "../../../../infrastructure/database/database-client.type";
import { eq, and, isNull, count } from "drizzle-orm";
import * as schema from "../../../../infrastructure/database/schema";
import { throwNotFound } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";

export interface UserSecurityResponseDto {
  lastLoginAt: Date | null;
  passwordChangedAt: Date | null;
  forcePasswordChange: boolean;
  failedAttempts: number;
  sessions: number;
}

@Injectable()
export class GetUserSecurityUseCase {
  constructor(
    @Inject(DATABASE_CONNECTION) private readonly db: AppDatabase,
  ) {}

  async execute(userId: string): Promise<UserSecurityResponseDto> {
    const user = await this.db.query.users.findFirst({
      where: eq(schema.users.id, userId),
      columns: {
        id: true,
        lastLoginAt: true,
        mustChangePassword: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throwNotFound("User not found", ERROR_CODES.USER_NOT_FOUND, { userId });
    }

    const [sessionCount] = await this.db
      .select({ value: count() })
      .from(schema.refreshTokens)
      .where(
        and(
          eq(schema.refreshTokens.userId, userId),
          isNull(schema.refreshTokens.revokedAt),
        ),
      );

    const [failedLogins] = await this.db
      .select({ value: count() })
      .from(schema.auditLogs)
      .where(
        and(
          eq(schema.auditLogs.actorUserId, userId),
          eq(schema.auditLogs.entity, "auth"),
          eq(schema.auditLogs.action, "auth_login_failed"),
        ),
      );

    return {
      lastLoginAt: user.lastLoginAt ?? null,
      passwordChangedAt: user.updatedAt ?? null,
      forcePasswordChange: user.mustChangePassword ?? false,
      failedAttempts: failedLogins?.value ? Number(failedLogins.value) : 0,
      sessions: sessionCount?.value ? Number(sessionCount.value) : 0,
    };
  }
}
