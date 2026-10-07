import { ScheduleExitInterviewUseCase } from "./schedule-exit-interview.usecase";

describe(ScheduleExitInterviewUseCase.name, () => {
  it("creates a new exit interview when none scheduled", async () => {
    const processReader = { findByIdWithItems: jest.fn().mockResolvedValue({ type: "offboarding" }) };
    const offboardingRepo = {
      findScheduledExitInterview: jest.fn().mockResolvedValue(null),
      createExitInterview: jest.fn().mockResolvedValue({ id: "ei-1" }),
    };
    const useCase = new ScheduleExitInterviewUseCase(processReader as any, offboardingRepo as any);
    const result = await useCase.execute({
      processId: "proc-1", employeeId: "emp-1",
      interviewerUserId: "user-1", scheduledAt: "2026-08-01T10:00:00Z",
    });

    expect(offboardingRepo.createExitInterview).toHaveBeenCalledWith(
      "proc-1", "emp-1", "user-1", "2026-08-01T10:00:00Z",
    );
    expect(result.id).toBe("ei-1");
  });

  it("reschedules existing unconducted interview", async () => {
    const processReader = { findByIdWithItems: jest.fn().mockResolvedValue({ type: "offboarding" }) };
    const offboardingRepo = {
      findScheduledExitInterview: jest.fn().mockResolvedValue({ id: "ei-1" }),
      updateExitInterview: jest.fn().mockResolvedValue(undefined),
    };
    const useCase = new ScheduleExitInterviewUseCase(processReader as any, offboardingRepo as any);
    const result = await useCase.execute({
      processId: "proc-1", employeeId: "emp-1",
      interviewerUserId: "user-2", scheduledAt: "2026-08-02T10:00:00Z",
    });

    expect(offboardingRepo.updateExitInterview).toHaveBeenCalledWith(
      "ei-1", "user-2", "2026-08-02T10:00:00Z",
    );
    expect(result.id).toBe("ei-1");
  });

  it("rejects when process type is not offboarding", async () => {
    const processReader = { findByIdWithItems: jest.fn().mockResolvedValue({ type: "onboarding" }) };
    const useCase = new ScheduleExitInterviewUseCase(processReader as any, {} as any);
    await expect(
      useCase.execute({ processId: "proc-1", employeeId: "emp-1", interviewerUserId: "user-1", scheduledAt: "2026-08-01T10:00:00Z" }),
    ).rejects.toThrow("Offboarding process not found");
  });
});
