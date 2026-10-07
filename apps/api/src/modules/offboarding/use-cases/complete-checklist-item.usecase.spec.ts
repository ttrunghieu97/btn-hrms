import { CompleteChecklistItemUseCase } from "./complete-checklist-item.usecase";

describe(CompleteChecklistItemUseCase.name, () => {
  const pendingProcess = {
    type: "offboarding", status: "pending", employeeId: "emp-1",
    checklistItems: [
      { id: "ci-1", title: "Return laptop", mandatory: true, status: "pending" },
      { id: "ci-2", title: "Exit interview", mandatory: false, status: "pending" },
    ],
  };

  it("completes a checklist item and advances process to in_progress", async () => {
    const processReader = { findByIdWithItems: jest.fn().mockResolvedValue(pendingProcess) };
    const offboardingRepo = {
      updateChecklistItemStatus: jest.fn().mockResolvedValue(undefined),
      updateProcessStatus: jest.fn().mockResolvedValue(undefined),
    };
    const useCase = new CompleteChecklistItemUseCase(processReader as any, offboardingRepo as any);
    const result = await useCase.execute("proc-1", "ci-1", "user-1", false);

    expect(offboardingRepo.updateChecklistItemStatus).toHaveBeenCalledWith("ci-1", "completed", "user-1");
    expect(offboardingRepo.updateProcessStatus).toHaveBeenCalledWith("proc-1", "in_progress");
    expect(result.status).toBe("completed");
  });

  it("skips a non-mandatory item without advancing process", async () => {
    const processReader = {
      findByIdWithItems: jest.fn().mockResolvedValue({
        ...pendingProcess, status: "in_progress",
      }),
    };
    const offboardingRepo = { updateChecklistItemStatus: jest.fn() };
    const useCase = new CompleteChecklistItemUseCase(processReader as any, offboardingRepo as any);
    const result = await useCase.execute("proc-1", "ci-2", "user-1", true);

    expect(offboardingRepo.updateChecklistItemStatus).toHaveBeenCalledWith("ci-2", "skipped", undefined);
    expect(result.status).toBe("skipped");
  });

  it("rejects skip of mandatory item", async () => {
    const processReader = { findByIdWithItems: jest.fn().mockResolvedValue(pendingProcess) };
    const useCase = new CompleteChecklistItemUseCase(processReader as any, {} as any);
    await expect(
      useCase.execute("proc-1", "ci-1", "user-1", true),
    ).rejects.toThrow("Cannot skip a mandatory checklist item");
  });

  it("rejects when process type is not offboarding", async () => {
    const processReader = {
      findByIdWithItems: jest.fn().mockResolvedValue({ type: "onboarding" }),
    };
    const useCase = new CompleteChecklistItemUseCase(processReader as any, {} as any);
    await expect(
      useCase.execute("proc-1", "ci-1", "user-1", false),
    ).rejects.toThrow("Offboarding process not found");
  });
});
