import { CompleteProcessUseCase } from "./complete-process.usecase";

describe(CompleteProcessUseCase.name, () => {
  const completedChecklist = [
    { id: "ci-1", title: "Return laptop", mandatory: true, status: "completed" },
    { id: "ci-2", title: "Exit interview", mandatory: false, status: "skipped" },
  ];

  it("completes process when all clearances approved and mandatory items done", async () => {
    const processReader = {
      findByIdWithItems: jest.fn().mockResolvedValue({
        type: "offboarding", employeeId: "emp-1", checklistItems: completedChecklist,
      }),
    };
    const offboardingRepo = {
      getOutstandingClearances: jest.fn().mockResolvedValue([]),
      completeProcessWithSettlement: jest.fn().mockResolvedValue(undefined),
    };
    const outbox = {} as any;
    const useCase = new CompleteProcessUseCase(processReader as any, offboardingRepo as any, outbox);
    const result = await useCase.execute("proc-1");

    expect(offboardingRepo.completeProcessWithSettlement).toHaveBeenCalledWith("proc-1", "emp-1", outbox);
    expect(result.status).toBe("completed");
  });

  it("rejects completion when clearances outstanding", async () => {
    const processReader = {
      findByIdWithItems: jest.fn().mockResolvedValue({
        type: "offboarding", employeeId: "emp-1", checklistItems: completedChecklist,
      }),
    };
    const offboardingRepo = {
      getOutstandingClearances: jest.fn().mockResolvedValue([
        { id: "clr-1", department: "it", decision: "pending" },
      ]),
    };
    const useCase = new CompleteProcessUseCase(processReader as any, offboardingRepo as any, {} as any);
    await expect(useCase.execute("proc-1")).rejects.toThrow("outstanding clearances");
  });

  it("rejects completion when mandatory checklist items incomplete", async () => {
    const processReader = {
      findByIdWithItems: jest.fn().mockResolvedValue({
        type: "offboarding", employeeId: "emp-1",
        checklistItems: [
          { id: "ci-1", title: "Return laptop", mandatory: true, status: "pending" },
        ],
      }),
    };
    const offboardingRepo = {
      getOutstandingClearances: jest.fn().mockResolvedValue([]),
    };
    const useCase = new CompleteProcessUseCase(processReader as any, offboardingRepo as any, {} as any);
    await expect(useCase.execute("proc-1")).rejects.toThrow("mandatory checklist items incomplete");
  });

  it("rejects completion when process not found", async () => {
    const processReader = { findByIdWithItems: jest.fn().mockResolvedValue(null) };
    const useCase = new CompleteProcessUseCase(processReader as any, {} as any, {} as any);
    await expect(useCase.execute("proc-1")).rejects.toThrow("Offboarding process not found");
  });
});
