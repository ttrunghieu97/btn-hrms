import { Injectable } from "@nestjs/common";
import { Inject } from "@nestjs/common";
import { DATABASE_CONNECTION } from "../../../../infrastructure/database/database.provider";
import type { AppDatabase } from "../../../../infrastructure/database/database-client.type";
import { eq } from "drizzle-orm";
import * as schema from "../../../../infrastructure/database/schema";
import { GoogleAuthService } from "../services/google-auth.service";
import { throwConflict, throwNotFound } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { ERROR_REASONS } from "../../../../shared/constants/error-reasons";
import { CONTRACTS_TOKENS } from "../../../../contracts/contracts.tokens";
import { type AuditLogPort } from "../../../../contracts/ports/audit-log.port";
import { RequestContextService } from "../../../../shared/context/request-context.service";

@Injectable()
export class LinkEmailUseCase {
  constructor(
    @Inject(DATABASE_CONNECTION) private readonly db: AppDatabase,
    private readonly googleAuth: GoogleAuthService,
    private readonly requestContext: RequestContextService,
    @Inject(CONTRACTS_TOKENS.AUDIT_LOG_PORT)
    private readonly auditLog: AuditLogPort,
  ) {}

  async execute(userId: string, idToken: string) {
    const googleUser = await this.googleAuth.verifyToken(idToken);

    const existing = await this.db.query.userIdentities.findFirst({
      where: eq(schema.userIdentities.providerSub, googleUser.sub),
      columns: { id: true },
    });
    if (existing) {
      throwConflict(
        "Tài khoản Google này đã được liên kết với người dùng khác",
        ERROR_CODES.CONFLICT,
        { reason: "DUPLICATE_IDENTITY" },
      );
    }

    await this.db.transaction(async (tx) => {
      await tx.insert(schema.userIdentities).values({
        userId,
        provider: "google",
        providerSub: googleUser.sub,
        email: googleUser.email,
      });

      await tx
        .update(schema.users)
        .set({ email: googleUser.email, updatedAt: new Date() })
        .where(eq(schema.users.id, userId));
    });

    const actor = this.requestContext.get();
    await this.auditLog.write({
      actorUserId: actor?.userId ?? undefined,
      action: "identity_email_linked",
      entity: "user",
      entityId: userId,
      metadata: { provider: "google", email: googleUser.email },
    });

    return {
      success: true,
      email: googleUser.email,
      name: googleUser.name ?? null,
      picture: googleUser.picture ?? null,
    };
  }
}
