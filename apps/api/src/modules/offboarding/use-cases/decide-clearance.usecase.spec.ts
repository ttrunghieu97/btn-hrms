import { DecideClearanceUseCase } from "./decide-clearance.usecase";

describe(DecideClearanceUseCase.name, () => {
  it("approves a pending clearance", async () => {
    const processReader = { findByIdWithItems: jest.fn().mockResolvedValue({ type: "offboarding" }) };
    const offboardingRepo = {
      findClearanceByProcessAndDepartment: jest.fn().mockResolvedValue({
        id: "clr-1", processId: "proc-1", department: "it", decision: "pending",
      }),
      decideClearance: jest.fn().mockResolvedValue({ id: "clr-1", decision: "approved" }),
    };
    const useCase = new DecideClearanceUseCase(processReader as any, offboardingRepo as any);
    const result = await useCase.execute({
      processId: "proc-1", department: "it", decision: "approved", decidedByUserId: "user-1",
    });

    expect(offboardingRepo.decideClearance).toHaveBeenCalledWith("clr-1", "approved", "user-1", undefined);
    expect(result.decision).toBe("approved");
  });

  it("rejects clearance with required note", async () => {
    const processReader = { findByIdWithItems: jest.fn().mockResolvedValue({ type: "offboarding" }) };
    const offboardingRepo = {
      findClearanceByProcessAndDepartment: jest.fn().mockResolvedValue({
        id: "clr-1", decision: "pending",
      }),
      decideClearance: jest.fn().mockResolvedValue({ id: "clr-1", decision: "rejected" }),
    };
    const useCase = new DecideClearanceUseCase(processReader as any, offboardingRepo as any);
    const result = await useCase.execute({
      processId: "proc-1", department: "it", decision: "rejected", decidedByUserId: "user-1", note: "Missing equipment",
    });

    expect(offboardingRepo.decideClearance).toHaveBeenCalledWith("clr-1", "rejected", "user-1", "Missing equipment");
    expect(result.decision).toBe("rejected");
  });

  it("rejects rejection without note", async () => {
    const processReader = { findByIdWithItems: jest.fn().mockResolvedValue({ type: "offboarding" }) };
    const offboardingRepo = {
      findClearanceByProcessAndDepartment: jest.fn().mockResolvedValue({ id: "clr-1", decision: "pending" }),
    };
    const useCase = new DecideClearanceUseCase(processReader as any, offboardingRepo as any);
    await expect(
      useCase.execute({ processId: "proc-1", department: "it", decision: "rejected", decidedByUserId: "user-1" }),
    ).rejects.toThrow("Rejection requires a note");
  });

  it("rejects re-decision of already decided clearance", async () => {
    const processReader = { findByIdWithItems: jest.fn().mockResolvedValue({ type: "offboarding" }) };
    const offboardingRepo = {
      findClearanceByProcessAndDepartment: jest.fn().mockResolvedValue({
        id: "clr-1", decision: "approved",
      }),
    };
    const useCase = new DecideClearanceUseCase(processReader as any, offboardingRepo as any);
    await expect(
      useCase.execute({ processId: "proc-1", department: "it", decision: "approved", decidedByUserId: "user-1" }),
    ).rejects.toThrow("Clearance already decided");
  });
});
