import { PendingEmployeeVerificationValidator } from "./period-close-validators";
import { registerCloseValidator, PERIOD_CLOSE_VALIDATORS } from "./period-lock.service";

describe("PendingEmployeeVerificationValidator", () => {
  it("blocks close when unverified employees remain", async () => {
    const repo = {
      countUnverifiedInPeriod: jest.fn().mockResolvedValue(3),
    };

    const validator = new PendingEmployeeVerificationValidator(repo as any);
    validator.onModuleInit();

    const reason = await PERIOD_CLOSE_VALIDATORS[PERIOD_CLOSE_VALIDATORS.length - 1]!("2026-07");
    expect(reason).toBe("Period has 3 employee(s) not yet verified");
  });

  it("passes when all employees verified", async () => {
    const repo = {
      countUnverifiedInPeriod: jest.fn().mockResolvedValue(0),
    };

    const validator = new PendingEmployeeVerificationValidator(repo as any);
    validator.onModuleInit();

    const reason = await PERIOD_CLOSE_VALIDATORS[PERIOD_CLOSE_VALIDATORS.length - 1]!("2026-07");
    expect(reason).toBeNull();
  });
});
