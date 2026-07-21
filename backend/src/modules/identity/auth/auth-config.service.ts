import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { CookieOptions } from "express";

@Injectable()
export class AuthConfigService {
  constructor(private readonly config: ConfigService) {}

  getAllowedFrontendOrigins() {
    const raw = String(this.config.get("APP_URL") || "");
    return raw
      .split(",")
      .map((value) => value.trim().replace(/\/+$/, ""))
      .filter(Boolean);
  }

  getAccessCookieName() {
    return this.config.get("AUTH_ACCESS_COOKIE_NAME") || "access_token";
  }

  getRefreshCookieName() {
    return this.config.get("AUTH_REFRESH_COOKIE_NAME") || "refresh_token";
  }

  private getCookieDomain(): string | undefined {
    const domain = String(this.config.get("AUTH_COOKIE_DOMAIN") || "").trim();
    return domain || undefined;
  }

  private resolveSecure(): boolean {
    const secureRaw = this.config.get("AUTH_COOKIE_SECURE");
    const isProduction = this.config.get("NODE_ENV") === "production";
    return secureRaw !== undefined
      ? String(secureRaw).toLowerCase() === "true"
      : isProduction;
  }

  private resolveSameSite(): "lax" | "strict" | "none" {
    const raw = String(this.config.get("AUTH_COOKIE_SAMESITE") || "lax").toLowerCase();
    return raw === "none" ? "none" : raw === "strict" ? "strict" : "lax";
  }

  getAccessCookieOptions(): CookieOptions {
    const rawTtl = this.config.get("AUTH_JWT_ACCESS_EXPIRES_IN") || "30m";
    const ttlMatch = rawTtl.match(/^(\d+)(s|m|h|d)$/);
    let maxAgeSec = 1800;
    if (ttlMatch) {
      const val = parseInt(ttlMatch[1], 10);
      switch (ttlMatch[2]) {
        case "s": maxAgeSec = val; break;
        case "m": maxAgeSec = val * 60; break;
        case "h": maxAgeSec = val * 3600; break;
        case "d": maxAgeSec = val * 86400; break;
      }
    }
    const maxAgeMs = maxAgeSec * 1000;

    return {
      httpOnly: true,
      secure: this.resolveSecure(),
      sameSite: this.resolveSameSite(),
      path: "/",
      maxAge: maxAgeMs,
      domain: this.getCookieDomain(),
    };
  }

  getRefreshCookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      secure: this.resolveSecure(),
      sameSite: this.resolveSameSite(),
      path: "/",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      domain: this.getCookieDomain(),
    };
  }
}
