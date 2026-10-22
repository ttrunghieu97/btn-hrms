import * as ipaddr from "ipaddr.js";
import { ERROR_CODES } from "../constants/error-codes";
import { ERROR_REASONS } from "../constants/error-reasons";
import { throwForbidden } from "./http-error";

export interface CsrfRequestLike {
  method?: string;
  protocol?: string;
  headers?: Record<string, string | string[] | undefined>;
  socket?: {
    remoteAddress?: string;
    encrypted?: boolean;
  };
  connection?: {
    remoteAddress?: string;
  };
  app?: {
    get?: (name: string) => unknown;
  };
}

export interface CookieCsrfCheckOptions {
  allowedOrigins?: Iterable<string>;
  trustProxy?: boolean | number | string;
  trustedProxyIps?: string | Iterable<string>;
  allowLoopbackEquivalence?: boolean;
  allowDevLanSameOrigin?: boolean;
  contextLabel?: "refresh" | "mutation";
}

export function normalizeOriginUrl(raw: string): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim().replace(/\/+$/, "");
  if (
    !trimmed ||
    trimmed.toLowerCase() === "null" ||
    trimmed.includes(",") ||
    trimmed.includes("\\") ||
    trimmed.includes("@") ||
    /\s/.test(trimmed)
  ) {
    return null;
  }

  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }
    if (url.username || url.password) {
      return null;
    }
    if (url.pathname !== "/" || url.search !== "" || url.hash !== "") {
      return null;
    }
    return url.origin.toLowerCase();
  } catch {
    return null;
  }
}

export function parseHostHeaderValue(
  raw: string | string[] | undefined,
): { hostname: string; port: string; host: string } | null {
  if (raw === undefined) return null;
  if (Array.isArray(raw)) {
    if (raw.length !== 1) return null;
    return parseHostHeaderValue(raw[0]);
  }
  if (typeof raw !== "string") return null;

  const trimmed = raw.trim();
  if (
    !trimmed ||
    trimmed.includes(",") ||
    trimmed.includes("\\") ||
    trimmed.includes("@") ||
    trimmed.includes("/") ||
    trimmed.includes("?") ||
    trimmed.includes("#") ||
    /\s/.test(trimmed)
  ) {
    return null;
  }

  try {
    const url = new URL(`http://${trimmed}`);
    if (url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
      return null;
    }
    if (
      url.host.toLowerCase() !== trimmed.toLowerCase() &&
      `${url.hostname}:80`.toLowerCase() !== trimmed.toLowerCase()
    ) {
      return null;
    }
    return {
      hostname: url.hostname.toLowerCase(),
      port: url.port,
      host: url.host.toLowerCase(),
    };
  } catch {
    return null;
  }
}

export function parseTrustedProxyEntries(raw?: string | Iterable<string>): string[] {
  if (!raw) return ["loopback"];
  const items =
    typeof raw === "string"
      ? raw.split(",")
      : Array.from(raw);
  const cleaned = items.map((item) => String(item).trim()).filter(Boolean);
  return cleaned.length > 0 ? cleaned : ["loopback"];
}

export function isValidTrustedProxyEntry(entry: string): boolean {
  const normalized = entry.trim().toLowerCase();
  if (!normalized) return false;
  if (
    normalized === "loopback" ||
    normalized === "linklocal" ||
    normalized === "uniquelocal"
  ) {
    return true;
  }
  if (normalized.includes("/")) {
    try {
      ipaddr.parseCIDR(normalized);
      return true;
    } catch {
      return false;
    }
  }
  return ipaddr.isValid(normalized);
}

export function isTrustedProxyAddress(
  rawAddress: string,
  trustedProxies?: string | Iterable<string>,
): boolean {
  if (typeof rawAddress !== "string") return false;
  const trimmed = rawAddress.trim();
  if (!trimmed) return false;

  try {
    const parsed = ipaddr.process(trimmed);
    const range = parsed.range();
    const entries = parseTrustedProxyEntries(trustedProxies);

    for (const entry of entries) {
      const lower = entry.toLowerCase();
      if (lower === "loopback") {
        if (range === "loopback") return true;
        continue;
      }
      if (lower === "linklocal") {
        if (range === "linkLocal") return true;
        continue;
      }
      if (lower === "uniquelocal") {
        if (range === "uniqueLocal") return true;
        continue;
      }
      if (lower.includes("/")) {
        try {
          const [cidrAddr, prefix] = ipaddr.parseCIDR(lower);
          if (
            cidrAddr.kind() === "ipv6" &&
            (cidrAddr as ipaddr.IPv6).isIPv4MappedAddress()
          ) {
            const v4Addr = (cidrAddr as ipaddr.IPv6).toIPv4Address();
            const v4Prefix = Math.max(0, prefix - 96);
            if (parsed.kind() === "ipv4" && parsed.match([v4Addr, v4Prefix])) {
              return true;
            }
          } else if (parsed.kind() === cidrAddr.kind() && parsed.match([cidrAddr, prefix])) {
            return true;
          }
        } catch {
          // ignore invalid CIDR entry
        }
        continue;
      }
      if (ipaddr.isValid(lower)) {
        const target = ipaddr.process(lower);
        if (
          parsed.kind() === target.kind() &&
          parsed.toNormalizedString() === target.toNormalizedString()
        ) {
          return true;
        }
      }
    }

    return false;
  } catch {
    return false;
  }
}

export function isTrustedProxyPeer(
  req: CsrfRequestLike,
  options?: Pick<CookieCsrfCheckOptions, "trustProxy" | "trustedProxyIps">,
): boolean {
  const appTrustProxy = req.app?.get?.("trust proxy");
  if (appTrustProxy === false || appTrustProxy === 0) {
    return false;
  }

  if (options?.trustProxy !== undefined) {
    const normalized = String(options.trustProxy).trim().toLowerCase();
    if (normalized === "false" || normalized === "0") {
      return false;
    }
  }

  const remoteAddress = req.socket?.remoteAddress ?? req.connection?.remoteAddress;
  if (!remoteAddress || typeof remoteAddress !== "string") {
    return false;
  }

  return isTrustedProxyAddress(remoteAddress, options?.trustedProxyIps);
}

export function isPrivateOrLoopbackIpHost(hostname: string): boolean {
  if (!hostname || typeof hostname !== "string") return false;
  const unwrapped =
    hostname.startsWith("[") && hostname.endsWith("]")
      ? hostname.slice(1, -1)
      : hostname;
  if (!ipaddr.isValid(unwrapped)) {
    return false;
  }
  try {
    const parsed = ipaddr.process(unwrapped);
    const range = parsed.range();
    return (
      range === "loopback" ||
      range === "private" ||
      range === "uniqueLocal" ||
      range === "linkLocal"
    );
  } catch {
    return false;
  }
}

function parseSingleForwardedProto(raw: string | string[] | undefined): "http" | "https" | null {
  if (raw === undefined) return null;
  if (Array.isArray(raw)) {
    if (raw.length !== 1) return null;
    return parseSingleForwardedProto(raw[0]);
  }
  if (typeof raw !== "string") return null;

  const trimmed = raw.trim().toLowerCase();
  if (trimmed === "http" || trimmed === "https") {
    return trimmed;
  }
  return null;
}

export function resolveTrustedForwardedOrigin(
  req: CsrfRequestLike,
  options?: CookieCsrfCheckOptions,
): {
  trustedProxy: boolean;
  forwardedOrigin: string | null;
  malformedForwardedHeader: boolean;
} {
  if (!isTrustedProxyPeer(req, options)) {
    return {
      trustedProxy: false,
      forwardedOrigin: null,
      malformedForwardedHeader: false,
    };
  }

  const headers = req.headers ?? {};
  const rawForwardedHost = headers["x-forwarded-host"];
  if (rawForwardedHost === undefined) {
    return {
      trustedProxy: true,
      forwardedOrigin: null,
      malformedForwardedHeader: false,
    };
  }

  const forwardedHost = parseHostHeaderValue(rawForwardedHost);
  if (!forwardedHost) {
    return {
      trustedProxy: true,
      forwardedOrigin: null,
      malformedForwardedHeader: true,
    };
  }

  const rawProto = headers["x-forwarded-proto"];
  let proto: "http" | "https";
  if (rawProto !== undefined) {
    const parsedProto = parseSingleForwardedProto(rawProto);
    if (!parsedProto) {
      return {
        trustedProxy: true,
        forwardedOrigin: null,
        malformedForwardedHeader: true,
      };
    }
    proto = parsedProto;
  } else {
    proto =
      req.protocol === "http" || req.protocol === "https"
        ? req.protocol
        : req.socket?.encrypted
          ? "https"
          : "http";
  }

  const forwardedOrigin = normalizeOriginUrl(`${proto}://${forwardedHost.host}`);
  return {
    trustedProxy: true,
    forwardedOrigin,
    malformedForwardedHeader: !forwardedOrigin,
  };
}

export function buildAllowedOrigins(
  _req: CsrfRequestLike,
  options?: CookieCsrfCheckOptions,
): Set<string> {
  const allowedOrigins = new Set<string>();

  for (const candidate of options?.allowedOrigins ?? []) {
    const normalized = normalizeOriginUrl(candidate);
    if (normalized) {
      allowedOrigins.add(normalized);
    }
  }

  if (options?.allowLoopbackEquivalence !== false) {
    for (const allowed of Array.from(allowedOrigins)) {
      try {
        const url = new URL(allowed);
        const portSuffix = url.port ? `:${url.port}` : "";
        if (url.hostname === "127.0.0.1") {
          allowedOrigins.add(`${url.protocol}//localhost${portSuffix}`);
        } else if (url.hostname === "localhost") {
          allowedOrigins.add(`${url.protocol}//127.0.0.1${portSuffix}`);
        }
      } catch {
        // ignore invalid URL
      }
    }
  }

  return allowedOrigins;
}

function isOriginPermitted(
  normalizedOrigin: string,
  req: CsrfRequestLike,
  options?: CookieCsrfCheckOptions,
): boolean {
  const allowedOrigins = buildAllowedOrigins(req, options);
  const forwarded = resolveTrustedForwardedOrigin(req, options);

  if (forwarded.malformedForwardedHeader) {
    return false;
  }

  if (allowedOrigins.has(normalizedOrigin)) {
    if (forwarded.trustedProxy && forwarded.forwardedOrigin) {
      return (
        forwarded.forwardedOrigin === normalizedOrigin ||
        allowedOrigins.has(forwarded.forwardedOrigin)
      );
    }
    return true;
  }

  if (options?.allowDevLanSameOrigin !== false) {
    if (!forwarded.trustedProxy || !forwarded.forwardedOrigin) {
      return false;
    }
    if (forwarded.forwardedOrigin !== normalizedOrigin) {
      return false;
    }
    try {
      const originUrl = new URL(normalizedOrigin);
      if (!isPrivateOrLoopbackIpHost(originUrl.hostname)) {
        return false;
      }
      const allowedPorts = new Set<string>(["8080", "3000"]);
      for (const candidate of allowedOrigins) {
        try {
          const parsed = new URL(candidate);
          allowedPorts.add(parsed.port);
        } catch {
          // ignore
        }
      }
      return allowedPorts.has(originUrl.port);
    } catch {
      return false;
    }
  }

  return false;
}

export function assertCookieCsrfSafeRequest(
  req: CsrfRequestLike,
  options?: CookieCsrfCheckOptions,
): void {
  const headers = req.headers ?? {};
  const label = options?.contextLabel === "refresh" ? "refresh" : "mutation";
  const crossSiteMsg = `Cross-site cookie-authenticated ${label} blocked (CSRF protection)`;
  const crossOriginMsg = `Cross-origin cookie-authenticated ${label} blocked (CSRF protection)`;

  const rawSecFetchSite = headers["sec-fetch-site"];
  if (Array.isArray(rawSecFetchSite)) {
    if (
      rawSecFetchSite.length !== 1 ||
      String(rawSecFetchSite[0] || "").trim().toLowerCase() === "cross-site"
    ) {
      throwForbidden(crossSiteMsg, ERROR_CODES.FORBIDDEN, {
        reason: ERROR_REASONS.CSRF_CROSS_SITE_BLOCKED,
      });
    }
  } else if (String(rawSecFetchSite || "").trim().toLowerCase() === "cross-site") {
    throwForbidden(crossSiteMsg, ERROR_CODES.FORBIDDEN, {
      reason: ERROR_REASONS.CSRF_CROSS_SITE_BLOCKED,
    });
  }

  const rawOrigin = headers.origin;
  if (rawOrigin !== undefined) {
    if (Array.isArray(rawOrigin) && rawOrigin.length !== 1) {
      throwForbidden(crossOriginMsg, ERROR_CODES.FORBIDDEN, {
        reason: ERROR_REASONS.CSRF_ORIGIN_MISMATCH,
        origin: rawOrigin.join(", "),
      });
    }

    const originValue = String(Array.isArray(rawOrigin) ? rawOrigin[0] : rawOrigin);
    const normalizedOrigin = normalizeOriginUrl(originValue);
    if (!normalizedOrigin || !isOriginPermitted(normalizedOrigin, req, options)) {
      throwForbidden(crossOriginMsg, ERROR_CODES.FORBIDDEN, {
        reason: ERROR_REASONS.CSRF_ORIGIN_MISMATCH,
        origin: originValue,
      });
    }
    return;
  }

  const rawReferer = headers.referer;
  if (rawReferer !== undefined) {
    if (Array.isArray(rawReferer) && rawReferer.length !== 1) {
      throwForbidden(crossOriginMsg, ERROR_CODES.FORBIDDEN, {
        reason: ERROR_REASONS.CSRF_ORIGIN_MISMATCH,
        origin: rawReferer.join(", "),
      });
    }
    const refererValue = String(Array.isArray(rawReferer) ? rawReferer[0] : rawReferer).trim();
    let refererOrigin: string | null = null;
    try {
      const refUrl = new URL(refererValue);
      if (
        (refUrl.protocol === "http:" || refUrl.protocol === "https:") &&
        !refUrl.username &&
        !refUrl.password
      ) {
        refererOrigin = refUrl.origin.toLowerCase();
      }
    } catch {
      refererOrigin = null;
    }

    if (!refererOrigin || !isOriginPermitted(refererOrigin, req, options)) {
      throwForbidden(crossOriginMsg, ERROR_CODES.FORBIDDEN, {
        reason: ERROR_REASONS.CSRF_ORIGIN_MISMATCH,
        origin: refererValue,
      });
    }
  }
}
