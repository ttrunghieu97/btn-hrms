import { GetOffboardingUseCase } from "./get-offboarding.usecase";

describe(GetOffboardingUseCase.name, () => {
  it("returns full offboarding detail with clearances, settlement, interview", async () => {
    const processReader = {
      findByIdWithItems: jest.fn().mockResolvedValue({
        id: "proc-1", employeeId: "emp-1", templateId: "tmpl-1",
        type: "offboarding", status: "in_progress",
        startDate: "2026-07-01", targetEndDate: null,
        completedAt: null,
        checklistItems: [
          { id: "ci-1", title: "Return laptop", mandatory: true, status: "completed",
            dueDate: null, isCompleted: true, completedAt: new Date(), completedByUserID: "user-1" },
        ],
        createdAt: new Date(), updatedAt: new Date(),
      }),
    };
    const offboardingRepo = {
      findClearancesByProcessId: jest.fn().mockResolvedValue([
        { id: "clr-1", processId: "proc-1", department: "it", decision: "approved",
          decidedByUserId: "user-1", note: null, decidedAt: new Date().toISOString(),
          createdAt: new Date(), updatedAt: new Date() },
      ]),
      findSettlementByProcessId: jest.fn().mockResolvedValue({
        id: "stl-1", processId: "proc-1", employeeId: "emp-1",
        status: "pending", payrollRef: null, createdAt: new Date(), updatedAt: new Date(),
      }),
      findExitInterviewByProcessId: jest.fn().mockResolvedValue({
        id: "ei-1", scheduledAt: new Date("2026-08-01"), conductedAt: null,
      }),
    };
    const useCase = new GetOffboardingUseCase(processReader as any, offboardingRepo as any);
    const result = await useCase.execute("proc-1");

    expect(result.type).toBe("offboarding");
    expect(result.clearances).toHaveLength(1);
    expect(result.clearances[0]!.department).toBe("it");
    expect(result.settlement).toBeDefined();
    expect(result.settlement!.status).toBe("pending");
    expect(result.exitInterview).toBeDefined();
    expect(result.checklistItems).toHaveLength(1);
  });

  it("throws when process is not offboarding", async () => {
    const processReader = { findByIdWithItems: jest.fn().mockResolvedValue({ type: "onboarding" }) };
    const useCase = new GetOffboardingUseCase(processReader as any, {} as any);
    await expect(useCase.execute("proc-1")).rejects.toThrow("Offboarding process not found");
  });
});
