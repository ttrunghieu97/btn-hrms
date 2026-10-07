import { Injectable, Optional } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as crypto from "node:crypto";
import { UsersRepository } from "../../users/repositories/users.repository";
import { throwBadRequest, throwNotFound } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const TOTP_CIPHER_ALGORITHM = "aes-256-gcm";
const TOTP_IV_LENGTH = 12;

function base32Encode(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = "";

  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i]!;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return output;
}

function base32Decode(str: string): Buffer {
  const cleanStr = str.replace(/=+$/, "").toUpperCase();
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (let i = 0; i < cleanStr.length; i++) {
    const val = BASE32_ALPHABET.indexOf(cleanStr[i]!);
    if (val === -1) continue;
    value = (value << 5) | val;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
}

@Injectable()
export class TotpService {
  private readonly encryptionKey: Buffer;

  constructor(
    private readonly usersRepo: UsersRepository,
    @Optional() private readonly configService?: ConfigService,
  ) {
    const rawKey =
      this.configService?.get<string>("TOTP_ENCRYPTION_KEY") ||
      this.configService?.get<string>("AUTH_JWT_SECRET") ||
      process.env.TOTP_ENCRYPTION_KEY ||
      process.env.AUTH_JWT_SECRET ||
      "btn-hrms-totp-default-encryption-secret-key-32";
    this.encryptionKey = crypto.createHash("sha256").update(rawKey).digest();
  }

  encryptSecret(secret: string): string {
    const iv = crypto.randomBytes(TOTP_IV_LENGTH);
    const cipher = crypto.createCipheriv(TOTP_CIPHER_ALGORITHM, this.encryptionKey, iv);
    const encrypted = Buffer.concat([cipher.update(secret, "utf-8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `enc:${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
  }

  decryptSecret(payload: string): string {
    if (!payload.startsWith("enc:")) {
      return payload; // backward compatibility with legacy unencrypted secrets
    }
    const parts = payload.split(":");
    if (parts.length !== 4) return payload;
    try {
      const iv = Buffer.from(parts[1]!, "hex");
      const tag = Buffer.from(parts[2]!, "hex");
      const ciphertext = Buffer.from(parts[3]!, "hex");
      const decipher = crypto.createDecipheriv(TOTP_CIPHER_ALGORITHM, this.encryptionKey, iv);
      decipher.setAuthTag(tag);
      return decipher.update(ciphertext) + decipher.final("utf-8");
    } catch {
      return payload;
    }
  }

  /**
   * Generates a cryptographically secure 160-bit RFC 6238 Base32 TOTP secret.
   */
  async generateSecret(userId: string) {
    const user = await this.usersRepo.findById(userId);
    if (!user) throwNotFound("User not found", ERROR_CODES.USER_NOT_FOUND, { userId });

    const rawBytes = crypto.randomBytes(20);
    const secret = base32Encode(rawBytes);
    const otpauthUrl = `otpauth://totp/BTN-HRMS:${encodeURIComponent(user.username)}?secret=${secret}&issuer=BTN-HRMS`;

    return {
      secret,
      otpauthUrl,
    };
  }

  /**
   * Enables TOTP for user after validating the provided passcode with the generated secret.
   */
  async enableTotp(userId: string, secret: string, passcode: string) {
    if (!passcode || passcode.length !== 6 || !/^\d{6}$/.test(passcode)) {
      throwBadRequest("Invalid 6-digit TOTP passcode format", ERROR_CODES.INVALID_REQUEST, { userId });
    }

    const isValid = this.verifyPasscode(secret, passcode);
    if (!isValid) {
      throwBadRequest("Invalid TOTP passcode. Verification failed.", ERROR_CODES.INVALID_REQUEST, { userId });
    }

    await this.usersRepo.update(userId, {
      totpSecret: this.encryptSecret(secret),
      isTotpEnabled: true,
    });

    return { enabled: true };
  }

  /**
   * Disables TOTP 2FA for user.
   */
  async disableTotp(userId: string) {
    await this.usersRepo.update(userId, {
      totpSecret: null,
      isTotpEnabled: false,
    });

    return { enabled: false };
  }

  /**
   * Generates the expected 6-digit TOTP code for a specific timestamp step.
   */
  generateCodeForStep(secretBuffer: Buffer, step: number): string {
    const counterBuf = Buffer.alloc(8);
    counterBuf.writeBigInt64BE(BigInt(step));

    const hmac = crypto.createHmac("sha1", secretBuffer).update(counterBuf).digest();
    const offset = hmac[hmac.length - 1]! & 0x0f;
    const binary =
      ((hmac[offset]! & 0x7f) << 24) |
      ((hmac[offset + 1]! & 0xff) << 16) |
      ((hmac[offset + 2]! & 0xff) << 8) |
      (hmac[offset + 3]! & 0xff);

    const otp = binary % 1000000;
    return otp.toString().padStart(6, "0");
  }

  /**
   * Verifies TOTP passcode following RFC 6238 with a ±1 window (30-second drift).
   */
  verifyPasscode(secret: string | null, passcode: string, window = 1): boolean {
    if (!secret || !passcode || !/^\d{6}$/.test(passcode)) return false;

    const plainSecret = this.decryptSecret(secret);
    const secretBuffer = base32Decode(plainSecret);
    if (secretBuffer.length === 0) return false;

    const currentStep = Math.floor(Date.now() / 1000 / 30);

    for (let i = -window; i <= window; i++) {
      const expected = this.generateCodeForStep(secretBuffer, currentStep + i);
      const expectedBuf = Buffer.from(expected);
      const passBuf = Buffer.from(passcode);
      if (expectedBuf.length === passBuf.length && crypto.timingSafeEqual(expectedBuf, passBuf)) {
        return true;
      }
    }

    return false;
  }
}
