import * as bcrypt from "bcrypt";
import { todayDateString } from "../../../../shared/utils/date-format";
import { Inject, Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { LoginRequestDto } from "../dto/login.dto";
import { AuthRepository } from "../repositories/auth.repository";
import { AuthMapper } from "../mappers/auth.mapper";
import { GetUserPermissionsUseCase } from "../../permissions/use-cases/get-user-permissions.usecase";
import { AuthUseCaseBase } from "./auth-usecase-base";
import { RequestContextService } from "../../../../shared/context/request-context.service";
import { throwUnauthorized } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { ERROR_REASONS } from "../../../../shared/constants/error-reasons";
import { type AuthResponseDto } from "../dto/auth-response.dto";
import { EMPLOYEE_READER_PORT, type IEmployeeReader } from "../../../../contracts/ports/employee-reader.port";

@Injectable()
export class LoginUseCase extends AuthUseCaseBase {
  constructor(
    jwtService: JwtService,
    configService: ConfigService,
    authRepo: AuthRepository,
    private readonly getUserPermissions: GetUserPermissionsUseCase,
    requestContext: RequestContextService,
    @Inject(EMPLOYEE_READER_PORT)
    private readonly employeeReader: IEmployeeReader,
  ) {
    super(jwtService, configService, authRepo, requestContext);
  }

  async execute(
    loginDto: LoginRequestDto,
    userAgent?: string,
    clientIp?: string,
  ): Promise<AuthResponseDto> {
    const { username, password } = loginDto;

    const dbUser = await this.authRepo.findUserForLogin(username);

    let employeeEndDate: string | null = null;
    let employeeDeletedAt: Date | null = null;

    if (dbUser) {
      const employee = await this.employeeReader.findEmployeeByUserId(dbUser.id);
      if (employee) {
        employeeEndDate = employee.endDate ?? null;
        employeeDeletedAt = employee.deletedAt ? new Date(employee.deletedAt) : null;
      }
    }

    const todayStr = todayDateString();
    const isAutoTerminated =
      !!employeeEndDate && employeeEndDate < todayStr && employeeDeletedAt == null;

    // Check existence, active status, and password hash in constant-time order.
    // Use the same error message for all failures to prevent user enumeration.
    if (
      !dbUser?.passwordHash ||
      dbUser.isActive === false ||
      isAutoTerminated
    ) {
      await this.authRepo.recordFailedLogin({
        actorUserId: dbUser?.id ?? null,
        username,
        reason: ERROR_REASONS.INVALID_CREDENTIALS,
        clientIp: clientIp ?? null,
        userAgent: userAgent ?? null,
      });
      this.logger.warn({
        msg: "auth_login_failed",
        username,
        reason:
          dbUser?.isActive === false
            ? "ACCOUNT_INACTIVE"
            : isAutoTerminated
              ? "ACCOUNT_TERMINATED"
              : ERROR_REASONS.INVALID_CREDENTIALS,
      });
      throwUnauthorized(
        "Sai tài khoản hoặc mật khẩu!",
        ERROR_CODES.AUTH_INVALID_CREDENTIALS,
        {
          reason: ERROR_REASONS.INVALID_CREDENTIALS,
        },
      );
    }

    const valid = await bcrypt.compare(password, dbUser.passwordHash);
    if (!valid) {
      await this.authRepo.recordFailedLogin({
        actorUserId: dbUser.id,
        username,
        reason: ERROR_REASONS.INVALID_CREDENTIALS,
        clientIp: clientIp ?? null,
        userAgent: userAgent ?? null,
      });
      this.logger.warn({
        msg: "auth_login_failed",
        userId: dbUser.id,
        username,
        reason: ERROR_REASONS.INVALID_CREDENTIALS,
      });
      throwUnauthorized(
        "Sai tài khoản hoặc mật khẩu!",
        ERROR_CODES.AUTH_INVALID_CREDENTIALS,
        {
          reason: ERROR_REASONS.INVALID_CREDENTIALS,
        },
      );
    }

    const permissionCodes = await this.getUserPermissions.execute(dbUser.id);

    // Record last login timestamp (non-blocking)
    await this.authRepo.updateLastLoginAt(dbUser.id);

    const tokens = await this.issueTokens(dbUser.id, dbUser.email!, dbUser.authorizationVersion ?? 1);
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
