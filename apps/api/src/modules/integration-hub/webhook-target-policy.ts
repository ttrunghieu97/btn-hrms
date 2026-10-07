import * as net from "node:net";
import * as dns from "node:dns/promises";

function parsePatterns(raw: string | undefined): string[] {
  return String(raw || "")
    .split(",")
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Checks whether an IP address belongs to private, loopback, link-local,
 * carrier-grade NAT, cloud metadata, multicast, broadcast, or reserved ranges.
 */
export function isPrivateOrReservedIp(ipAddress: string): boolean {
  let ip = ipAddress.trim().toLowerCase();

  // Strip brackets if IPv6
  if (ip.startsWith("[") && ip.endsWith("]")) {
    ip = ip.slice(1, -1);
  }

  // Handle IPv4-mapped IPv6 (e.g. ::ffff:127.0.0.1)
  if (ip.startsWith("::ffff:")) {
    const rest = ip.slice(7);
    if (net.isIPv4(rest)) {
      ip = rest;
    } else {
      return true; // fail-closed for non-standard mapped v6
    }
  }

  const family = net.isIP(ip);
  if (family === 0) {
    return false;
  }

  if (family === 4) {
    const parts = ip.split(".").map((p) => parseInt(p, 10));
    if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
      return true;
    }
    const b0 = parts[0]!;
    const b1 = parts[1]!;
    const b2 = parts[2]!;
    const b3 = parts[3]!;

    // 0.0.0.0/8 (Broadcast/Unspecified)
    if (b0 === 0) return true;
    // 10.0.0.0/8 (Private network)
    if (b0 === 10) return true;
    // 100.64.0.0/10 (Shared Address Space / CGNAT)
    if (b0 === 100 && b1 !== undefined && b1 >= 64 && b1 <= 127) return true;
    // 127.0.0.0/8 (Loopback)
    if (b0 === 127) return true;
    // 169.254.0.0/16 (Link-local & Cloud Metadata 169.254.169.254)
    if (b0 === 169 && b1 === 254) return true;
    // 172.16.0.0/12 (Private network)
    if (b0 === 172 && b1 !== undefined && b1 >= 16 && b1 <= 31) return true;
    // 192.0.0.0/24 (IETF Protocol Assignments)
    if (b0 === 192 && b1 === 0 && b2 === 0) return true;
    // 192.0.2.0/24 (TEST-NET-1)
    if (b0 === 192 && b1 === 0 && b2 === 2) return true;
    // 192.168.0.0/16 (Private network)
    if (b0 === 192 && b1 === 168) return true;
    // 198.18.0.0/15 (Benchmarking)
    if (b0 === 198 && (b1 === 18 || b1 === 19)) return true;
    // 198.51.100.0/24 (TEST-NET-2)
    if (b0 === 198 && b1 === 51 && b2 === 100) return true;
    // 203.0.113.0/24 (TEST-NET-3)
    if (b0 === 203 && b1 === 0 && b2 === 113) return true;
    // 224.0.0.0/4 (Multicast)
    if (b0 >= 224 && b0 <= 239) return true;
    // 240.0.0.0/4 (Reserved)
    if (b0 >= 240) return true;
    // 255.255.255.255 (Broadcast)
    if (b0 === 255 && b1 === 255 && b2 === 255 && b3 === 255) return true;

    return false;
  }

  if (family === 6) {
    if (ip === "::1" || ip === "0:0:0:0:0:0:0:1") return true;
    if (ip === "::" || ip === "0:0:0:0:0:0:0:0") return true;
    // fc00::/7 (Unique local / private)
    if (/^[fF][cCdD]/.test(ip)) return true;
    // fe80::/10 (Link-local)
    if (/^[fF][eE][89aAbB]/.test(ip)) return true;
    // ff00::/8 (Multicast)
    if (/^[fF][fF]/.test(ip)) return true;
    // 2001:db8::/32 (Documentation)
    if (ip.startsWith("2001:db8:") || ip.startsWith("2001:0db8:")) return true;

    return false;
  }

  return true;
}

export function isPrivateHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\[|\]/g, "");

  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host.endsWith(".lan") ||
    host.endsWith(".corp") ||
    host.endsWith(".home") ||
    host.endsWith(".arpa")
  ) {
    return true;
  }

  // If it's a numeric/hex/literal IP address
  if (isPrivateOrReservedIp(host)) {
    return true;
  }

  return (
    host === "127.0.0.1" ||
    host === "::1" ||
    host.startsWith("10.") ||
    host.startsWith("192.168.") ||
    host.startsWith("169.254.") ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)
  );
}

function isAllowedHost(hostname: string, patterns: string[]): boolean {
  if (!patterns.length) return true;
  return patterns.some((pattern) =>
    hostname === pattern || hostname.endsWith(`.${pattern}`),
  );
}

export function validateOutboundWebhookUrl(targetUrl: string): string {
  let parsed: URL;
  try {
    parsed = new URL(targetUrl);
  } catch {
    throw new Error("Webhook targetUrl must be a valid URL");
  }

  const allowHttp =
    String(process.env.WEBHOOK_ALLOW_INSECURE_HTTP || "false").toLowerCase() ===
    "true";
  if (parsed.protocol !== "https:" && !(allowHttp && parsed.protocol === "http:")) {
    throw new Error("Webhook targetUrl must use HTTPS unless insecure HTTP is explicitly enabled");
  }

  if (parsed.username || parsed.password) {
    throw new Error("Webhook targetUrl must not include embedded credentials");
  }

  if (isPrivateHostname(parsed.hostname)) {
    throw new Error("Webhook targetUrl must not target localhost or private network hosts");
  }

  const allowlist = parsePatterns(process.env.WEBHOOK_TARGET_ALLOWLIST);
  if (!isAllowedHost(parsed.hostname.toLowerCase(), allowlist)) {
    throw new Error("Webhook targetUrl host is not permitted by policy");
  }

  return parsed.toString();
}

/**
 * Resolves DNS for the given target URL and asserts that none of the resolved IPs
 * point to private, loopback, link-local, or cloud metadata addresses (SSRF / DNS rebinding protection).
 */
export async function assertSafeWebhookTarget(targetUrl: string): Promise<void> {
  const validated = validateOutboundWebhookUrl(targetUrl);
  const parsed = new URL(validated);

  if (net.isIP(parsed.hostname)) {
    if (isPrivateOrReservedIp(parsed.hostname)) {
      throw new Error("Webhook target resolves to a private or reserved IP address");
    }
    return;
  }

  try {
    const addresses = await dns.lookup(parsed.hostname, { all: true });
    if (!addresses || addresses.length === 0) {
      throw new Error(`DNS resolution returned no addresses for host: ${parsed.hostname}`);
    }

    for (const record of addresses) {
      if (isPrivateOrReservedIp(record.address)) {
        throw new Error(
          `Webhook target host resolves to private or reserved IP: ${record.address}`,
        );
      }
    }
  } catch (error: any) {
    if (error.message?.includes("resolves to private or reserved IP")) {
      throw error;
    }
    throw new Error(`DNS resolution failed for webhook target host: ${parsed.hostname}`);
  }
}
