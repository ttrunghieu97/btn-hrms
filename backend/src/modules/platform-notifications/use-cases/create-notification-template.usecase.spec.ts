import { BadRequestException } from "@nestjs/common";
import { CreateNotificationTemplateUseCase } from "./create-notification-template.usecase";

describe("CreateNotificationTemplateUseCase", () => {
  it("creates template", async () => {
    const repo = { findTemplateByName: jest.fn().mockResolvedValue(null), insertTemplate: jest.fn().mockResolvedValue({ id: "t-1" }) };
    const uc = new CreateNotificationTemplateUseCase(repo as any);
    const result = await uc.execute({ name: "welcome", type: "in_app", subject: "Welcome", body: "Hello {{name}}" } as any);
    expect(result.id).toBe("t-1");
  });

  it("throws on duplicate name", async () => {
    const repo = { findTemplateByName: jest.fn().mockResolvedValue({ id: "existing" }) };
    const uc = new CreateNotificationTemplateUseCase(repo as any);
    await expect(uc.execute({ name: "welcome" } as any)).rejects.toThrow(BadRequestException);
  });
});
