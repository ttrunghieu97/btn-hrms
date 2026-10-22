import { type ConfigService } from "@nestjs/config";
import { AuthConfigService } from "./auth-config.service";

describe("AuthConfigService", () => {
  const makeService = (env: Record<string, string | undefined>) => {
    const config = {
      get: (key: string) => env[key],
    } as ConfigService;
    return new AuthConfigService(config);
  };

  it("uses secure defaults in production", () => {
    const svc = makeService({ NODE_ENV: "production" });
    const opts = svc.getRefreshCookieOptions();
    expect(opts.httpOnly).toBe(true);
    expect(opts.secure).toBe(true);
    expect(opts.path).toBe("/");
  });

  it("supports explicit secure override", () => {
    const svc = makeService({
      NODE_ENV: "development",
      AUTH_COOKIE_SECURE: "true",
      AUTH_COOKIE_SAMESITE: "strict",
    });
    const opts = svc.getRefreshCookieOptions();
    expect(opts.secure).toBe(true);
    expect(opts.sameSite).toBe("strict");
  });

  it("uses non-secure cookie defaults in development", () => {
    const svc = makeService({ NODE_ENV: "development" });
    expect(svc.getRefreshCookieOptions().secure).toBe(false);
    expect(svc.getAccessCookieOptions().secure).toBe(false);
  });

  it("uses access cookie defaults", () => {
    const svc = makeService({ NODE_ENV: "production" });
    const opts = svc.getAccessCookieOptions();
    expect(opts.httpOnly).toBe(true);
    expect(opts.secure).toBe(true);
    expect(opts.path).toBe("/");
    expect(opts.maxAge).toBe(30 * 60 * 1000);
  });

  it("parses allowed frontend origins from APP_URL, FRONTEND_URL, and CORS_ORIGIN", () => {
    const svc = makeService({
      APP_URL: "http://localhost:8080, https://hrms.example.com/ ",
      FRONTEND_URL: "http://localhost:8080",
      CORS_ORIGIN: "http://127.0.0.1:8080/",
    });

    expect(svc.getAllowedFrontendOrigins()).toEqual([
      "http://localhost:8080",
      "https://hrms.example.com",
      "http://127.0.0.1:8080",
    ]);
  });

  it("includes normalized ALLOWED_DEV_ORIGINS in non-production and ignores invalid entries", () => {
    const devSvc = makeService({
      NODE_ENV: "development",
      APP_URL: "http://localhost:8080/",
      ALLOWED_DEV_ORIGINS:
        "http://192.168.1.50:8080, 10.0.0.12:8080, https://dev.hrms.local:8443/, ftp://invalid.local, not a url",
    });

    expect(devSvc.getAllowedFrontendOrigins()).toEqual([
      "http://localhost:8080",
      "http://192.168.1.50:8080",
      "http://10.0.0.12:8080",
      "https://10.0.0.12:8080",
      "https://dev.hrms.local:8443",
    ]);
  });

  it("ignores ALLOWED_DEV_ORIGINS in production", () => {
    const prodSvc = makeService({
      NODE_ENV: "production",
      APP_URL: "https://hrms.example.com",
      ALLOWED_DEV_ORIGINS: "http://192.168.1.50:8080",
    });

    expect(prodSvc.getAllowedFrontendOrigins()).toEqual([
      "https://hrms.example.com",
    ]);
  });
});
