import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const ENCRYPTED_PREFIX = "v1:";

const PII_FIELDS = [
  "identityNumber",
  "bankAccountNumber",
  "taxCode",
  "emergencyContactName",
  "emergencyContactPhone",
] as const;

export type PiiFieldName = (typeof PII_FIELDS)[number];

export class EmployeeEncryption {
  private readonly keys: Map<number, Buffer>;
  private readonly activeVersion: number;

  constructor() {
    this.keys = new Map();

    for (let v = 1; v <= 10; v++) {
      const envKey = process.env[`PII_ENCRYPTION_KEY_V${v}`];
      if (envKey && envKey.length >= 32) {
        this.keys.set(v, Buffer.from(envKey.padEnd(32, "0").slice(0, 32), "utf-8"));
      }
    }

    const fallbackKey = process.env.PII_ENCRYPTION_KEY;
    if (fallbackKey && fallbackKey.length >= 32 && this.keys.size === 0) {
      this.keys.set(1, Buffer.from(fallbackKey.padEnd(32, "0").slice(0, 32), "utf-8"));
    }

    if (this.keys.size === 0) {
      throw new Error(
        "PII_ENCRYPTION_KEY or PII_ENCRYPTION_KEY_V* must be set (at least 32 characters)",
      );
    }

    const activeVersionStr = process.env.PII_ENCRYPTION_ACTIVE_VERSION;
    if (activeVersionStr) {
      this.activeVersion = parseInt(activeVersionStr, 10);
      if (!this.keys.has(this.activeVersion)) {
        throw new Error(
          `PII_ENCRYPTION_ACTIVE_VERSION=${this.activeVersion} but key V${this.activeVersion} is not loaded`,
        );
      }
    } else {
      this.activeVersion = Math.max(...this.keys.keys());
    }
  }

  encrypt(plaintext: string): string {
    const key = this.keys.get(this.activeVersion)!;
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, key, iv);
    const encrypted = Buffer.concat([
      cipher.update(plaintext, "utf-8"),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();
    const hex = Buffer.concat([iv, authTag, encrypted]).toString("hex");
    return `${ENCRYPTED_PREFIX}${hex}`;
  }

  decrypt(payload: string): string {
    let version = 1;
    let hex = payload;

    if (payload.startsWith("v") && payload.includes(":")) {
      const colonIdx = payload.indexOf(":");
      version = parseInt(payload.substring(1, colonIdx), 10);
      hex = payload.substring(colonIdx + 1);
    }

    const key = this.keys.get(version);
    if (!key) {
      throw new Error(`Encryption key v${version} not available`);
    }

    const buf = Buffer.from(hex, "hex");
    const iv = buf.subarray(0, IV_LENGTH);
    const authTag = buf.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const ciphertext = buf.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    return decipher.update(ciphertext) + decipher.final("utf-8");
  }

  isEncrypted(value: unknown): value is string {
    return typeof value === "string" && value.startsWith(ENCRYPTED_PREFIX);
  }

  encryptPiiFields(row: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = { ...row };
    for (const field of PII_FIELDS) {
      const value = result[field];
      if (typeof value === "string" && value !== "" && !this.isEncrypted(value)) {
        result[field] = this.encrypt(value);
      }
    }
    return result;
  }

  decryptPiiFields<T>(row: T): T {
    if (!row) return row;
    const input = row as Record<string, unknown>;
    const result: Record<string, unknown> = { ...input };
    for (const field of PII_FIELDS) {
      const value = result[field];
      if (typeof value === "string" && value !== "") {
        if (this.isEncrypted(value)) {
          try {
            result[field] = this.decrypt(value);
          } catch {
            result[field] = null;
          }
        }
      }
    }
    return result as T;
  }

  redactPiiFieldsForResponse<T>(row: T, sensitiveFieldsAllowed: boolean): T {
    if (!row) return row;
    const input = row as Record<string, unknown>;
    const result: Record<string, unknown> = { ...input };
    for (const field of PII_FIELDS) {
      const value = result[field];
      if (typeof value === "string" && value !== "") {
        if (sensitiveFieldsAllowed) {
          if (this.isEncrypted(value)) {
            try {
              result[field] = this.decrypt(value);
            } catch {
              result[field] = null;
            }
          }
        } else {
          result[field] = null;
        }
      }
    }
    return result as T;
  }
}
