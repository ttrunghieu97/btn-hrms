import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { AuthController } from "./auth.controller";

describe("AuthController refresh", () => {
  function makeController() {
    const loginUseCase = { execute: jest.fn() };
    const refreshTokens = { execute: jest.fn() };
    const logoutUseCase = { execute: jest.fn() };
    const revokeAllTokens = { execute: jest.fn() };
    const authConfig = {
      getAllowedFrontendOrigins: jest.fn().mockReturnValue(["http://localhost:3000"]),
      getTrustProxyConfig: jest.fn().mockReturnValue(1),
      getTrustedProxyIps: jest.fn().mockReturnValue(["loopback"]),
      isProductionEnv: jest.fn().mockReturnValue(false),
      getLegacyAuthFlagCookieName: jest.fn().mockReturnValue("auth_token"),
      getAccessCookieName: jest.fn().mockReturnValue("access_token"),
      getRefreshCookieName: jest.fn().mockReturnValue("refresh_token"),
      getAccessCookieOptions: jest.fn().mockReturnValue({ path: "/api/" }),
      getRefreshCookieOptions: jest.fn().mockReturnValue({ path: "/" }),
    };

    const controller = new AuthController(
      loginUseCase as any,
      refreshTokens as any,
      logoutUseCase as any,
      revokeAllTokens as any,
      {} as any, // changePasswordUseCase
      authConfig as any,
      { execute: jest.fn() } as any, // listSessions
      { execute: jest.fn() } as any, // revokeUserSession
      { execute: jest.fn() } as any, // loginHistory
      { execute: jest.fn() } as any, // securityTimeline
      { execute: jest.fn() } as any, // linkEmail
      { execute: jest.fn() } as any, // ssoLogin
      { verifyToken: jest.fn() } as any, // googleAuth
      { generateSecret: jest.fn(), enableTotp: jest.fn(), disableTotp: jest.fn() } as any, // totpService
    );

    return { controller, refreshTokens, authConfig };
  }

  function makeResponse() {
    return {
      cookie: jest.fn(),
      clearCookie: jest.fn(),
    } as any;
  }

  it("returns expires_in on successful refresh", async () => {
    const { controller, refreshTokens } = makeController();
    const res = makeResponse();
    refreshTokens.execute.mockResolvedValue({
      access_token: "new-access-token",
      expires_in: 900,
    });

    await expect(
      controller.refresh(
        {},
        { cookies: { refresh_token: "rt-1" } } as any,
        res,
      ),
    ).resolves.toEqual({
      access_token: "new-access-token",
      expires_in: 900,
    });

    expect(res.cookie).toHaveBeenCalledWith(
      "access_token",
      "new-access-token",
      { path: "/api/" },
    );
  });

  it("clears auth cookies when refresh token is invalid", async () => {
    const { controller, refreshTokens } = makeController();
    const res = makeResponse();
    refreshTokens.execute.mockRejectedValue(new UnauthorizedException());

    await expect(
      controller.refresh(
        {},
        { cookies: { refresh_token: "rt-1" } } as any,
        res,
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(res.clearCookie).toHaveBeenCalledWith("access_token", { path: "/api/" });
    expect(res.clearCookie).toHaveBeenCalledWith("refresh_token", { path: "/" });
  });

  it("does not clear auth cookies on non-auth refresh failures", async () => {
    const { controller, refreshTokens } = makeController();
    const res = makeResponse();
    const err = new Error("db temporarily unavailable");
    refreshTokens.execute.mockRejectedValue(err);

    await expect(
      controller.refresh(
        {},
        { cookies: { refresh_token: "rt-1" } } as any,
        res,
      ),
    ).rejects.toBe(err);

    expect(res.clearCookie).not.toHaveBeenCalled();
  });

  it("AUDIT-005: blocks cross-site cookie-authenticated refresh (CSRF protection)", async () => {
    const { controller, refreshTokens } = makeController();
    const res = makeResponse();

    await expect(
      controller.refresh(
        {},
        {
          cookies: { refresh_token: "rt-1" },
          headers: { "sec-fetch-site": "cross-site" },
        } as any,
        res,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(refreshTokens.execute).not.toHaveBeenCalled();
  });

  it("AUDIT-005: blocks cookie-authenticated refresh from untrusted Origin header", async () => {
    const { controller, refreshTokens } = makeController();
    const res = makeResponse();

    await expect(
      controller.refresh(
        {},
        {
          cookies: { refresh_token: "rt-1" },
          headers: { origin: "https://evil.example.com" },
        } as any,
        res,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(refreshTokens.execute).not.toHaveBeenCalled();
  });

  it("allows same-origin refresh via localhost / loopback equivalence", async () => {
    const { controller, refreshTokens, authConfig } = makeController();
    authConfig.getAllowedFrontendOrigins.mockReturnValue(["http://localhost:8080"]);
    const res = makeResponse();
    refreshTokens.execute.mockResolvedValue({
      access_token: "token-localhost",
      expires_in: 1800,
    });

    await expect(
      controller.refresh(
        {},
        {
          protocol: "http",
          cookies: { refresh_token: "rt-1" },
          headers: {
            origin: "http://127.0.0.1:8080",
            host: "127.0.0.1:3001",
            "sec-fetch-site": "same-origin",
          },
          socket: { remoteAddress: "127.0.0.1" },
        } as any,
        res,
      ),
    ).resolves.toEqual({
      access_token: "token-localhost",
      expires_in: 1800,
    });
  });

  it("allows LAN IP refresh through trusted Next.js rewrite proxy with X-Forwarded-Host and X-Forwarded-Proto", async () => {
    const { controller, refreshTokens, authConfig } = makeController();
    authConfig.getAllowedFrontendOrigins.mockReturnValue(["http://localhost:8080"]);
    const res = makeResponse();
    refreshTokens.execute.mockResolvedValue({
      access_token: "token-lan",
      expires_in: 1800,
    });

    await expect(
      controller.refresh(
        {},
        {
          protocol: "http",
          cookies: { refresh_token: "rt-1" },
          headers: {
            origin: "http://192.168.1.25:8080",
            host: "127.0.0.1:3001",
            "x-forwarded-host": "192.168.1.25:8080",
            "x-forwarded-proto": "http",
            "sec-fetch-site": "same-origin",
          },
          socket: { remoteAddress: "::ffff:127.0.0.1" },
          app: { get: (k: string) => (k === "trust proxy" ? 1 : undefined) },
        } as any,
        res,
      ),
    ).resolves.toEqual({
      access_token: "token-lan",
      expires_in: 1800,
    });
  });

  it("allows refresh from an origin configured in ALLOWED_DEV_ORIGINS", async () => {
    const { controller, refreshTokens, authConfig } = makeController();
    authConfig.getAllowedFrontendOrigins.mockReturnValue([
      "http://localhost:8080",
      "http://10.10.20.99:8080",
    ]);
    const res = makeResponse();
    refreshTokens.execute.mockResolvedValue({
      access_token: "token-dev-origin",
      expires_in: 1800,
    });

    await expect(
      controller.refresh(
        {},
        {
          protocol: "http",
          cookies: { refresh_token: "rt-1" },
          headers: {
            origin: "http://10.10.20.99:8080",
            host: "127.0.0.1:3001",
          },
          socket: { remoteAddress: "127.0.0.1" },
        } as any,
        res,
      ),
    ).resolves.toEqual({
      access_token: "token-dev-origin",
      expires_in: 1800,
    });
  });

  it.each([
    ["Origin: null", "null"],
    ["malformed URL", "not-a-valid-origin"],
    ["origin with path", "http://localhost:3000/admin"],
    ["origin with credentials", "http://user:pass@localhost:3000"],
    ["multiple comma-separated origins", "http://localhost:3000, https://evil.example.com"],
  ])("blocks cookie-authenticated refresh when Origin is %s", async (_label, invalidOrigin) => {
    const { controller, refreshTokens } = makeController();
    const res = makeResponse();

    await expect(
      controller.refresh(
        {},
        {
          protocol: "http",
          cookies: { refresh_token: "rt-1" },
          headers: {
            origin: invalidOrigin,
            host: "localhost:3000",
          },
          socket: { remoteAddress: "127.0.0.1" },
        } as any,
        res,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(refreshTokens.execute).not.toHaveBeenCalled();
  });

  it("blocks forged X-Forwarded-Host when request comes from an untrusted external IP", async () => {
    const { controller, refreshTokens, authConfig } = makeController();
    authConfig.getAllowedFrontendOrigins.mockReturnValue(["http://localhost:8080"]);
    const res = makeResponse();

    await expect(
      controller.refresh(
        {},
        {
          protocol: "http",
          cookies: { refresh_token: "rt-1" },
          headers: {
            origin: "https://evil.example.com",
            host: "127.0.0.1:3001",
            "x-forwarded-host": "evil.example.com",
            "x-forwarded-proto": "https",
          },
          socket: { remoteAddress: "203.0.113.55" },
          app: { get: (k: string) => (k === "trust proxy" ? 1 : undefined) },
        } as any,
        res,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(refreshTokens.execute).not.toHaveBeenCalled();
  });

  it("blocks forged X-Forwarded-Host when trust proxy is disabled", async () => {
    const { controller, refreshTokens, authConfig } = makeController();
    authConfig.getAllowedFrontendOrigins.mockReturnValue(["http://localhost:8080"]);
    authConfig.getTrustProxyConfig.mockReturnValue(false);
    const res = makeResponse();

    await expect(
      controller.refresh(
        {},
        {
          protocol: "http",
          cookies: { refresh_token: "rt-1" },
          headers: {
            origin: "http://192.168.1.25:8080",
            host: "127.0.0.1:3001",
            "x-forwarded-host": "192.168.1.25:8080",
            "x-forwarded-proto": "http",
          },
          socket: { remoteAddress: "127.0.0.1" },
          app: { get: (k: string) => (k === "trust proxy" ? false : undefined) },
        } as any,
        res,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(refreshTokens.execute).not.toHaveBeenCalled();
  });

  it("blocks direct API access from a private LAN IP that is not a configured trusted proxy even with forged X-Forwarded-Host", async () => {
    const { controller, refreshTokens, authConfig } = makeController();
    authConfig.getAllowedFrontendOrigins.mockReturnValue(["http://localhost:8080"]);
    const res = makeResponse();

    await expect(
      controller.refresh(
        {},
        {
          protocol: "http",
          cookies: { refresh_token: "rt-1" },
          headers: {
            origin: "http://192.168.1.50:8080",
            host: "192.168.1.10:3001",
            "x-forwarded-host": "192.168.1.50:8080",
            "x-forwarded-proto": "http",
          },
          socket: { remoteAddress: "192.168.1.50" },
          app: { get: (k: string) => (k === "trust proxy" ? 1 : undefined) },
        } as any,
        res,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(refreshTokens.execute).not.toHaveBeenCalled();
  });

  it("allows forwarded headers from an explicitly configured proxy CIDR in TRUSTED_PROXY_IPS while rejecting other private IPs", async () => {
    const { controller, refreshTokens, authConfig } = makeController();
    authConfig.getAllowedFrontendOrigins.mockReturnValue(["http://localhost:8080"]);
    authConfig.getTrustedProxyIps.mockReturnValue(["loopback", "172.18.0.0/16"]);
    const res = makeResponse();
    refreshTokens.execute.mockResolvedValue({
      access_token: "token-docker-proxy",
      refresh_token: "rotated-rt-2",
      expires_in: 1800,
    });

    await expect(
      controller.refresh(
        {},
        {
          protocol: "http",
          cookies: { refresh_token: "rt-1" },
          headers: {
            origin: "http://192.168.1.25:8080",
            host: "api:3001",
            "x-forwarded-host": "192.168.1.25:8080",
            "x-forwarded-proto": "http",
          },
          socket: { remoteAddress: "172.18.0.5" },
          app: { get: (k: string) => (k === "trust proxy" ? 1 : undefined) },
        } as any,
        res,
      ),
    ).resolves.toEqual({
      access_token: "token-docker-proxy",
      expires_in: 1800,
    });
    expect(res.cookie).toHaveBeenCalledWith("refresh_token", "rotated-rt-2", { path: "/" });

    await expect(
      controller.refresh(
        {},
        {
          protocol: "http",
          cookies: { refresh_token: "rt-1" },
          headers: {
            origin: "http://192.168.1.25:8080",
            host: "api:3001",
            "x-forwarded-host": "192.168.1.25:8080",
            "x-forwarded-proto": "http",
          },
          socket: { remoteAddress: "10.0.0.55" },
          app: { get: (k: string) => (k === "trust proxy" ? 1 : undefined) },
        } as any,
        res,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("never uses X-Forwarded-Host to expand origin allowlist to unconfigured domains even from a trusted proxy", async () => {
    const { controller, refreshTokens, authConfig } = makeController();
    authConfig.getAllowedFrontendOrigins.mockReturnValue(["http://localhost:8080"]);
    const res = makeResponse();

    await expect(
      controller.refresh(
        {},
        {
          protocol: "http",
          cookies: { refresh_token: "rt-1" },
          headers: {
            origin: "https://evil.example.com",
            host: "127.0.0.1:3001",
            "x-forwarded-host": "evil.example.com",
            "x-forwarded-proto": "https",
          },
          socket: { remoteAddress: "127.0.0.1" },
          app: { get: (k: string) => (k === "trust proxy" ? 1 : undefined) },
        } as any,
        res,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(refreshTokens.execute).not.toHaveBeenCalled();
  });

  it("blocks unconfigured LAN IP origins in production even when forwarded by a trusted proxy", async () => {
    const { controller, refreshTokens, authConfig } = makeController();
    authConfig.getAllowedFrontendOrigins.mockReturnValue(["https://hrms.example.com"]);
    authConfig.isProductionEnv.mockReturnValue(true);
    const res = makeResponse();

    await expect(
      controller.refresh(
        {},
        {
          protocol: "http",
          cookies: { refresh_token: "rt-1" },
          headers: {
            origin: "http://192.168.1.25:8080",
            host: "127.0.0.1:3001",
            "x-forwarded-host": "192.168.1.25:8080",
            "x-forwarded-proto": "http",
          },
          socket: { remoteAddress: "127.0.0.1" },
          app: { get: (k: string) => (k === "trust proxy" ? 1 : undefined) },
        } as any,
        res,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(refreshTokens.execute).not.toHaveBeenCalled();
  });
});
