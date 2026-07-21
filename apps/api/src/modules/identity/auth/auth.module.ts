import { Module } from "@nestjs/common";
import { JwtModule, type JwtModuleOptions } from "@nestjs/jwt";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { type SignOptions } from "jsonwebtoken";
import { AuthController } from "./auth.controller";
import { RefreshTokenCleanupService } from "./refresh-token-cleanup.service";
import { AuthRepository } from "./repositories/auth.repository";
import { LoginUseCase } from "./use-cases/login.usecase";
import { RefreshTokensUseCase } from "./use-cases/refresh-tokens.usecase";
import { LogoutUseCase } from "./use-cases/logout.usecase";
import { RevokeAllRefreshTokensUseCase } from "./use-cases/revoke-all-refresh-tokens.usecase";
import { ChangePasswordUseCase } from "./use-cases/change-password.usecase";
import { PermissionsModule } from "../permissions/permissions.module";
import { AuthConfigService } from "./auth-config.service";
import { GoogleAuthService } from "./services/google-auth.service";
import { ListUserSessionsUseCase } from "./use-cases/list-user-sessions.usecase";
import { RevokeUserSessionUseCase } from "./use-cases/revoke-user-session.usecase";
import { ListLoginHistoryUseCase } from "./use-cases/list-login-history.usecase";
import { ListSecurityTimelineUseCase } from "./use-cases/list-security-timeline.usecase";
import { LinkEmailUseCase } from "./use-cases/link-email.usecase";
import { SsoLoginUseCase } from "./use-cases/sso-login.usecase";
import { AuthorizationVersionService } from "./services/authorization-version.service";

@Module({
  imports: [
    ConfigModule,
    PermissionsModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService): JwtModuleOptions => {
        const secret = configService.get<string>("AUTH_JWT_SECRET");
        if (!secret) {
          throw new Error("Missing AUTH_JWT_SECRET environment variable");
        }
        const expiresIn =
          configService.get<SignOptions["expiresIn"]>(
            "AUTH_JWT_ACCESS_EXPIRES_IN",
          );
        return {
          secret,
          signOptions: {
            expiresIn: expiresIn ?? "30m",
          },
        };
      },
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthRepository,
    RefreshTokenCleanupService,
    LoginUseCase,
    RefreshTokensUseCase,
    LogoutUseCase,
    RevokeAllRefreshTokensUseCase,
    ChangePasswordUseCase,
    AuthConfigService,
    GoogleAuthService,
    ListUserSessionsUseCase,
    RevokeUserSessionUseCase,
    ListLoginHistoryUseCase,
    ListSecurityTimelineUseCase,
    LinkEmailUseCase,
    SsoLoginUseCase,
    AuthorizationVersionService,
  ],
  exports: [
    JwtModule,
    AuthRepository,
    LoginUseCase,
    RefreshTokensUseCase,
    LogoutUseCase,
    RevokeAllRefreshTokensUseCase,
    ChangePasswordUseCase,
    AuthorizationVersionService,
  ],
})
export class AuthModule {}
