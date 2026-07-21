function parsePatterns(raw: string | undefined) {
  return String(raw || "")
    .split(",")
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);
}

function isPrivateHostname(hostname: string) {
  const host = hostname.toLowerCase();
  return (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "::1" ||
    host.startsWith("10.") ||
    host.startsWith("192.168.") ||
    host.startsWith("169.254.") ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)
  );
}

function isAllowedHost(hostname: string, patterns: string[]) {
  if (!patterns.length) return true;
  return patterns.some((pattern) =>
    hostname === pattern || hostname.endsWith(`.${pattern}`),
  );
}

export function validateOutboundWebhookUrl(targetUrl: string) {
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
