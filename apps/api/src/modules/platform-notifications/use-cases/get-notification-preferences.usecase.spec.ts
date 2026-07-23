import { GetNotificationPreferencesUseCase } from "./get-notification-preferences.usecase";

describe("GetNotificationPreferencesUseCase", () => {
  it("returns existing preferences", async () => {
    const repo = { findPreferences: jest.fn().mockResolvedValue({ emailEnabled: true }), insertDefaultPreferences: jest.fn() };
    const uc = new GetNotificationPreferencesUseCase(repo as any);
    const result = await uc.execute("user-1");
    expect(result).toBeDefined();
    expect((result as any).emailEnabled).toBe(true);
    expect(repo.insertDefaultPreferences).not.toHaveBeenCalled();
  });

  it("creates default preferences when none exist", async () => {
    const repo = { findPreferences: jest.fn().mockResolvedValue(null), insertDefaultPreferences: jest.fn().mockResolvedValue({ emailEnabled: true, smsEnabled: false }) };
    const uc = new GetNotificationPreferencesUseCase(repo as any);
    const result = await uc.execute("user-1");
    expect(repo.insertDefaultPreferences).toHaveBeenCalledWith("user-1");
    expect((result as any).emailEnabled).toBe(true);
  });
});
