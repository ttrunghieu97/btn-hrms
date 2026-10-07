import { ConfigService } from "@nestjs/config";
import { GoogleAuthService } from "./google-auth.service";

describe("GoogleAuthService", () => {
  let service: GoogleAuthService;
  let configService: jest.Mocked<ConfigService>;
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    configService = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === "GOOGLE_CLIENT_ID") return "expected-client-id.apps.googleusercontent.com";
        return undefined;
      }),
    } as any;
    service = new GoogleAuthService(configService);
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("verifies valid token matching audience and verified email", async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        sub: "google-123",
        email: "employee@btn.com",
        aud: "expected-client-id.apps.googleusercontent.com",
        email_verified: "true",
        iss: "https://accounts.google.com",
        name: "Test Employee",
      }),
    } as any);

    const result = await service.verifyToken("valid-id-token");
    expect(result).toEqual({
      sub: "google-123",
      email: "employee@btn.com",
      name: "Test Employee",
      picture: undefined,
    });
  });

  it("SECURITY: rejects token when audience (aud) does not match GOOGLE_CLIENT_ID", async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        sub: "google-attacker-victim",
        email: "victim@btn.com",
        aud: "attacker-client-id.apps.googleusercontent.com",
        email_verified: "true",
        iss: "https://accounts.google.com",
      }),
    } as any);

    await expect(service.verifyToken("attacker-token")).rejects.toThrow(
      "Google token audience mismatch",
    );
  });

  it("SECURITY: rejects token when GOOGLE_CLIENT_ID is not configured", async () => {
    configService.get.mockReturnValue(undefined);
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        sub: "google-123",
        email: "victim@btn.com",
        aud: "some-client-id.apps.googleusercontent.com",
        email_verified: "true",
        iss: "https://accounts.google.com",
      }),
    } as any);

    await expect(service.verifyToken("any-token")).rejects.toThrow(
      "Google SSO is disabled or not configured: GOOGLE_CLIENT_ID is missing",
    );
  });

  it("SECURITY: rejects token when email is not verified", async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        sub: "google-unverified",
        email: "unverified@btn.com",
        aud: "expected-client-id.apps.googleusercontent.com",
        email_verified: "false",
        iss: "https://accounts.google.com",
      }),
    } as any);

    await expect(service.verifyToken("unverified-token")).rejects.toThrow(
      "Google account email is not verified",
    );
  });

  it("SECURITY: rejects token when issuer is invalid", async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        sub: "google-fake-issuer",
        email: "spoofed@btn.com",
        aud: "expected-client-id.apps.googleusercontent.com",
        email_verified: true,
        iss: "https://fake-google-issuer.com",
      }),
    } as any);

    await expect(service.verifyToken("fake-issuer-token")).rejects.toThrow(
      "Invalid Google token issuer",
    );
  });
});
