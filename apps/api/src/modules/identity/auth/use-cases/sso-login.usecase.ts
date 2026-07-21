import { Injectable } from "@nestjs/common";
import { Inject } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { DATABASE_CONNECTION } from "../../../../infrastructure/database/database.provider";
import type { AppDatabase } from "../../../../infrastructure/database/database-client.type";
import { eq, or } from "drizzle-orm";
import * as schema from "../../../../infrastructure/database/schema";
import { GoogleAuthService } from "../services/google-auth.service";
import { AuthRepository } from "../repositories/auth.repository";
import { AuthMapper } from "../mappers/auth.mapper";
import { AuthUseCaseBase } from "./auth-usecase-base";
import { GetUserPermissionsUseCase } from "../../permissions/use-cases/get-user-permissions.usecase";
import { RequestContextService } from "../../../../shared/context/request-context.service";
import { throwUnauthorized } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { ERROR_REASONS } from "../../../../shared/constants/error-reasons";
import { CONTRACTS_TOKENS } from "../../../../contracts/contracts.tokens";
import { type AuditLogPort } from "../../../../contracts/ports/audit-log.port";

@Injectable()
export class SsoLoginUseCase extends AuthUseCaseBase {
  constructor(
    jwtService: JwtService,
    configService: ConfigService,
    authRepo: AuthRepository,
    @Inject(DATABASE_CONNECTION) private readonly db: AppDatabase,
    private readonly googleAuth: GoogleAuthService,
    private readonly getUserPermissions: GetUserPermissionsUseCase,
    requestContext: RequestContextService,
    @Inject(CONTRACTS_TOKENS.AUDIT_LOG_PORT)
    private readonly auditLog: AuditLogPort,
  ) {
    super(jwtService, configService, authRepo, requestContext);
  }

  async execute(idToken: string, userAgent?: string, clientIp?: string) {
    const googleUser = await this.googleAuth.verifyToken(idToken);

    // Try matching by user_identities first
    const identity = await this.db.query.userIdentities.findFirst({
      where: eq(schema.userIdentities.providerSub, googleUser.sub),
      columns: { userId: true },
    });

    let dbUser: { id: string; username: string; email: string | null; isSuperAdmin: boolean; isActive: boolean | null; authorizationVersion: number } | null = null;

    if (identity) {
      const u = await this.db.query.users.findFirst({
        where: eq(schema.users.id, identity.userId),
        columns: { id: true, username: true, email: true, isSuperAdmin: true, isActive: true, authorizationVersion: true },
      });
      if (u) dbUser = u;
    }

    // Fallback: match by email
    if (!dbUser) {
      const u = await this.db.query.users.findFirst({
        where: eq(schema.users.email, googleUser.email),
        columns: { id: true, username: true, email: true, isSuperAdmin: true, isActive: true, authorizationVersion: true },
      });
      if (u) {
        dbUser = u;
        // Auto-link this identity
        await this.db.insert(schema.userIdentities).values({
          userId: u.id,
          provider: "google",
          providerSub: googleUser.sub,
          email: googleUser.email,
        }).onConflictDoNothing();
      }
    }

    if (!dbUser) {
      await this.auditLog.write({
        action: "auth_login_failed",
        entity: "auth",
        metadata: { email: googleUser.email, reason: "email_not_registered", provider: "google" },
      });
      throwUnauthorized(
        "Email chưa được đăng ký trong hệ thống. Vui lòng liên hệ HR.",
        ERROR_CODES.AUTH_INVALID_CREDENTIALS,
        { reason: ERROR_REASONS.INVALID_CREDENTIALS },
      );
    }

    if (dbUser.isActive === false) {
      throwUnauthorized(
        "Tài khoản đã bị vô hiệu hoá",
        ERROR_CODES.AUTH_INVALID_CREDENTIALS,
        { reason: ERROR_REASONS.INVALID_CREDENTIALS },
      );
    }

    await this.authRepo.updateLastLoginAt(dbUser.id);

    const permissionCodes = await this.getUserPermissions.execute(dbUser.id);

    const tokens = await this.issueTokens(dbUser.id, dbUser.email!, dbUser.authorizationVersion);
    await this.saveRefreshToken(
      dbUser.id,
      tokens.refreshToken,
      tokens.refreshTokenId,
      tokens.refreshExpiresAt,
      userAgent,
      clientIp,
    );

    return AuthMapper.toAuthResponse(tokens.accessToken, tokens.refreshToken, {
      id: dbUser.id,
      username: dbUser.username,
      email: dbUser.email ?? "",
      isSuperAdmin: dbUser.isSuperAdmin || permissionCodes.includes("sys:all"),
      permissions: permissionCodes,
    }, this.getAccessTokenExpiresInSeconds());
  }
}
