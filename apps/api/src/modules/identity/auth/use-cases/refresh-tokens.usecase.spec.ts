import * as bcrypt from "bcrypt";
import { type JwtService } from "@nestjs/jwt";
import { type ConfigService } from "@nestjs/config";
import { UnauthorizedException } from "@nestjs/common";
import { RequestContextService } from "../../../../shared/context/request-context.service";
import { RefreshTokensUseCase } from "./refresh-tokens.usecase";
import { type AuthRepository } from "../repositories/auth.repository";

jest.mock("bcrypt");

describe("RefreshTokensUseCase", () => {
  let useCase: RefreshTokensUseCase;
  let authRepo: jest.Mocked<AuthRepository>;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;

  const mockPayload = { sub: "user-1", jti: "token-1", typ: "refresh" };
  const mockTokenRecord = {
    id: "token-1",
    userId: "user-1",
    tokenHash: "$2b$12$hashed",
    expiresAt: new Date(Date.now() + 86400_000),
    revokedAt: null,
    supersededAt: null,
    userAgent: "test-agent",
    clientIp: "127.0.0.1",
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const mockUser = { id: "user-1", username: "testuser", email: "test@example.com", isActive: true };

  beforeEach(() => {
    authRepo = {
      findActiveRefreshToken: jest.fn().mockResolvedValue(mockTokenRecord),
      findUserById: jest.fn().mockResolvedValue(mockUser),
      supersedeRefreshToken: jest.fn().mockResolvedValue(undefined),
      insertRefreshToken: jest.fn().mockResolvedValue(undefined),
      recordRefreshTokenReuse: jest.fn().mockResolvedValue(undefined),
      revokeRefreshTokenFamily: jest.fn().mockResolvedValue(undefined),
      deleteRefreshTokenById: jest.fn().mockResolvedValue(undefined),
      transaction: jest.fn().mockImplementation(async (fn: any) => fn({})),
      recordFailedLogin: jest.fn(),
    } as unknown as jest.Mocked<AuthRepository>;

    jwtService = {
      verifyAsync: jest.fn().mockResolvedValue(mockPayload),
      signAsync: jest.fn().mockResolvedValue("new-access-token"),
      decode: jest.fn().mockReturnValue({ exp: Math.floor(Date.now() / 1000) + 86400 }),
    } as unknown as jest.Mocked<JwtService>;

    configService = {
      get: jest.fn((key: string) => {
        if (key === "AUTH_JWT_SECRET") return "test-secret";
        if (key === "AUTH_JWT_REFRESH_SECRET") return "test-refresh-secret";
        if (key === "AUTH_JWT_ACCESS_EXPIRES_IN") return "30m";
        if (key === "AUTH_BCRYPT_ROUNDS") return "4";
        if (key === "REFRESH_GRACE_PERIOD_MS") return "30000";
        return undefined;
      }),
    } as unknown as jest.Mocked<ConfigService>;

    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    useCase = new RefreshTokensUseCase(
      jwtService,
      configService,
      authRepo,
      new RequestContextService(),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("returns new token pair for valid refresh token", async () => {
    jwtService.signAsync
      .mockResolvedValueOnce("new-access-token")
      .mockResolvedValueOnce("new-refresh-token");

    const result = await useCase.execute("valid-refresh-token");

    expect(result.access_token).toBe("new-access-token");
    expect(result.refresh_token).toBe("new-refresh-token");
    expect(authRepo.supersedeRefreshToken).toHaveBeenCalledWith("token-1", expect.anything());
    expect(authRepo.insertRefreshToken).toHaveBeenCalledTimes(1);
  });

  it("throws UnauthorizedException when token record not found", async () => {
    authRepo.findActiveRefreshToken.mockResolvedValue(null as any);

    await expect(
      useCase.execute("invalid-token"),
    ).rejects.toThrow(UnauthorizedException);
  });

  it("throws UnauthorizedException for expired token", async () => {
    authRepo.findActiveRefreshToken.mockResolvedValue({
      ...mockTokenRecord,
      expiresAt: new Date(Date.now() - 1000),
    });

    await expect(
      useCase.execute("expired-token"),
    ).rejects.toThrow(UnauthorizedException);

    expect(authRepo.deleteRefreshTokenById).toHaveBeenCalledWith("token-1");
  });

  it("revokes token family on hash mismatch and throws", async () => {
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    await expect(
      useCase.execute("stolen-token"),
    ).rejects.toThrow(UnauthorizedException);

    expect(authRepo.revokeRefreshTokenFamily).toHaveBeenCalledWith("user-1");
    expect(authRepo.recordRefreshTokenReuse).toHaveBeenCalledWith(
      expect.objectContaining({ tokenId: "token-1" }),
    );
  });

  it("returns access token only when token is superseded in grace period", async () => {
    authRepo.findActiveRefreshToken.mockResolvedValue({
      ...mockTokenRecord,
      supersededAt: new Date(Date.now() - 5000),
    });

    const result = await useCase.execute("superseded-token");

    expect(result.access_token).toBeDefined();
    expect(result.refresh_token).toBeUndefined();
    expect(authRepo.supersedeRefreshToken).not.toHaveBeenCalled();
    expect(authRepo.insertRefreshToken).not.toHaveBeenCalled();
  });

  it("throws UnauthorizedException when user not found", async () => {
    authRepo.findUserById.mockResolvedValue(null as any);

    await expect(
      useCase.execute("valid-token"),
    ).rejects.toThrow(UnauthorizedException);
  });

  it("throws when verifyRefreshToken fails", async () => {
    jwtService.verifyAsync.mockRejectedValue(new Error("jwt expired"));

    await expect(
      useCase.execute("expired-jwt"),
    ).rejects.toThrow(UnauthorizedException);
  });
});
