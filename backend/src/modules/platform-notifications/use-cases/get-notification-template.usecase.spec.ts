import { NotFoundException } from "@nestjs/common";
import { GetNotificationTemplateUseCase } from "./get-notification-template.usecase";

describe("GetNotificationTemplateUseCase", () => {
  it("throws when template not found", async () => {
    const repo = { findTemplateById: jest.fn().mockResolvedValue(null) };
    const uc = new GetNotificationTemplateUseCase(repo as any);
    await expect(uc.execute("x")).rejects.toThrow(NotFoundException);
  });

  it("returns template", async () => {
    const repo = { findTemplateById: jest.fn().mockResolvedValue({ id: "t-1", name: "welcome" }) };
    const uc = new GetNotificationTemplateUseCase(repo as any);
    const result = await uc.execute("t-1");
    expect(result.id).toBe("t-1");
  });
});
