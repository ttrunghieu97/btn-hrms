import { TotpService } from "./totp.service";
import { type UsersRepository } from "../../users/repositories/users.repository";

describe("TotpService", () => {
  let service: TotpService;
  let usersRepo: jest.Mocked<UsersRepository>;

  beforeEach(() => {
    usersRepo = {
      findById: jest.fn(),
      update: jest.fn(),
    } as unknown as jest.Mocked<UsersRepository>;

    service = new TotpService(usersRepo);
  });

  describe("generateSecret", () => {
    it("generates a valid 32-character base32 secret and otpauth URL", async () => {
      usersRepo.findById.mockResolvedValue({
        id: "user-1",
        username: "johndoe",
      } as any);

      const result = await service.generateSecret("user-1");

      expect(result.secret).toBeDefined();
      expect(result.secret.length).toBe(32);
      expect(/^[A-Z2-7]+$/.test(result.secret)).toBe(true);
      expect(result.otpauthUrl).toContain("otpauth://totp/BTN-HRMS:johndoe");
      expect(result.otpauthUrl).toContain(`secret=${result.secret}`);
    });
  });

  describe("verifyPasscode", () => {
    it("validates correct TOTP code generated for current time step", () => {
      // Secret in Base32: 'JBSWY3DPEHPK3PXP' (RFC 4226 test vector hello)
      const secret = "JBSWY3DPEHPK3PXP";
      const currentStep = Math.floor(Date.now() / 1000 / 30);
      const secretBuffer = Buffer.from([0x48, 0x65, 0x6c, 0x6c, 0x6f, 0x21, 0xde, 0xad, 0xbe, 0xef]);
      const validCode = service.generateCodeForStep(secretBuffer, currentStep);

      expect(service.verifyPasscode(secret, validCode)).toBe(true);
    });

    it("accepts valid passcode within ±1 window (drift)", () => {
      const secret = "JBSWY3DPEHPK3PXP";
      const prevStep = Math.floor(Date.now() / 1000 / 30) - 1;
      const secretBuffer = Buffer.from([0x48, 0x65, 0x6c, 0x6c, 0x6f, 0x21, 0xde, 0xad, 0xbe, 0xef]);
      const validPrevCode = service.generateCodeForStep(secretBuffer, prevStep);

      expect(service.verifyPasscode(secret, validPrevCode)).toBe(true);
    });

    it("rejects passcode outside the time window", () => {
      const secret = "JBSWY3DPEHPK3PXP";
      const oldStep = Math.floor(Date.now() / 1000 / 30) - 5;
      const secretBuffer = Buffer.from([0x48, 0x65, 0x6c, 0x6c, 0x6f, 0x21, 0xde, 0xad, 0xbe, 0xef]);
      const oldCode = service.generateCodeForStep(secretBuffer, oldStep);

      expect(service.verifyPasscode(secret, oldCode)).toBe(false);
    });

    it("rejects invalid, malformed, or empty inputs", () => {
      expect(service.verifyPasscode(null, "123456")).toBe(false);
      expect(service.verifyPasscode("JBSWY3DPEHPK3PXP", "")).toBe(false);
      expect(service.verifyPasscode("JBSWY3DPEHPK3PXP", "12345")).toBe(false);
      expect(service.verifyPasscode("JBSWY3DPEHPK3PXP", "abcdef")).toBe(false);
      expect(service.verifyPasscode("INVALID_BASE_32_1890", "123456")).toBe(false);
    });
  });

  describe("enableTotp", () => {
    it("enables TOTP when passcode is verified successfully", async () => {
      const secret = "JBSWY3DPEHPK3PXP";
      const currentStep = Math.floor(Date.now() / 1000 / 30);
      const secretBuffer = Buffer.from([0x48, 0x65, 0x6c, 0x6c, 0x6f, 0x21, 0xde, 0xad, 0xbe, 0xef]);
      const validCode = service.generateCodeForStep(secretBuffer, currentStep);

      const res = await service.enableTotp("user-1", secret, validCode);
      expect(res.enabled).toBe(true);
      expect(usersRepo.update).toHaveBeenCalledWith("user-1", {
        totpSecret: expect.stringMatching(/^enc:/),
        isTotpEnabled: true,
      });

      // Verify that the encrypted secret can be validated by verifyPasscode
      const savedSecret = (usersRepo.update as jest.Mock).mock.calls[0][1].totpSecret;
      expect(service.verifyPasscode(savedSecret, validCode)).toBe(true);
    });

    it("throws bad request when passcode is incorrect", async () => {
      await expect(
        service.enableTotp("user-1", "JBSWY3DPEHPK3PXP", "000000"),
      ).rejects.toThrow();
    });
  });

  describe("disableTotp", () => {
    it("disables TOTP and clears secret in database", async () => {
      const res = await service.disableTotp("user-1");
      expect(res.enabled).toBe(false);
      expect(usersRepo.update).toHaveBeenCalledWith("user-1", {
        totpSecret: null,
        isTotpEnabled: false,
      });
    });
  });
});
