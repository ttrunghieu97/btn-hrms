import { Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { AuthRepository } from "../repositories/auth.repository";
import { AuthUseCaseBase } from "./auth-usecase-base";
import { RequestContextService } from "../../../../shared/context/request-context.service";
import { throwUnauthorized } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { ERROR_REASONS } from "../../../../shared/constants/error-reasons";

@Injectable()
export class RevokeAllRefreshTokensUseCase extends AuthUseCaseBase {
  constructor(
    jwtService: JwtService,
    configService: ConfigService,
    authRepo: AuthRepository,
    requestContext: RequestContextService,
  ) {
    super(jwtService, configService, authRepo, requestContext);
  }

  async execute(userId?: string) {
    if (!userId) {
      throwUnauthorized(
        "User not authenticated",
        ERROR_CODES.USER_NOT_AUTHENTICATED,
        {
          reason: ERROR_REASONS.MISSING_USER_ID,
        },
      );
    }

    const revoked = await this.authRepo.revokeAllRefreshTokens(userId);
    return { ok: true, revoked };
  }
}
