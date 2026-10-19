import { ExecuteScheduledTransfersUseCase } from "./execute-scheduled-transfers.usecase";

describe("ExecuteScheduledTransfersUseCase", () => {
  const workflowEngine = {
    getActiveDefinition: jest.fn(),
    findDueScheduledInstances: jest.fn(),
  };
  const applyTransfer = {
    execute: jest.fn(),
  };
  const requestContext = {
    get: jest.fn().mockReturnValue({ traceId: "t-transfer" }),
  };

  const useCase = new ExecuteScheduledTransfersUseCase(
    workflowEngine as never,
    applyTransfer as never,
    requestContext as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns { processed: 0 } when no active transfer workflow definition exists", async () => {
    workflowEngine.getActiveDefinition.mockResolvedValue(null);

    const res = await useCase.execute(25);

    expect(res).toEqual({ processed: 0 });
    expect(workflowEngine.findDueScheduledInstances).not.toHaveBeenCalled();
  });

  it("processes only active approved due instances and isolates per-instance errors", async () => {
    workflowEngine.getActiveDefinition.mockResolvedValue({ id: "def-transfer" });
    workflowEngine.findDueScheduledInstances.mockResolvedValue([
      {
        id: "inst-1",
        subjectId: "emp-1",
        currentState: "approved",
        status: "active",
      },
      {
        id: "inst-pending",
        subjectId: "emp-2",
        currentState: "pending_approval",
        status: "active",
      },
      {
        id: "inst-fail",
        subjectId: "emp-3",
        currentState: "approved",
        status: "active",
      },
      {
        id: "inst-ok-2",
        subjectId: "emp-4",
        currentState: "approved",
        status: "active",
      },
    ]);

    applyTransfer.execute.mockImplementation(async (instanceId: string) => {
      if (instanceId === "inst-fail") {
        throw new Error("Database lock timeout");
      }
      return { success: true };
    });

    const res = await useCase.execute(50);

    expect(applyTransfer.execute).toHaveBeenCalledTimes(3);
    expect(applyTransfer.execute).toHaveBeenCalledWith("inst-1", true, "emp-1");
    expect(applyTransfer.execute).toHaveBeenCalledWith("inst-fail", true, "emp-3");
    expect(applyTransfer.execute).toHaveBeenCalledWith("inst-ok-2", true, "emp-4");
    expect(res).toEqual({ processed: 2 });
  });
});
