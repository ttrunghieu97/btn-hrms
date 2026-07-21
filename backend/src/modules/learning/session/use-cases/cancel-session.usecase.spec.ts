import { CancelSessionUseCase } from "./cancel-session.usecase";

describe(CancelSessionUseCase.name, () => {
  it("cancels a published session", async () => {
    const repo = {
      findById: jest.fn().mockResolvedValue({ id: "sess-1", courseId: "c1", status: "published" }),
      update: jest.fn().mockResolvedValue({}),
    };
    const eventOutbox = { stage: jest.fn().mockResolvedValue({ id: "out-1" }) };
    const useCase = new CancelSessionUseCase(repo as any, eventOutbox as any);
    await useCase.execute("sess-1");

    expect(repo.update).toHaveBeenCalledWith("sess-1", { status: "cancelled" });
    expect(eventOutbox.stage).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: "learning.session.cancelled.v1" }),
    );
  });

  it("rejects cancel of already cancelled session", async () => {
    const repo = {
      findById: jest.fn().mockResolvedValue({ id: "sess-1", status: "cancelled" }),
    };
    const useCase = new CancelSessionUseCase(repo as any, {} as any);
    await expect(useCase.execute("sess-1")).rejects.toThrow("Already cancelled");
  });

  it("rejects cancel of non-existent session", async () => {
    const repo = { findById: jest.fn().mockResolvedValue(null) };
    const useCase = new CancelSessionUseCase(repo as any, {} as any);
    await expect(useCase.execute("sess-1")).rejects.toThrow("Session not found");
  });
});
