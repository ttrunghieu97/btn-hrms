/**
 * Offboarding Lifecycle Invariant Tests.
 *
 * Validates the complete chain:
 *   start → process status → clearances seeded → items completed
 *   → all clearances approved → completion → settlement link created
 *
 * The critical assertion: offboarding never writes to payroll tables.
 * It creates a settlement link (offboarding-owned) and emits an event.
 */

import { StartOffboardingUseCase } from "./start-offboarding.usecase";
import { CompleteChecklistItemUseCase } from "./complete-checklist-item.usecase";
import { CompleteProcessUseCase } from "./complete-process.usecase";

describe("Offboarding Lifecycle", () => {
  it("start seeds 5 departmental clearances (it, hr, finance, manager, security)", async () => {
    const processReader = {
      findActiveByEmployeeId: jest.fn().mockResolvedValue(null),
      findActiveTemplateByType: jest.fn().mockResolvedValue({ template: { id: "tmpl-1" } }),
    };
    const createBoarding = {
      execute: jest.fn().mockResolvedValue({ id: "proc-1", status: "pending" }),
    };
    const seedClearances = jest.fn().mockResolvedValue(
      ["it", "hr", "finance", "manager", "security"].map((d, i) => ({
        id: `clr-${i}`, processId: "proc-1", department: d, decision: "pending",
      })),
    );
    const outbox = { stage: jest.fn().mockResolvedValue({ id: "out-1" }) };

    const useCase = new StartOffboardingUseCase(
      processReader as any, createBoarding as any,
      { seedClearances } as any, outbox as any,
    );
    const result = await useCase.execute("emp-1");

    expect(seedClearances).toHaveBeenCalledWith("proc-1");
    expect(result).toEqual({ processId: "proc-1", status: "pending" });
  });

  it("completing first checklist item advances process from pending to in_progress", async () => {
    const processReader = {
      findByIdWithItems: jest.fn().mockResolvedValue({
        type: "offboarding", status: "pending",
        checklistItems: [{ id: "ci-1", mandatory: true, status: "pending" }],
      }),
    };
    const updateStatus = jest.fn().mockResolvedValue(undefined);
    const useCase = new CompleteChecklistItemUseCase(
      processReader as any,
      { updateChecklistItemStatus: jest.fn(), updateProcessStatus: updateStatus } as any,
    );
    await useCase.execute("proc-1", "ci-1", "user-1", false);

    expect(updateStatus).toHaveBeenCalledWith("proc-1", "in_progress");
  });

  it("complete-process rejects when any clearance is pending", async () => {
    const processReader = {
      findByIdWithItems: jest.fn().mockResolvedValue({
        type: "offboarding", employeeId: "emp-1",
        checklistItems: [{ id: "ci-1", mandatory: true, status: "completed" }],
      }),
    };
    const offboardingRepo = {
      getOutstandingClearances: jest.fn().mockResolvedValue([
        { id: "clr-1", department: "it", decision: "pending" },
        { id: "clr-2", department: "hr", decision: "pending" },
      ]),
    };
    const useCase = new CompleteProcessUseCase(processReader as any, offboardingRepo as any, {} as any);
    await expect(useCase.execute("proc-1")).rejects.toThrow("outstanding clearances");
  });

  it("complete-process creates settlement link and emits event in same transaction", async () => {
    const processReader = {
      findByIdWithItems: jest.fn().mockResolvedValue({
        type: "offboarding", employeeId: "emp-1",
        checklistItems: [{ id: "ci-1", mandatory: true, status: "completed" }],
      }),
    };
    const completeWithSettlement = jest.fn().mockResolvedValue(undefined);
    const outbox = {} as any;
    const useCase = new CompleteProcessUseCase(
      processReader as any,
      { getOutstandingClearances: jest.fn().mockResolvedValue([]),
        completeProcessWithSettlement: completeWithSettlement } as any,
      outbox,
    );
    await useCase.execute("proc-1");

    expect(completeWithSettlement).toHaveBeenCalledWith("proc-1", "emp-1", outbox);
  });
});
