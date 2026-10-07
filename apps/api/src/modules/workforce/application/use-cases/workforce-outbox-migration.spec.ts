import { MoveDepartmentWithEventUseCase } from "../../../organization/departments/use-cases/move-department-with-event.usecase";
import { UpdatePositionUseCase } from "../../../organization/positions/use-cases/update-position.usecase";
import { TerminateEmployeeUseCase } from "./terminate-employee.usecase";

describe("Workforce application outbox migration", () => {
  it("stages department moved event to outbox", async () => {
    const repo = {
      findById: jest.fn().mockResolvedValue({ parentId: "old-parent" }),
      reclassifyPosition: jest.fn().mockResolvedValue(undefined),
      update: jest.fn().mockResolvedValue(undefined),
      transaction: jest.fn().mockImplementation(async (fn: any) => fn({})),
    };
    const outbox = { stage: jest.fn().mockResolvedValue({ id: "out-1" }) };
    const useCase = new MoveDepartmentWithEventUseCase(repo as any, outbox as any, {} as any);

    await useCase.execute("dept-1", "new-parent");

    expect(outbox.stage).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: "workforce.department.moved" }),
      expect.anything(),
    );
  });

  it("stages position reclassified event to outbox", async () => {
    const repo = {
      getActive: jest.fn().mockResolvedValue({ id: "pos-1", name: "Old title" }),
      findActiveByTitle: jest.fn().mockResolvedValue(null),
      update: jest.fn().mockResolvedValue(undefined),
      transaction: jest.fn().mockImplementation(async (fn: any) => fn({})),
    };
    const outbox = { stage: jest.fn().mockResolvedValue({ id: "out-1" }) };
    const useCase = new UpdatePositionUseCase(
      repo as any,
      outbox as any,
      {} as any,
      { getDb: () => ({ transaction: (fn: any) => fn({}) }) } as any,
    );

    await useCase.execute("pos-1", { name: "New title" });

    expect(outbox.stage).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: "workforce.position.reclassified" }),
      expect.anything(),
    );
  });

  it("stages employee terminated event to outbox", async () => {
    const employeeRepo = {
      findById: jest.fn().mockResolvedValue({
        id: "emp-1",
        userId: "u-1",
        status: "working",
        endDate: null,
      }),
      updateStatus: jest.fn().mockResolvedValue(undefined),
      updateEmployeeById: jest.fn().mockResolvedValue(undefined),
      transaction: jest.fn().mockImplementation(async (fn: any) => fn({})),
    };
    const contractRepo = {
      getCurrent: jest.fn().mockResolvedValue({ id: "c-1", positionId: "pos-1" }),
      reclassifyPosition: jest.fn().mockResolvedValue(undefined),
      update: jest.fn().mockResolvedValue(undefined),
    };
    const outbox = { stage: jest.fn().mockResolvedValue({ id: "out-1" }) };
    const identityAdmin = {
      deactivateUser: jest.fn().mockResolvedValue(undefined),
      reactivateUser: jest.fn().mockResolvedValue(undefined),
    };
    const lifecycle = {
      executeImmediateTermination: jest.fn().mockResolvedValue(undefined),
    };
    const useCase = new TerminateEmployeeUseCase(
      employeeRepo as any,
      contractRepo as any,
      lifecycle as any,
      outbox as any,
      { get: jest.fn().mockReturnValue({}) } as any,
    );

    await useCase.execute("emp-1", { reason: "Migration", effectiveDate: "2026-06-28" });

    expect(outbox.stage).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: "workforce.employee.terminated.v1" }),
      expect.anything(),
    );
  });
});
