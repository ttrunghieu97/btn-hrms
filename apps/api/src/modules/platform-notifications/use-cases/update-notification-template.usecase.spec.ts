import { NotFoundException } from "@nestjs/common";
import { UpdateNotificationTemplateUseCase } from "./update-notification-template.usecase";

describe("UpdateNotificationTemplateUseCase", () => {
  const mockRepo = () => ({ findTemplateById: jest.fn(), updateTemplate: jest.fn() });

  it("throws when template not found", async () => {
    const repo = mockRepo(); repo.findTemplateById.mockResolvedValue(null);
    const uc = new UpdateNotificationTemplateUseCase(repo as any);
    await expect(uc.execute("x", { name: "new" } as any)).rejects.toThrow(NotFoundException);
  });

  it("updates template", async () => {
    const repo = mockRepo();
    repo.findTemplateById.mockResolvedValue({ id: "t-1" });
    repo.updateTemplate.mockResolvedValue({ id: "t-1", name: "updated" });
    const uc = new UpdateNotificationTemplateUseCase(repo as any);
    const result = await uc.execute("t-1", { name: "updated" } as any);
    expect(result.name).toBe("updated");
    expect(repo.updateTemplate).toHaveBeenCalledWith("t-1", { name: "updated" });
  });
});
