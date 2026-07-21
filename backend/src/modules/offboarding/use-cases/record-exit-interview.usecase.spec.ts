import { RecordExitInterviewUseCase } from "./record-exit-interview.usecase";

describe(RecordExitInterviewUseCase.name, () => {
  it("records responses for a scheduled interview", async () => {
    const processReader = { findByIdWithItems: jest.fn().mockResolvedValue({ type: "offboarding" }) };
    const offboardingRepo = {
      findExitInterviewByProcessId: jest.fn().mockResolvedValue({ id: "ei-1" }),
      recordExitInterview: jest.fn().mockResolvedValue({ id: "ei-1", conductedAt: "2026-08-01T10:00:00Z" }),
    };
    const useCase = new RecordExitInterviewUseCase(processReader as any, offboardingRepo as any);
    const result = await useCase.execute({
      processId: "proc-1",
      responses: { reason: "career change" },
      notes: "Good employee",
    });

    expect(offboardingRepo.recordExitInterview).toHaveBeenCalledWith(
      "ei-1", { reason: "career change" }, "Good employee",
    );
    expect(result.conductedAt).toBeDefined();
  });

  it("rejects recording when no interview scheduled", async () => {
    const processReader = { findByIdWithItems: jest.fn().mockResolvedValue({ type: "offboarding" }) };
    const offboardingRepo = {
      findExitInterviewByProcessId: jest.fn().mockResolvedValue(null),
    };
    const useCase = new RecordExitInterviewUseCase(processReader as any, offboardingRepo as any);
    await expect(
      useCase.execute({ processId: "proc-1" }),
    ).rejects.toThrow("No exit interview scheduled");
  });
});
