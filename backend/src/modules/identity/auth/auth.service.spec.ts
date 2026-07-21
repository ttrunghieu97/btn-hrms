jest.mock("bcrypt", () => ({
  compare: jest.fn(),
  genSalt: jest.fn(),
  hash: jest.fn(),
}));

import * as bcrypt from "bcrypt";
import { UnauthorizedException } from "@nestjs/common";
import { RefreshTokensUseCase } from "./use-cases/refresh-tokens.usecase";
import { RevokeAllRefreshTokensUseCase } from "./use-cases/revoke-all-refresh-tokens.usecase";
import { LoginUseCase } from "./use-cases/login.usecase";

describe("Auth use-cases refresh tokens", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  function makeRefreshUseCase(overrides: Partial<any> = {}) {
    const jwtService = {
      verifyAsync: jest.fn(),
      signAsync: jest.fn(),
      decode: jest.fn(),
    };

    const configService = {
      get: jest.fn().mockReturnValue("secret"),
    };

    const authRepo = {
      findActiveRefreshToken: jest.fn(),
      supersedeRefreshToken: jest.fn(),
      deleteRefreshTokenById: jest.fn(),
      revokeRefreshTokenById: jest.fn(),
      revokeRefreshTokenFamily: jest.fn(),
      recordRefreshTokenReuse: jest.fn(),
      findUserById: jest.fn(),
      listRefreshTokens: jest.fn(),
      recordFailedLogin: jest.fn(),
      transaction: jest.fn().mockImplementation(async (fn) => fn({})),
    };

    const usecase = new RefreshTokensUseCase(
      jwtService as any,
      configService as any,
      authRepo as any,
      { get: jest.fn().mockReturnValue(undefined) } as any,
    );

    Object.assign(usecase as any, overrides);
    return { usecase, jwtService, authRepo };
  }

  it("uses jti-based lookup (no full table scan) on refresh", async () => {
    (bcrypt.compare as unknown as jest.Mock).mockResolvedValue(true);

    const { usecase, jwtService, authRepo } = makeRefreshUseCase();

    jwtService.verifyAsync.mockResolvedValue({
      sub: "user-1",
      jti: "token-1",
      typ: "refresh",
    });

    authRepo.findActiveRefreshToken.mockResolvedValue({
      id: "token-1",
      userId: "user-1",
      tokenHash: "hash",
      revokedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      userAgent: null,
      clientIp: null,
    });

    authRepo.findUserById.mockResolvedValue({ id: "user-1", email: "a@b.com", isActive: true });

    (usecase as any).issueTokens = jest.fn().mockResolvedValue({
      accessToken: "at2",
      refreshToken: "rt2",
      refreshTokenId: "token-2",
      refreshExpiresAt: new Date(Date.now() + 60_000),
    });
    (usecase as any).saveRefreshToken = jest.fn().mockResolvedValue(undefined);

    await expect(usecase.execute("rt1")).resolves.toEqual({
      access_token: "at2",
      refresh_token: "rt2",
      expires_in: 1800,
    });

    expect(authRepo.findActiveRefreshToken).toHaveBeenCalledTimes(1);
    expect(authRepo.listRefreshTokens).not.toHaveBeenCalled();
  });

  it("rejects refresh tokens with invalid typ", async () => {
    const { usecase, jwtService } = makeRefreshUseCase();

    jwtService.verifyAsync.mockResolvedValue({
      sub: "user-1",
      jti: "token-1",
      typ: "access",
    });

    await expect(usecase.execute("rt1")).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it("deletes expired refresh tokens", async () => {
    const { usecase, jwtService, authRepo } = makeRefreshUseCase();

    jwtService.verifyAsync.mockResolvedValue({
      sub: "user-1",
      jti: "token-1",
      typ: "refresh",
    });

    authRepo.findActiveRefreshToken.mockResolvedValue({
      id: "token-1",
      userId: "user-1",
      tokenHash: "hash",
      revokedAt: null,
      expiresAt: new Date(Date.now() - 60_000),
      userAgent: null,
      clientIp: null,
    });

    await expect(usecase.execute("rt1")).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(authRepo.deleteRefreshTokenById).toHaveBeenCalledWith("token-1");
  });

  it("revokes the full refresh token family on mismatch", async () => {
    (bcrypt.compare as unknown as jest.Mock).mockResolvedValue(false);

    const { usecase, jwtService, authRepo } = makeRefreshUseCase();

    jwtService.verifyAsync.mockResolvedValue({
      sub: "user-1",
      jti: "token-1",
      typ: "refresh",
    });

    authRepo.findActiveRefreshToken.mockResolvedValue({
      id: "token-1",
      userId: "user-1",
      tokenHash: "hash",
      revokedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      userAgent: "ua",
      clientIp: "127.0.0.1",
    });

    await expect(usecase.execute("rt1")).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(authRepo.revokeRefreshTokenFamily).toHaveBeenCalledWith("user-1");
    expect(authRepo.recordRefreshTokenReuse).toHaveBeenCalledWith({
      actorUserId: "user-1",
      tokenId: "token-1",
      clientIp: "127.0.0.1",
      userAgent: "ua",
    });
  });

  it("revokes all sessions for a user", async () => {
    const authRepo = {
      revokeAllRefreshTokens: jest.fn().mockResolvedValue(2),
    };

    const usecase = new RevokeAllRefreshTokensUseCase(
      {} as any,
      { get: jest.fn() } as any,
      authRepo as any,
      {} as any,
    );

    await expect(usecase.execute("user-1")).resolves.toEqual({
      ok: true,
      revoked: 2,
    });
  });

  it("throws on revokeAll when userId missing", async () => {
    const authRepo = {
      revokeAllRefreshTokens: jest.fn(),
    };

    const usecase = new RevokeAllRefreshTokensUseCase(
      {} as any,
      { get: jest.fn() } as any,
      authRepo as any,
      {} as any,
    );

    await expect(usecase.execute(undefined)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});

describe("LoginUseCase failure auditing", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  function makeLoginUseCase() {
    const jwtService = {
      signAsync: jest.fn(),
      decode: jest.fn(),
    };
    const configService = {
      get: jest.fn().mockReturnValue("secret"),
    };
    const authRepo = {
      findUserForLogin: jest.fn(),
      recordFailedLogin: jest.fn().mockResolvedValue(null),
      insertRefreshToken: jest.fn(),
      updateLastLoginAt: jest.fn().mockResolvedValue(undefined),
    };
    const getUserPermissions = {
      execute: jest.fn().mockResolvedValue([]),
    };

    const employeeReader = {
      findEmployeeByUserId: jest.fn().mockResolvedValue(null),
    };

    const usecase = new LoginUseCase(
      jwtService as any,
      configService as any,
      authRepo as any,
      getUserPermissions as any,
      { get: jest.fn().mockReturnValue(undefined) } as any,
      employeeReader as any,
    );

    return { usecase, authRepo, employeeReader };
  }

  it("audits missing-user login failures", async () => {
    const { usecase, authRepo } = makeLoginUseCase();
    authRepo.findUserForLogin.mockResolvedValue(null);

    await expect(
      usecase.execute({ username: "alice", password: "bad" } as any, "ua", "127.0.0.1"),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(authRepo.recordFailedLogin).toHaveBeenCalledWith({
      actorUserId: null,
      username: "alice",
      reason: "INVALID_CREDENTIALS",
      clientIp: "127.0.0.1",
      userAgent: "ua",
    });
  });

  it("audits bad-password login failures", async () => {
    (bcrypt.compare as unknown as jest.Mock).mockResolvedValue(false);
    const { usecase, authRepo } = makeLoginUseCase();
    authRepo.findUserForLogin.mockResolvedValue({
      id: "u1",
      username: "alice",
      passwordHash: "hash",
    });

    await expect(
      usecase.execute({ username: "alice", password: "bad" } as any, "ua", "127.0.0.1"),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(authRepo.recordFailedLogin).toHaveBeenCalledWith({
      actorUserId: "u1",
      username: "alice",
      reason: "INVALID_CREDENTIALS",
      clientIp: "127.0.0.1",
      userAgent: "ua",
    });
  });

  it("rejects login when employee endDate is in the past (auto-terminated)", async () => {
    (bcrypt.compare as unknown as jest.Mock).mockResolvedValue(true);
    const { usecase, authRepo, employeeReader } = makeLoginUseCase();
    const yesterday = new Date(Date.now() - 86_400_000)
      .toISOString()
      .split("T")[0];
    authRepo.findUserForLogin.mockResolvedValue({
      id: "u1",
      username: "alice",
      passwordHash: "hash",
      isActive: true,
    });
    employeeReader.findEmployeeByUserId.mockResolvedValue({
      endDate: yesterday,
      deletedAt: null,
    });

    await expect(
      usecase.execute(
        { username: "alice", password: "good" } as any,
        "ua",
        "127.0.0.1",
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(authRepo.recordFailedLogin).toHaveBeenCalledWith({
      actorUserId: "u1",
      username: "alice",
      reason: "INVALID_CREDENTIALS",
      clientIp: "127.0.0.1",
      userAgent: "ua",
    });
  });

  it("allows login when employee endDate is in the future", async () => {
    (bcrypt.compare as unknown as jest.Mock).mockResolvedValue(true);
    const { usecase, authRepo } = makeLoginUseCase();
    const tomorrow = new Date(Date.now() + 86_400_000)
      .toISOString()
      .split("T")[0];
    authRepo.findUserForLogin.mockResolvedValue({
      id: "u1",
      username: "alice",
      passwordHash: "hash",
      isActive: true,
      employeeEndDate: tomorrow,
      employeeDeletedAt: null,
    });
    authRepo.insertRefreshToken.mockResolvedValue(undefined);
    (usecase as any).getAccessTokenExpiresInSeconds = jest
      .fn()
      .mockReturnValue(1800);
    (usecase as any).issueTokens = jest.fn().mockResolvedValue({
      accessToken: "at",
      refreshToken: "rt",
      refreshTokenId: "rtid",
      refreshExpiresAt: new Date(Date.now() + 60_000),
    });
    (usecase as any).saveRefreshToken = jest.fn().mockResolvedValue(undefined);

    await expect(
      usecase.execute(
        { username: "alice", password: "good" } as any,
        "ua",
        "127.0.0.1",
      ),
    ).resolves.toBeDefined();
  });

  it("allows login when employee row is missing (admin-only user)", async () => {
    (bcrypt.compare as unknown as jest.Mock).mockResolvedValue(true);
    const { usecase, authRepo } = makeLoginUseCase();
    authRepo.findUserForLogin.mockResolvedValue({
      id: "u1",
      username: "root",
      passwordHash: "hash",
      isActive: true,
      employeeEndDate: null,
      employeeDeletedAt: null,
    });
    (usecase as any).getAccessTokenExpiresInSeconds = jest
      .fn()
      .mockReturnValue(1800);
    (usecase as any).issueTokens = jest.fn().mockResolvedValue({
      accessToken: "at",
      refreshToken: "rt",
      refreshTokenId: "rtid",
      refreshExpiresAt: new Date(Date.now() + 60_000),
    });
    (usecase as any).saveRefreshToken = jest.fn().mockResolvedValue(undefined);

    await expect(
      usecase.execute(
        { username: "root", password: "good" } as any,
        "ua",
        "127.0.0.1",
      ),
    ).resolves.toBeDefined();
  });
});
