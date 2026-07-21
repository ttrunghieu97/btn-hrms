import * as bcrypt from "bcrypt";
import { type JwtService } from "@nestjs/jwt";
import { type ConfigService } from "@nestjs/config";
import { randomUUID } from "crypto";
import {
  type AuthRepository,
  type AuthTransaction,
  type NewRefreshToken,
} from "../repositories/auth.repository";
import { type RequestContextService } from "../../../../shared/context/request-context.service";
import { ContextLogger } from "../../../../shared/logging/context-logger";
import { throwUnauthorized } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { ERROR_REASONS } from "../../../../shared/constants/error-reasons";

export type RefreshTokenPayload = {
  sub: string;
  email?: string;
  jti?: string;
  typ?: string;
  exp?: number;
  iat?: number;
};

export type IssuedTokens = {
  accessToken: string;
  refreshToken: string;
  refreshTokenId: string;
  refreshExpiresAt: Date;
  authorizationVersion: number;
};

export abstract class AuthUseCaseBase {
  protected static readonly REFRESH_TYP = "refresh";
  protected readonly logger: ContextLogger;

  protected constructor(
    protected readonly jwtService: JwtService,
    protected readonly configService: ConfigService,
    protected readonly authRepo: AuthRepository,
    protected readonly requestContext: RequestContextService,
  ) {
    this.logger = new ContextLogger(this.requestContext, this.constructor.name);
  }

  protected async issueTokens(
    userId: string,
    email: string,
    authorizationVersion: number,
  ): Promise<IssuedTokens> {
    const refreshTokenId = randomUUID();
    const jwtSecret = this.requireConfig("AUTH_JWT_SECRET");
    const refreshSecret = this.requireConfig("AUTH_JWT_REFRESH_SECRET");

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        { sub: userId, email, azv: authorizationVersion },
        {
          secret: jwtSecret,
          expiresIn: this.configService.get("AUTH_JWT_ACCESS_EXPIRES_IN") || "30m",
        },
      ),
      this.jwtService.signAsync(
        {
          sub: userId,
          email,
          jti: refreshTokenId,
          typ: AuthUseCaseBase.REFRESH_TYP,
        },
        {
          secret: refreshSecret,
          expiresIn: "7d",
        },
      ),
    ]);

    const decoded = this.jwtService.decode(refreshToken);
    const refreshExpiresAt =
      decoded?.exp && typeof decoded.exp === "number"
        ? new Date(decoded.exp * 1000)
        : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    return { accessToken, refreshToken, refreshTokenId, refreshExpiresAt, authorizationVersion };
  }

  protected async saveRefreshToken(
    userId: string,
    refreshToken: string,
    refreshTokenId: string,
    refreshExpiresAt: Date,
    userAgent?: string,
    clientIp?: string,
    tx?: AuthTransaction,
  ) {
    const rounds = Number(this.configService.get("AUTH_BCRYPT_ROUNDS") || 12);
    const salt = await bcrypt.genSalt(rounds);
    const hash = await bcrypt.hash(refreshToken, salt);

    const token: NewRefreshToken = {
      id: refreshTokenId,
      userId,
      tokenHash: hash,
      userAgent: userAgent ?? null,
      clientIp: clientIp ?? null,
      expiresAt: refreshExpiresAt,
      revokedAt: null,
    };
    await this.authRepo.insertRefreshToken(token, tx);
  }

  protected async verifyRefreshToken(
    refreshToken: string,
  ): Promise<RefreshTokenPayload> {
    try {
      const payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.getRefreshSecret(),
      });

      if (payload?.typ && payload.typ !== AuthUseCaseBase.REFRESH_TYP) {
        throwUnauthorized(
          "Invalid refresh token",
          ERROR_CODES.AUTH_REFRESH_INVALID,
          {
            reason: ERROR_REASONS.INVALID_REFRESH_TOKEN_TYPE,
          },
        );
      }

      if (!payload?.sub) {
        throwUnauthorized(
          "Invalid refresh token",
          ERROR_CODES.AUTH_REFRESH_INVALID,
          {
            reason: ERROR_REASONS.MISSING_SUBJECT,
          },
        );
      }

      return payload;
    } catch {
      throwUnauthorized(
        "Phiên làm việc hết hạn hoặc không hợp lệ!",
        ERROR_CODES.AUTH_REFRESH_INVALID,
        {
          reason: ERROR_REASONS.VERIFY_FAILED,
        },
      );
    }
  }

  protected getRefreshSecret() {
    return this.requireConfig("AUTH_JWT_REFRESH_SECRET");
  }

  protected requireConfig(key: string) {
    const value = this.configService.get<string>(key);
    if (!value) {
      throw new Error(`Missing ${key} environment variable`);
    }
    return value;
  }

  protected getAccessTokenExpiresInSeconds(): number {
    const raw = this.configService.get("AUTH_JWT_ACCESS_EXPIRES_IN") || "30m";
    const match = raw.match(/^(\d+)(s|m|h|d)$/);
    if (!match) return 1800;
    const value = parseInt(match[1], 10);
    switch (match[2]) {
      case "s": return value;
      case "m": return value * 60;
      case "h": return value * 3600;
      case "d": return value * 86400;
      default: return 3600;
    }
  }




}




