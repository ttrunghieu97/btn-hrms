import { Injectable, Inject } from "@nestjs/common";
import { DATABASE_CONNECTION } from "../../../../infrastructure/database/database.provider";
import type { AppDatabase } from "../../../../infrastructure/database/database-client.type";
import { eq, and, isNull, desc } from "drizzle-orm";
import * as schema from "../../../../infrastructure/database/schema";

export interface UserSessionDto {
  id: string;
  userAgent: string | null;
  clientIp: string | null;
  createdAt: Date;
  expiresAt: Date;
  isCurrent: boolean;
}

@Injectable()
export class ListUserSessionsUseCase {
  constructor(
    @Inject(DATABASE_CONNECTION) private readonly db: AppDatabase,
  ) {}

  async execute(userId: string, currentSessionId?: string): Promise<UserSessionDto[]> {
    const rows = await this.db
      .select({
        id: schema.refreshTokens.id,
        userAgent: schema.refreshTokens.userAgent,
        clientIp: schema.refreshTokens.clientIp,
        createdAt: schema.refreshTokens.createdAt,
        expiresAt: schema.refreshTokens.expiresAt,
      })
      .from(schema.refreshTokens)
      .where(
        and(
          eq(schema.refreshTokens.userId, userId),
          isNull(schema.refreshTokens.revokedAt),
          isNull(schema.refreshTokens.supersededAt),
        ),
      )
      .orderBy(desc(schema.refreshTokens.createdAt));

    return rows.map((row) => ({
      ...row,
      isCurrent: row.id === currentSessionId,
    }));
  }
}
