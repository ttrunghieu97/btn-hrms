import { Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import * as bcrypt from "bcrypt";
import { AuthRepository } from "../repositories/auth.repository";
import { AuthMapper } from "../mappers/auth.mapper";
import { AuthUseCaseBase } from "./auth-usecase-base";
import { RequestContextService } from "../../../../shared/context/request-context.service";
import { throwUnauthorized } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { ERROR_REASONS } from "../../../../shared/constants/error-reasons";
import { type AuthResponseDto } from "../dto/auth-response.dto";

@Injectable()
export class RefreshTokensUseCase extends AuthUseCaseBase {
  constructor(
    jwtService: JwtService,
    configService: ConfigService,
    authRepo: AuthRepository,
    requestContext: RequestContextService,
  ) {
    super(jwtService, configService, authRepo, requestContext);
  }

  async execute(refreshToken: string): Promise<AuthResponseDto> {
    const payload = await this.verifyRefreshToken(refreshToken);



    const gracePeriodMs = Number(
      this.configService.get("REFRESH_GRACE_PERIOD_MS") || 30_000,
    );

    const tokenRecord = await this.authRepo.findActiveRefreshToken(
      payload.jti!,
      payload.sub,
      gracePeriodMs,
    );

    if (!tokenRecord) {
      throwUnauthorized(
        "Phiên làm việc hết hạn hoặc không hợp lệ!",
        ERROR_CODES.AUTH_REFRESH_INVALID,
        {
          reason: ERROR_REASONS.TOKEN_NOT_FOUND,
        },
      );
    }

    if (tokenRecord.expiresAt < new Date()) {
      await this.authRepo.deleteRefreshTokenById(tokenRecord.id);
      throwUnauthorized(
        "Phiên làm việc hết hạn hoặc không hợp lệ!",
        ERROR_CODES.AUTH_REFRESH_INVALID,
        {
          reason: ERROR_REASONS.TOKEN_EXPIRED,
        },
      );
    }

    const isMatch = await bcrypt.compare(refreshToken, tokenRecord.tokenHash);
    if (!isMatch) {
      await this.authRepo.revokeRefreshTokenFamily(tokenRecord.userId);
      await this.authRepo.recordRefreshTokenReuse({
        actorUserId: tokenRecord.userId,
        tokenId: tokenRecord.id,
        clientIp: tokenRecord.clientIp ?? null,
        userAgent: tokenRecord.userAgent ?? null,
      });
      this.logger.warn({
        msg: "refresh_token_reuse_detected",
        userId: tokenRecord.userId,
        tokenId: tokenRecord.id,
      });
      throwUnauthorized(
        "Phiên làm việc hết hạn hoặc không hợp lệ!",
        ERROR_CODES.AUTH_REFRESH_INVALID,
        {
          reason: ERROR_REASONS.TOKEN_MISMATCH,
        },
      );
    }

    const user = await this.authRepo.findUserById(tokenRecord.userId);

    if (!user) {
      throwUnauthorized("User not found", ERROR_CODES.USER_NOT_FOUND, {
        userId: tokenRecord.userId,
      });
    }

    if (!user.isActive) {
      throwUnauthorized("User account is disabled", ERROR_CODES.AUTH_ACCOUNT_DISABLED, {
        reason: ERROR_REASONS.ACCOUNT_INACTIVE,
      });
    }

    // Grace period hit: token was already superseded by another tab's refresh.
    // Issue a new access token only — the successor refresh token already exists.
    if (tokenRecord.supersededAt) {
      this.logger.log({
        msg: "auth_refresh_grace_hit",
        userId: user.id,
        tokenId: tokenRecord.id,
        supersededAgoMs: Date.now() - tokenRecord.supersededAt.getTime(),
      });

      const accessToken = await this.jwtService.signAsync(
        { sub: user.id, email: user.email || "", azv: user.authorizationVersion ?? 1 },
        {
          secret: this.requireConfig("AUTH_JWT_SECRET"),
          expiresIn: this.configService.get("AUTH_JWT_ACCESS_EXPIRES_IN") || "30m",
        },
      );

      return {
        access_token: accessToken,
        expires_in: this.getAccessTokenExpiresInSeconds(),
      };
    }

    // Normal rotation: supersede old token (don't delete), issue new pair
    const newTokens = await this.issueTokens(user.id, user.email || "", user.authorizationVersion ?? 1);

    await this.authRepo.transaction(async (tx) => {
      await this.authRepo.supersedeRefreshToken(tokenRecord.id, tx);
      await this.saveRefreshToken(
        user.id,
        newTokens.refreshToken,
        newTokens.refreshTokenId,
        newTokens.refreshExpiresAt,
        tokenRecord.userAgent || undefined,
        tokenRecord.clientIp || undefined,
        tx,
      );
    });

    return AuthMapper.toAuthResponse(
      newTokens.accessToken,
      newTokens.refreshToken,
      undefined,
      this.getAccessTokenExpiresInSeconds(),
    );
  }
}


