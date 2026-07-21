import * as bcrypt from "bcrypt";
import { type JwtService } from "@nestjs/jwt";
import { type ConfigService } from "@nestjs/config";
import { UnauthorizedException } from "@nestjs/common";
import { RequestContextService } from "../../../../shared/context/request-context.service";
import { LoginUseCase } from "./login.usecase";
import { type AuthRepository } from "../repositories/auth.repository";
import { type GetUserPermissionsUseCase } from "../../permissions/use-cases/get-user-permissions.usecase";

jest.mock("bcrypt");

describe("LoginUseCase", () => {
  let useCase: LoginUseCase;
  let authRepo: jest.Mocked<AuthRepository>;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;
  let getUserPermissions: jest.Mocked<GetUserPermissionsUseCase>;
  let employeeReader: { findEmployeeByUserId: jest.Mock };

  const mockUser = {
    id: "user-1",
    username: "testuser",
    email: "test@example.com",
    passwordHash: "$2b$12$hashedpassword",
    isSuperAdmin: false,
    isActive: true,
    mustChangePassword: false,
    authorizationVersion: 1,
  };

  beforeEach(() => {
    authRepo = {
      findUserForLogin: jest.fn().mockResolvedValue(mockUser),
      recordFailedLogin: jest.fn().mockResolvedValue(undefined),
      findActiveRefreshToken: jest.fn(),
      insertRefreshToken: jest.fn().mockResolvedValue(undefined),
      supersedeRefreshToken: jest.fn(),
      deleteRefreshTokenById: jest.fn(),
      revokeRefreshTokenFamily: jest.fn(),
      recordRefreshTokenReuse: jest.fn(),
      findUserById: jest.fn(),
      updateLastLoginAt: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<AuthRepository>;

    jwtService = {
      signAsync: jest.fn().mockResolvedValue("signed-token"),
      verifyAsync: jest.fn(),
      decode: jest.fn().mockReturnValue({ exp: Math.floor(Date.now() / 1000) + 86400 }),
    } as unknown as jest.Mocked<JwtService>;

    configService = {
      get: jest.fn((key: string) => {
        if (key === "AUTH_JWT_SECRET") return "test-secret";
        if (key === "AUTH_JWT_REFRESH_SECRET") return "test-refresh-secret";
        if (key === "AUTH_JWT_ACCESS_EXPIRES_IN") return "30m";
        if (key === "AUTH_BCRYPT_ROUNDS") return "4";
        return undefined;
      }),
    } as unknown as jest.Mocked<ConfigService>;

    getUserPermissions = {
      execute: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<GetUserPermissionsUseCase>;

    employeeReader = {
      findEmployeeByUserId: jest.fn().mockResolvedValue(null),
    };

    useCase = new LoginUseCase(
      jwtService,
      configService,
      authRepo,
      getUserPermissions,
      new RequestContextService(),
      employeeReader as any,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("returns tokens for valid credentials", async () => {
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    // signAsync returns default mocked value

    const result = await useCase.execute({
      username: "testuser",
      password: "correct-password",
    });

    expect(result.access_token).toBe("signed-token");
    expect(result.refresh_token).toBe("signed-token");
    expect(authRepo.findUserForLogin).toHaveBeenCalledWith("testuser");
    expect(authRepo.insertRefreshToken).toHaveBeenCalledTimes(1);
  });

  it("throws UnauthorizedException for invalid password", async () => {
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    await expect(
      useCase.execute({ username: "testuser", password: "wrong-password" }),
    ).rejects.toThrow(UnauthorizedException);

    expect(authRepo.recordFailedLogin).toHaveBeenCalledTimes(1);
    expect(authRepo.insertRefreshToken).not.toHaveBeenCalled();
  });

  it("throws UnauthorizedException for non-existent user", async () => {
    authRepo.findUserForLogin.mockResolvedValue(null);

    await expect(
      useCase.execute({ username: "unknown", password: "any" }),
    ).rejects.toThrow(UnauthorizedException);

    expect(authRepo.recordFailedLogin).toHaveBeenCalledTimes(1);
  });

  it("throws UnauthorizedException for disabled user", async () => {
    authRepo.findUserForLogin.mockResolvedValue({
      ...mockUser,
      isActive: false,
    });

    await expect(
      useCase.execute({ username: "testuser", password: "any" }),
    ).rejects.toThrow(UnauthorizedException);

    expect(authRepo.recordFailedLogin).toHaveBeenCalledTimes(1);
  });

  it("throws UnauthorizedException for auto-terminated user", async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    employeeReader.findEmployeeByUserId.mockResolvedValue({
      endDate: yesterday.toISOString().split('T')[0] ?? null,
      deletedAt: null,
    });

    await expect(
      useCase.execute({ username: "testuser", password: "any" }),
    ).rejects.toThrow(UnauthorizedException);

    expect(authRepo.recordFailedLogin).toHaveBeenCalledTimes(1);
  });

  it("throws UnauthorizedException for user without passwordHash", async () => {
    authRepo.findUserForLogin.mockResolvedValue({
      ...mockUser,
      passwordHash: null,
    });

    await expect(
      useCase.execute({ username: "testuser", password: "any" }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it("includes permission codes in response when present", async () => {
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    getUserPermissions.execute.mockResolvedValue(["employee:read", "employee:write"]);

    const result = await useCase.execute({
      username: "testuser",
      password: "correct",
    });

    expect(result.user?.permissions).toEqual(["employee:read", "employee:write"]);
  });

  it("sets isSuperAdmin when user is super admin", async () => {
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    authRepo.findUserForLogin.mockResolvedValue({
      ...mockUser,
      isSuperAdmin: true,
    });

    const result = await useCase.execute({
      username: "testuser",
      password: "correct",
    });

    expect(result.user?.isSuperAdmin).toBe(true);
  });

  it("sets isSuperAdmin when permission includes sys:all", async () => {
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    getUserPermissions.execute.mockResolvedValue(["sys:all"]);

    const result = await useCase.execute({
      username: "testuser",
      password: "correct",
    });

    expect(result.user?.isSuperAdmin).toBe(true);
  });
});
