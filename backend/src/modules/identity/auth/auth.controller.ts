import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import {
  AccessTokenEnvelopeDto,
  RevocationEnvelopeDto,
  SuccessFlagEnvelopeDto,
} from "../../../shared/dto/api-response.dto";
import { Request, Response } from "express";
import { Public } from "../../../core/security/decorators/public.decorator";
import { CheckPolicy } from "../../../core/security/decorators/check-policy.decorator";
import { AuthenticatedOnlyPolicy } from "../../../core/security/policies/authenticated-only.policy";
import { ERROR_CODES } from "../../../shared/constants/error-codes";
import { ERROR_REASONS } from "../../../shared/constants/error-reasons";
import { AuditLog } from "../../../shared/decorators/audit-log.decorator";
import { throwUnauthorized } from "../../../shared/utils/http-error";
import { GoogleAuthService } from "./services/google-auth.service";
import { AuthConfigService } from "./auth-config.service";
import { ChangePasswordRequestDto } from "./dto/change-password.dto";
import { LoginRequestDto } from "./dto/login.dto";
import { RefreshTokenRequestDto } from "./dto/refresh-token.dto";
import { ChangePasswordUseCase } from "./use-cases/change-password.usecase";
import { AuthUser } from "../../../core/security/types/auth-user.interface";
import { LoginUseCase } from "./use-cases/login.usecase";
import { LogoutUseCase } from "./use-cases/logout.usecase";
import { RefreshTokensUseCase } from "./use-cases/refresh-tokens.usecase";
import { RevokeAllRefreshTokensUseCase } from "./use-cases/revoke-all-refresh-tokens.usecase";
import { ListUserSessionsUseCase } from "./use-cases/list-user-sessions.usecase";
import { RevokeUserSessionUseCase } from "./use-cases/revoke-user-session.usecase";
import { ListLoginHistoryUseCase } from "./use-cases/list-login-history.usecase";
import { ListSecurityTimelineUseCase } from "./use-cases/list-security-timeline.usecase";
import { LinkEmailUseCase } from "./use-cases/link-email.usecase";
import { SsoLoginUseCase } from "./use-cases/sso-login.usecase";

@ApiTags("Authentication")
@Controller()
export class AuthController {
  constructor(
    private readonly loginUseCase: LoginUseCase,
    private readonly refreshTokens: RefreshTokensUseCase,
    private readonly logoutUseCase: LogoutUseCase,
    private readonly revokeAllTokens: RevokeAllRefreshTokensUseCase,
    private readonly changePasswordUseCase: ChangePasswordUseCase,
    private readonly authConfig: AuthConfigService,
    private readonly listSessions: ListUserSessionsUseCase,
    private readonly revokeUserSession: RevokeUserSessionUseCase,
    private readonly loginHistory: ListLoginHistoryUseCase,
    private readonly securityTimeline: ListSecurityTimelineUseCase,
    private readonly linkEmailUseCase: LinkEmailUseCase,
    private readonly ssoLogin: SsoLoginUseCase,
    private readonly googleAuth: GoogleAuthService,
  ) {}

  private clearLegacyAuthFlagCookie(res: Response) {
    // Legacy auth flag cookie removed
  }

  private clearAccessCookie(res: Response) {
    res.clearCookie(
      this.authConfig.getAccessCookieName(),
      this.authConfig.getAccessCookieOptions(),
    );
  }

  private clearAuthCookies(res: Response) {
    this.clearAccessCookie(res);
    res.clearCookie(
      this.authConfig.getRefreshCookieName(),
      this.authConfig.getRefreshCookieOptions(),
    );
    this.clearLegacyAuthFlagCookie(res);
  }

  @Post("login")
  @Public()
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @AuditLog({ action: "auth_login", entity: "auth" })
  @ApiOperation({ summary: "Login to the system" })
  @ApiOkResponse({ type: AccessTokenEnvelopeDto })
  @ApiUnauthorizedResponse({ description: "Invalid credentials" })
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: LoginRequestDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const userAgent = req.headers["user-agent"];
    const ip = req.ip;
    const result = await this.loginUseCase.execute(loginDto, userAgent, ip);

    this.clearLegacyAuthFlagCookie(res);
    res.cookie(
      this.authConfig.getAccessCookieName(),
      result.access_token,
      this.authConfig.getAccessCookieOptions(),
    );

    if (result?.refresh_token) {
      res.cookie(
        this.authConfig.getRefreshCookieName(),
        result.refresh_token,
        this.authConfig.getRefreshCookieOptions(),
      );
    }

    const { refresh_token: _refresh, ...safe } = result;
    return safe;
  }

  @Post("refresh")
  @Public()
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @AuditLog({ action: "auth_refresh", entity: "auth" })
  @ApiOperation({ summary: "Refresh access token using refresh token" })
  @ApiOkResponse({ type: AccessTokenEnvelopeDto })
  @ApiUnauthorizedResponse({ description: "Invalid refresh token" })
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Body() refreshTokenDto: RefreshTokenRequestDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const cookieToken =
      (req.cookies?.[this.authConfig.getRefreshCookieName()] as
        | string
        | undefined) || undefined;
    const refreshToken = refreshTokenDto?.refreshToken || cookieToken;

    if (!refreshToken) {
      this.clearLegacyAuthFlagCookie(res);
      throwUnauthorized(
        "Refresh token không hợp lệ hoặc đã hết hạn!",
        ERROR_CODES.AUTH_REFRESH_INVALID,
        { reason: ERROR_REASONS.INVALID_REFRESH_TOKEN },
      );
    }

    try {
      const result = await this.refreshTokens.execute(refreshToken);
      this.clearLegacyAuthFlagCookie(res);
      res.cookie(
        this.authConfig.getAccessCookieName(),
        result.access_token,
        this.authConfig.getAccessCookieOptions(),
      );
      if (result?.refresh_token) {
        res.cookie(
          this.authConfig.getRefreshCookieName(),
          result.refresh_token,
          this.authConfig.getRefreshCookieOptions(),
        );
      }
      return {
        access_token: result.access_token,
        ...(typeof result.expires_in === "number"
          ? { expires_in: result.expires_in }
          : {}),
      };
    } catch (err) {
      if (!(err instanceof UnauthorizedException)) {
        throw err;
      }

      this.clearAuthCookies(res);
      throwUnauthorized(
        "Refresh token không hợp lệ hoặc đã hết hạn!",
        ERROR_CODES.AUTH_REFRESH_INVALID,
        { reason: ERROR_REASONS.INVALID_REFRESH_TOKEN },
      );
    }
  }

  @Post("logout")
  @Public()
  @Throttle({ default: { ttl: 60_000, limit: 20 } })
  @AuditLog({ action: "auth_logout", entity: "auth" })
  @ApiOperation({ summary: "Logout from the current session" })
  @ApiOkResponse({ type: SuccessFlagEnvelopeDto })
  @HttpCode(HttpStatus.OK)
  async logout(
    @Body() refreshTokenDto: RefreshTokenRequestDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const cookieToken =
      (req.cookies?.[this.authConfig.getRefreshCookieName()] as
        | string
        | undefined) || undefined;
    const origin = req.headers.origin;
    const host = req.headers.host;
    const refreshToken = refreshTokenDto?.refreshToken || cookieToken;

    if (!refreshToken) {
      this.clearAuthCookies(res);
      return { ok: true };
    }

    const out = await this.logoutUseCase.execute(refreshToken, origin, host);
    this.clearAuthCookies(res);
    return out;
  }

  @Post("logout-all")
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @CheckPolicy(AuthenticatedOnlyPolicy)
  @ApiBearerAuth()
  @AuditLog({ action: "auth_logout_all", entity: "auth" })
  @ApiOperation({
    summary: "Revoke all refresh token sessions for the current user",
  })
  @ApiOkResponse({ type: RevocationEnvelopeDto })
  @HttpCode(HttpStatus.OK)
  async logoutAll(@Req() req: Request & { user?: AuthUser }, @Res({ passthrough: true }) res: Response) {
    const userId: string | undefined = req.user?.id;
    const out = await this.revokeAllTokens.execute(userId);
    this.clearAuthCookies(res);
    return out;
  }

  @Post("change-password")
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @CheckPolicy(AuthenticatedOnlyPolicy)
  @ApiBearerAuth()
  @AuditLog({ action: "auth_change_password", entity: "auth" })
  @ApiOperation({ summary: "Change password for the current user" })
  @HttpCode(HttpStatus.NO_CONTENT)
  async changePassword(@Req() req: Request & { user?: AuthUser }, @Body() body: ChangePasswordRequestDto) {
    await this.changePasswordUseCase.execute(
      req.user?.id,
      body.currentPassword,
      body.newPassword,
    );
  }

  @Get("sessions")
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  @CheckPolicy(AuthenticatedOnlyPolicy)
  @ApiBearerAuth()
  @ApiOperation({ summary: "List active sessions for the current user" })
  async listActiveSessions(@Req() req: Request & { user?: AuthUser }) {
    const userId = req.user?.id;
    if (!userId) {
      throwUnauthorized("Not authenticated", ERROR_CODES.USER_NOT_AUTHENTICATED, {
        reason: ERROR_REASONS.MISSING_USER_ID,
      });
    }
    return this.listSessions.execute(userId);
  }

  @Post("sessions/:id/revoke")
  @Throttle({ default: { ttl: 60_000, limit: 20 } })
  @CheckPolicy(AuthenticatedOnlyPolicy)
  @ApiBearerAuth()
  @AuditLog({ action: "auth_session_revoke", entity: "auth" })
  @ApiOperation({ summary: "Revoke a specific session" })
  async revokeSession(
    @Req() req: Request & { user?: AuthUser },
    @Param("id", ParseUUIDPipe) sessionId: string,
  ) {
    const userId = req.user?.id;
    if (!userId) {
      throwUnauthorized("Not authenticated", ERROR_CODES.USER_NOT_AUTHENTICATED, {
        reason: ERROR_REASONS.MISSING_USER_ID,
      });
    }
    return this.revokeUserSession.execute(userId, sessionId);
  }

  @Get("login-history")
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  @CheckPolicy(AuthenticatedOnlyPolicy)
  @ApiBearerAuth()
  @ApiOperation({ summary: "List login history for the current user" })
  async getLoginHistory(
    @Req() req: Request & { user?: AuthUser },
  ) {
    const userId = req.user?.id;
    if (!userId) {
      throwUnauthorized("Not authenticated", ERROR_CODES.USER_NOT_AUTHENTICATED, {
        reason: ERROR_REASONS.MISSING_USER_ID,
      });
    }
    return this.loginHistory.execute(userId);
  }

  @Get("security-timeline")
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  @CheckPolicy(AuthenticatedOnlyPolicy)
  @ApiBearerAuth()
  @ApiOperation({ summary: "List security timeline for the current user" })
  async getSecurityTimeline(
    @Req() req: Request & { user?: AuthUser },
  ) {
    const userId = req.user?.id;
    if (!userId) {
      throwUnauthorized("Not authenticated", ERROR_CODES.USER_NOT_AUTHENTICATED, {
        reason: ERROR_REASONS.MISSING_USER_ID,
      });
    }
    return this.securityTimeline.execute(userId);
  }

  @Post("link-email")
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @CheckPolicy(AuthenticatedOnlyPolicy)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Link Google account to current user and update email" })
  async linkEmail(
    @Req() req: Request & { user?: AuthUser },
    @Body() body: { idToken: string },
  ) {
    const userId = req.user?.id;
    if (!userId) {
      throwUnauthorized("Not authenticated", ERROR_CODES.USER_NOT_AUTHENTICATED, {
        reason: ERROR_REASONS.MISSING_USER_ID,
      });
    }
    return this.linkEmailUseCase.execute(userId, body.idToken);
  }

  @Post("sso/google")
  @Public()
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @ApiOperation({ summary: "Login or register via Google SSO" })
  @HttpCode(HttpStatus.OK)
  async ssoGoogle(
    @Body() body: { idToken: string },
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const userAgent = req.headers["user-agent"];
    const ip = req.ip;
    const result = await this.ssoLogin.execute(body.idToken, userAgent, ip);

    this.clearLegacyAuthFlagCookie(res);
    res.cookie(
      this.authConfig.getAccessCookieName(),
      result.access_token,
      this.authConfig.getAccessCookieOptions(),
    );
    if (result?.refresh_token) {
      res.cookie(
        this.authConfig.getRefreshCookieName(),
        result.refresh_token,
        this.authConfig.getRefreshCookieOptions(),
      );
    }

    const { refresh_token: _refresh, ...safe } = result;
    return safe;
  }
}
