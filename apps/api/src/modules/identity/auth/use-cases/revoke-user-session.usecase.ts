import { Injectable } from "@nestjs/common";
import { Inject } from "@nestjs/common";
import { DATABASE_CONNECTION } from "../../../../infrastructure/database/database.provider";
import type { AppDatabase } from "../../../../infrastructure/database/database-client.type";
import { eq, and } from "drizzle-orm";
import * as schema from "../../../../infrastructure/database/schema";
import { throwNotFound, throwForbidden } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { ERROR_REASONS } from "../../../../shared/constants/error-reasons";

@Injectable()
export class RevokeUserSessionUseCase {
  constructor(
    @Inject(DATABASE_CONNECTION) private readonly db: AppDatabase,
  ) {}

  async execute(userId: string, sessionId: string) {
    const session = await this.db.query.refreshTokens.findFirst({
      where: eq(schema.refreshTokens.id, sessionId),
      columns: { id: true, userId: true, revokedAt: true },
    });

    if (!session) {
      throwNotFound("Session not found", ERROR_CODES.NOT_FOUND, { sessionId });
    }

    if (session.userId !== userId) {
      throwForbidden("Cannot revoke another user's session", ERROR_CODES.PERMISSION_DENIED, {
        reason: ERROR_REASONS.MISSING_PERMISSION,
      });
    }

    if (session.revokedAt) {
      return { success: true };
    }

    await this.db
      .update(schema.refreshTokens)
      .set({ revokedAt: new Date() })
      .where(eq(schema.refreshTokens.id, sessionId));

    return { success: true };
  }
}
