const DEFAULT_REDACT_KEYS = [
  "password",
  "passwordHash",
  "token",
  "accessToken",
  "access_token",
  "refreshToken",
  "refresh_token",
  "authorization",
  "cookie",
  "set-cookie",
  "identityNumber",
  "bankAccountNumber",
  "taxCode",
  "identityDate",
  "identityPlace",
  "bankName",
  "personalEmail",
  "emergencyContactName",
  "emergencyContactPhone",
];

export function redactSensitive(
  input: unknown,
  keys: string[] = DEFAULT_REDACT_KEYS,
  maxDepth = 6,
): unknown {
  const seen = new WeakSet();
  const keySet = new Set(keys.map((k) => k.toLowerCase()));

  const walk = (value: any, depth: number): any => {
    if (depth > maxDepth) return "[Truncated]";
    if (value === null || value === undefined) return value;
    if (typeof value !== "object") return value;
    if (seen.has(value)) return "[Circular]";
    seen.add(value);

    if (Array.isArray(value)) {
      return value.map((item) => walk(item, depth + 1));
    }

    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(value)) {
      if (keySet.has(k.toLowerCase())) {
        out[k] = "[REDACTED]";
      } else {
        out[k] = walk(v, depth + 1);
      }
    }
    return out;
  };

  return walk(input, 0);
}

export function clampPayloadSize(input: unknown, maxBytes: number): unknown {
  try {
    const raw = JSON.stringify(input);
    if (raw.length <= maxBytes) return input;
    return `[Truncated ${raw.length} bytes > ${maxBytes} bytes]`;
  } catch {
    return "[Unserializable]";
  }
}
