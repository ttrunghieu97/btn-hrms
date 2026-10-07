import { SsoLoginUseCase } from "./sso-login.usecase";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { ERROR_REASONS } from "../../../../shared/constants/error-reasons";

describe("SsoLoginUseCase", () => {
  let useCase: SsoLoginUseCase;
  let jwtService: any;
  let configService: any;
  let authRepo: any;
  let db: any;
  let googleAuth: any;
  let getUserPermissions: any;
  let requestContext: any;
  let auditLog: any;
  let employeeReader: any;
  let totpService: any;

  beforeEach(() => {
    jwtService = {
      signAsync: jest.fn().mockResolvedValue("jwt-token"),
      decode: jest.fn().mockReturnValue({ exp: Math.floor(Date.now() / 1000) + 3600 }),
    };
    configService = {
      get: jest.fn().mockImplementation((k: string) => {
        if (k === "AUTH_JWT_SECRET") return "test-secret-at-least-32-chars-long";
        if (k === "AUTH_JWT_REFRESH_SECRET") return "test-refresh-secret-32-chars-long";
        if (k === "AUTH_JWT_ACCESS_EXPIRES_IN") return "15m";
        if (k === "AUTH_JWT_REFRESH_EXPIRES_IN") return "7d";
        return undefined;
      }),
    };
    authRepo = {
      updateLastLoginAt: jest.fn().mockResolvedValue(undefined),
      insertRefreshToken: jest.fn().mockResolvedValue(undefined),
    };
    db = {
      query: {
        userIdentities: { findFirst: jest.fn().mockResolvedValue(null) },
        users: { findFirst: jest.fn().mockResolvedValue(null) },
      },
      insert: jest.fn().mockReturnValue({
        values: jest.fn().mockReturnValue({
          onConflictDoNothing: jest.fn().mockResolvedValue(undefined),
        }),
      }),
    };
    googleAuth = {
      verifyToken: jest.fn().mockResolvedValue({
        sub: "google-sub-123",
        email: "test@btn.com",
        name: "Test User",
      }),
    };
    getUserPermissions = {
      execute: jest.fn().mockResolvedValue(["employee:view"]),
    };
    requestContext = { getRequestId: jest.fn().mockReturnValue("req-123") };
    auditLog = { write: jest.fn().mockResolvedValue(undefined) };
    employeeReader = { findEmployeeByUserId: jest.fn().mockResolvedValue(null) };
    totpService = { verifyPasscode: jest.fn().mockReturnValue(true) };

    useCase = new SsoLoginUseCase(
      jwtService,
      configService,
      authRepo,
      db,
      googleAuth,
      getUserPermissions,
      requestContext,
      auditLog,
      employeeReader,
      totpService,
    );
  });

  it("throws unauthorized if user email is not found in database", async () => {
    await expect(useCase.execute("valid-token")).rejects.toMatchObject({
      response: expect.objectContaining({
        error: ERROR_CODES.AUTH_INVALID_CREDENTIALS,
      }),
    });
  });

  it("throws unauthorized if user is inactive", async () => {
    db.query.users.findFirst.mockResolvedValue({
      id: "u-1",
      username: "test",
      email: "test@btn.com",
      isSuperAdmin: false,
      isActive: false,
      authorizationVersion: 1,
      isTotpEnabled: false,
      totpSecret: null,
    });

    await expect(useCase.execute("valid-token")).rejects.toMatchObject({
      response: expect.objectContaining({
        error: ERROR_CODES.AUTH_INVALID_CREDENTIALS,
      }),
    });
  });

  it("throws unauthorized if employee is auto-terminated", async () => {
    db.query.users.findFirst.mockResolvedValue({
      id: "u-1",
      username: "test",
      email: "test@btn.com",
      isSuperAdmin: false,
      isActive: true,
      authorizationVersion: 1,
      isTotpEnabled: false,
      totpSecret: null,
    });
    employeeReader.findEmployeeByUserId.mockResolvedValue({
      endDate: "2020-01-01",
      deletedAt: null,
    });

    await expect(useCase.execute("valid-token")).rejects.toMatchObject({
      response: expect.objectContaining({
        error: ERROR_CODES.AUTH_INVALID_CREDENTIALS,
      }),
    });
  });

  it("requires MFA code if isTotpEnabled is true and no totpCode provided", async () => {
    db.query.users.findFirst.mockResolvedValue({
      id: "u-1",
      username: "test",
      email: "test@btn.com",
      isSuperAdmin: false,
      isActive: true,
      authorizationVersion: 1,
      isTotpEnabled: true,
      totpSecret: "JBSWY3DPEHPK3PXP",
    });

    await expect(useCase.execute("valid-token")).rejects.toMatchObject({
      response: expect.objectContaining({
        error: ERROR_CODES.AUTH_MFA_REQUIRED,
        details: { reason: ERROR_REASONS.MFA_REQUIRED },
      }),
    });
  });

  it("rejects invalid MFA code if totpCode does not match", async () => {
    db.query.users.findFirst.mockResolvedValue({
      id: "u-1",
      username: "test",
      email: "test@btn.com",
      isSuperAdmin: false,
      isActive: true,
      authorizationVersion: 1,
      isTotpEnabled: true,
      totpSecret: "JBSWY3DPEHPK3PXP",
    });
    totpService.verifyPasscode.mockReturnValue(false);

    await expect(useCase.execute("valid-token", "000000")).rejects.toMatchObject({
      response: expect.objectContaining({
        error: ERROR_CODES.AUTH_INVALID_MFA,
        details: { reason: ERROR_REASONS.INVALID_MFA_CODE },
      }),
    });
  });

  it("successfully logs in with valid token and valid TOTP code", async () => {
    db.query.users.findFirst.mockResolvedValue({
      id: "u-1",
      username: "test",
      email: "test@btn.com",
      isSuperAdmin: false,
      isActive: true,
      authorizationVersion: 1,
      isTotpEnabled: true,
      totpSecret: "JBSWY3DPEHPK3PXP",
    });
    totpService.verifyPasscode.mockReturnValue(true);

    const result = await useCase.execute("valid-token", "123456");
    expect(result).toHaveProperty("access_token");
    expect(result).toHaveProperty("user");
    expect(result.user?.id).toBe("u-1");
  });
});
