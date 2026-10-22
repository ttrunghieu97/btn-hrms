import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { CookieOptions } from "express";
import {
  normalizeOriginUrl,
  parseHostHeaderValue,
  parseTrustedProxyEntries,
} from "../../../shared/utils/cookie-csrf.util";

@Injectable()
export class AuthConfigService {
  constructor(private readonly config: ConfigService) {}

  getAllowedFrontendOrigins(): string[] {
    const raw = [
      this.config.get("APP_URL"),
      this.config.get("FRONTEND_URL"),
      this.config.get("CORS_ORIGIN"),
    ]
      .filter(Boolean)
      .join(",");

    const origins = new Set<string>();
    const configuredPorts = new Set<string>(["8080", "3000"]);

    for (const value of raw.split(",")) {
      const normalized = normalizeOriginUrl(value);
      if (normalized) {
        origins.add(normalized);
        try {
          const parsed = new URL(normalized);
          if (parsed.port) configuredPorts.add(parsed.port);
        } catch {
          // ignore
        }
      }
    }

    const isProduction = this.config.get("NODE_ENV") === "production";
    const rawDevOrigins = !isProduction
      ? this.config.get("ALLOWED_DEV_ORIGINS")
      : undefined;

    if (rawDevOrigins) {
      for (const entry of String(rawDevOrigins).split(",")) {
        const trimmed = entry.trim().replace(/\/+$/, "");
        if (!trimmed) continue;

        if (/^https?:\/\//i.test(trimmed)) {
          const normalized = normalizeOriginUrl(trimmed);
          if (normalized) origins.add(normalized);
          continue;
        }

        const parsedHost = parseHostHeaderValue(trimmed);
        if (parsedHost) {
          origins.add(`http://${parsedHost.host}`);
          origins.add(`https://${parsedHost.host}`);
          if (!parsedHost.port) {
            for (const port of configuredPorts) {
              origins.add(`http://${parsedHost.hostname}:${port}`);
              origins.add(`https://${parsedHost.hostname}:${port}`);
            }
          }
        }
      }
    }

    return Array.from(origins);
  }

  getTrustProxyConfig(): boolean | number | string {
    const raw = this.config.get("TRUST_PROXY");
    if (raw === undefined || raw === null || raw === "") return 1;
    const normalized = String(raw).trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
    const num = Number(normalized);
    if (Number.isInteger(num) && num >= 0) return num;
    return 1;
  }

  getTrustedProxyIps(): string[] {
    return parseTrustedProxyEntries(this.config.get("TRUSTED_PROXY_IPS"));
  }

  isProductionEnv(): boolean {
    return this.config.get("NODE_ENV") === "production";
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
