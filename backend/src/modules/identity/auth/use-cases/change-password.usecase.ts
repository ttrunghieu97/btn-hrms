import * as bcrypt from "bcrypt";
import { Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { RequestContextService } from "../../../../shared/context/request-context.service";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { ERROR_REASONS } from "../../../../shared/constants/error-reasons";
import { throwBadRequest, throwUnauthorized } from "../../../../shared/utils/http-error";
import { AuthRepository } from "../repositories/auth.repository";
import { AuthUseCaseBase } from "./auth-usecase-base";

@Injectable()
export class ChangePasswordUseCase extends AuthUseCaseBase {
  constructor(
    jwtService: JwtService,
    configService: ConfigService,
    authRepo: AuthRepository,
    requestContext: RequestContextService,
  ) {
    super(jwtService, configService, authRepo, requestContext);
  }

  async execute(userId: string | undefined, currentPassword: string, newPassword: string) {
    if (!userId) {
      throwUnauthorized("User not authenticated", ERROR_CODES.USER_NOT_AUTHENTICATED, {
        reason: ERROR_REASONS.MISSING_USER_ID,
      });
    }

    if (currentPassword === newPassword) {
      throwBadRequest(
        "Mật khẩu mới phải khác mật khẩu hiện tại",
        ERROR_CODES.INVALID_REQUEST,
      );
    }

    const dbUser = await this.authRepo.findUserById(userId);
    if (!dbUser?.passwordHash || dbUser.isActive === false) {
      throwUnauthorized(
        "Sai mật khẩu hiện tại",
        ERROR_CODES.AUTH_INVALID_CREDENTIALS,
        { reason: ERROR_REASONS.INVALID_CREDENTIALS },
      );
    }

    const valid = await bcrypt.compare(currentPassword, dbUser.passwordHash);
    if (!valid) {
      await this.authRepo.recordFailedLogin({
        actorUserId: dbUser.id,
        username: dbUser.username,
        reason: ERROR_REASONS.INVALID_CREDENTIALS,
      });
      throwUnauthorized(
        "Sai mật khẩu hiện tại",
        ERROR_CODES.AUTH_INVALID_CREDENTIALS,
        { reason: ERROR_REASONS.INVALID_CREDENTIALS },
      );
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.authRepo.transaction(async (tx) => {
      await this.authRepo.updateUserPasswordHash(dbUser.id, passwordHash, tx);
      await this.authRepo.revokeAllRefreshTokens(dbUser.id, tx);
      await this.authRepo.withBestEffortSecurityAudit(() =>
        this.authRepo.createSecurityAuditLog({
          actorUserId: dbUser.id,
          action: "auth_change_password",
          entity: "auth",
          entityId: dbUser.id,
        }),
      );
    });
  }
}
