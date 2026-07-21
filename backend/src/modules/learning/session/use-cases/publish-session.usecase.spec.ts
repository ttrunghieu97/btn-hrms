import { PublishSessionUseCase } from "./publish-session.usecase";

describe(PublishSessionUseCase.name, () => {
  it("publishes a draft session", async () => {
    const repo = {
      findById: jest.fn().mockResolvedValue({
        id: "sess-1", courseId: "c1", status: "draft",
        scheduledAt: new Date("2026-08-01T09:00:00Z"),
      }),
      update: jest.fn().mockResolvedValue({}),
    };
    const eventOutbox = { stage: jest.fn().mockResolvedValue({ id: "out-1" }) };
    const useCase = new PublishSessionUseCase(repo as any, eventOutbox as any);
    await useCase.execute("sess-1");

    expect(repo.update).toHaveBeenCalledWith("sess-1", { status: "published" });
    expect(eventOutbox.stage).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: "learning.session.scheduled.v1" }),
    );
  });

  it("rejects publish of already published session", async () => {
    const repo = {
      findById: jest.fn().mockResolvedValue({ id: "sess-1", status: "published" }),
    };
    const useCase = new PublishSessionUseCase(repo as any, {} as any);
    await expect(useCase.execute("sess-1")).rejects.toThrow("Only draft sessions can be published");
  });
});
