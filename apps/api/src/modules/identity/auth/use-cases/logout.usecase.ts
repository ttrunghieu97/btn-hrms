import { Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { AuthRepository } from "../repositories/auth.repository";
import { AuthUseCaseBase } from "./auth-usecase-base";
import { RequestContextService } from "../../../../shared/context/request-context.service";
import { AuthConfigService } from "../auth-config.service";
import { throwForbidden, throwUnauthorized } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { ERROR_REASONS } from "../../../../shared/constants/error-reasons";

@Injectable()
export class LogoutUseCase extends AuthUseCaseBase {
  constructor(
    jwtService: JwtService,
    configService: ConfigService,
    authRepo: AuthRepository,
    requestContext: RequestContextService,
    private readonly authConfig: AuthConfigService,
  ) {
    super(jwtService, configService, authRepo, requestContext);
  }

  private isAllowedLogoutOrigin(origin: string, host?: string): boolean {
    let normalizedOrigin: string;
    try {
      normalizedOrigin = new URL(origin).origin.replace(/\/+$/, "");
    } catch {
      return false;
    }

    const allowedOrigins = this.authConfig.getAllowedFrontendOrigins();
    if (allowedOrigins.includes(normalizedOrigin)) {
      return true;
    }

    if (!host) {
      return false;
    }

    try {
      return new URL(normalizedOrigin).host === host;
    } catch {
      return false;
    }
  }

  async execute(refreshToken: string, origin?: string, host?: string) {
    if (origin && host) {
      if (!this.isAllowedLogoutOrigin(origin, host)) {
        throwForbidden(
          "Cross-site logout is not allowed",
          ERROR_CODES.PERMISSION_DENIED,
          { reason: "CROSS_SITE_LOGOUT_FORBIDDEN" },
        );
      }
    }

    const payload = await this.verifyRefreshToken(refreshToken);

    if (!payload.jti) {
      throwUnauthorized(
        "Session expired or invalid",
        ERROR_CODES.AUTH_REFRESH_INVALID,
        {
          reason: ERROR_REASONS.LEGACY_FALLBACK_DISABLED,
        },
      );
    }

    await this.authRepo.deleteRefreshTokenByIdAndUser(
      payload.jti,
      payload.sub,
    );
    return { ok: true };
  }
}
