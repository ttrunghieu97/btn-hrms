import { UnauthorizedException } from "@nestjs/common";
import { AuthController } from "./auth.controller";

describe("AuthController refresh", () => {
  function makeController() {
    const loginUseCase = { execute: jest.fn() };
    const refreshTokens = { execute: jest.fn() };
    const logoutUseCase = { execute: jest.fn() };
    const revokeAllTokens = { execute: jest.fn() };
    const authConfig = {
      getAllowedFrontendOrigins: jest.fn().mockReturnValue(["http://localhost:3000"]),
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
      { verifyToken: jest.fn() }, // googleAuth
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
    expect(res.clearCookie).toHaveBeenCalledWith("auth_token", { path: "/" });
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
});
