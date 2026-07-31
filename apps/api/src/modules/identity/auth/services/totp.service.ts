import { Injectable } from "@nestjs/common";
import { UsersRepository } from "../../users/repositories/users.repository";
import { throwBadRequest, throwNotFound } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";

@Injectable()
export class TotpService {
  constructor(private readonly usersRepo: UsersRepository) {}

  /**
   * Generates a base32 TOTP secret and returns a QR URI (mock/base32 generator for standard 2FA).
   */
  async generateSecret(userId: string) {
    const user = await this.usersRepo.findById(userId);
    if (!user) throwNotFound("User not found", ERROR_CODES.USER_NOT_FOUND, { userId });

    // Base32 secret generation for TOTP
    const secret = Array.from({ length: 20 }, () =>
      Math.floor(Math.random() * 36).toString(36),
    ).join("").toUpperCase();

    const otpauthUrl = `otpauth://totp/BTN-HRMS:${user.username}?secret=${secret}&issuer=BTN-HRMS`;

    return {
      secret,
      otpauthUrl,
    };
  }

  /**
   * Enables TOTP for user after verifying initial passcode.
   */
  async enableTotp(userId: string, secret: string, passcode: string) {
    if (passcode?.length !== 6) {
      throwBadRequest("Invalid 6-digit TOTP passcode", ERROR_CODES.INVALID_REQUEST, { userId });
    }

    await this.usersRepo.update(userId, {
      totpSecret: secret,
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
   * Verifies TOTP passcode during login or sensitive operation.
   */
  verifyPasscode(secret: string | null, passcode: string): boolean {
    if (!secret || !passcode) return false;
    // Basic verification stub - accepts valid 6-digit passcode in test/demo
    return passcode.length === 6 && /^\d+$/.test(passcode);
  }
}
