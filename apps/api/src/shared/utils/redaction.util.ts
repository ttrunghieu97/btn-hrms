export const DEFAULT_REDACT_KEYS = [
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
  "secret",
  "clientSecret",
  "webhookSecret",
  "identityNumber",
  "bankAccountNumber",
  "taxCode",
  "identityDate",
  "identityPlace",
  "bankName",
  "personalEmail",
  "emergencyContactName",
  "emergencyContactPhone",
  "salary",
  "baseSalary",
  "bonus",
  "deduction",
  "deductions",
  "totalDeductions",
  "allowance",
  "allowances",
  "overtimeAmount",
  "taxAmount",
  "insuranceAmount",
  "netSalary",
  "grossPay",
  "netPay",
  "proratedSalary",
  "hourlyRate",
  "salaryComponents",
  "compensation",
  "insuranceNumber",
  "socialInsuranceNumber",
  "totalGross",
  "totalNet",
  "grossAmount",
  "netAmount",
  "salaryCap",
];

export function normalizeRedactKey(key: string): string {
  return key.toLowerCase().replace(/[_-\s]/g, "");
}

export function redactSensitive(
  input: unknown,
  keys: string[] = DEFAULT_REDACT_KEYS,
  maxDepth = 6,
): unknown {
  const seen = new WeakSet();
  const keySet = new Set(keys.map(normalizeRedactKey));

  const walk = (value: any, depth: number): any => {
    if (depth > maxDepth) return "[Truncated]";
    if (value === null || value === undefined) return value;
    if (typeof value !== "object") return value;
    if (seen.has(value)) return "[Circular]";
    seen.add(value);

    if (Array.isArray(value)) {
      return value.map((item) => walk(item, depth + 1));
    }

    const isValidationErrorLike =
      typeof value.property === "string" &&
      ("constraints" in value || "children" in value || "target" in value);

    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(value)) {
      if (isValidationErrorLike && k === "target") {
        out[k] = "[REDACTED]";
      } else if (
        isValidationErrorLike &&
        k === "value" &&
        keySet.has(normalizeRedactKey(value.property))
      ) {
        out[k] = "[REDACTED]";
      } else if (keySet.has(normalizeRedactKey(k))) {
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
