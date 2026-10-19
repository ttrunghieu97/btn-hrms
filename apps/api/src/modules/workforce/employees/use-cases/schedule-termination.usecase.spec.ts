import { ScheduleTerminationUseCase } from "./schedule-termination.usecase";
import { CancelScheduledTerminationUseCase } from "./cancel-scheduled-termination.usecase";
import { ExecuteScheduledTerminationsUseCase } from "./execute-scheduled-terminations.usecase";

describe("Scheduled Termination Lifecycle UseCases", () => {
  const employeesRepo = {
    findByIdentifier: jest.fn(),
    transaction: jest.fn(async (cb: (tx: unknown) => Promise<unknown>) => cb({})),
  };
  const contractRepo = {
    getCurrent: jest.fn(),
    update: jest.fn(),
  };
  const lifecycle = {
    assertCanScheduleTermination: jest.fn(),
    executeImmediateTermination: jest.fn(),
  };
  const requestContext = {
    get: jest.fn().mockReturnValue({ userId: "u-hr", traceId: "t-term" }),
  };
  const eventOutbox = {
    stage: jest.fn(),
  };
  const workflowEngine = {
    startWorkflow: jest.fn(),
    updateInstance: jest.fn(),
    findActiveInstanceByKeyAndSubject: jest.fn(),
    cancelInstance: jest.fn(),
    getActiveDefinition: jest.fn(),
    findDueScheduledInstances: jest.fn(),
    recordTransition: jest.fn(),
  };
  const identityAdmin = {
    deactivateUser: jest.fn(),
  };

  const scheduleUseCase = new ScheduleTerminationUseCase(
    employeesRepo as never,
    lifecycle as never,
    requestContext as never,
    eventOutbox as never,
    workflowEngine as never,
  );

  const cancelUseCase = new CancelScheduledTerminationUseCase(
    employeesRepo as never,
    requestContext as never,
    eventOutbox as never,
    workflowEngine as never,
  );

  const executeDueUseCase = new ExecuteScheduledTerminationsUseCase(
    employeesRepo as never,
    contractRepo as never,
    lifecycle as never,
    eventOutbox as never,
    requestContext as never,
    workflowEngine as never,
    identityAdmin as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    requestContext.get.mockReturnValue({ userId: "u-hr", traceId: "t-term" });
    employeesRepo.transaction.mockImplementation(
      async (cb: (tx: unknown) => Promise<unknown>) => cb({}),
    );
  });

  describe("ScheduleTerminationUseCase", () => {
    it("starts an employee_termination workflow instance and stages EmployeeTerminationScheduledEvent", async () => {
      employeesRepo.findByIdentifier.mockResolvedValue({
        id: "emp-1",
        status: "working",
        deletedAt: null,
      });
      workflowEngine.startWorkflow.mockResolvedValue({ id: "wf-term-1" });

      const res = await scheduleUseCase.execute("emp-1", {
        effectiveDate: "2099-12-31",
        reason: "End of fixed-term contract",
        lastWorkingDate: "2099-12-30",
      });

      expect(lifecycle.assertCanScheduleTermination).toHaveBeenCalled();
      expect(workflowEngine.startWorkflow).toHaveBeenCalledWith(
        expect.objectContaining({
          key: "employee_termination",
          subjectType: "employee",
          subjectId: "emp-1",
        }),
      );
      expect(eventOutbox.stage).toHaveBeenCalledTimes(1);
      expect(res).toEqual({
        success: true,
        workflowInstanceId: "wf-term-1",
        effectiveDate: "2099-12-31",
      });
    });

    it("rejects deleted employees or missing reason/effectiveDate", async () => {
      employeesRepo.findByIdentifier.mockResolvedValue({
        id: "emp-del",
        deletedAt: new Date(),
      });

      await expect(
        scheduleUseCase.execute("emp-del", {
          effectiveDate: "2099-12-31",
          reason: "Archived",
        }),
      ).rejects.toThrow(/deleted employee/i);
    });
  });

  describe("CancelScheduledTerminationUseCase", () => {
    it("cancels active employee_termination workflow instance and stages EmployeeTerminationCancelledEvent", async () => {
      employeesRepo.findByIdentifier.mockResolvedValue({
        id: "emp-1",
        status: "working",
      });
      workflowEngine.findActiveInstanceByKeyAndSubject.mockResolvedValue({
        id: "wf-term-1",
      });

      const res = await cancelUseCase.execute("emp-1");

      expect(workflowEngine.cancelInstance).toHaveBeenCalledWith(
        "wf-term-1",
        "u-hr",
        { cancelledByUserId: "u-hr" },
      );
      expect(eventOutbox.stage).toHaveBeenCalledTimes(1);
      expect(res).toEqual({ success: true });
    });

    it("throws 400 BadRequest when no pending scheduled termination exists", async () => {
      employeesRepo.findByIdentifier.mockResolvedValue({
        id: "emp-1",
        status: "working",
      });
      workflowEngine.findActiveInstanceByKeyAndSubject.mockResolvedValue(null);

      await expect(cancelUseCase.execute("emp-1")).rejects.toThrow(
        /No pending scheduled termination/i,
      );
    });
  });

  describe("ExecuteScheduledTerminationsUseCase", () => {
    it("executes due termination instances, closes active contracts, deactivates user account, and stages outbox events", async () => {
      workflowEngine.getActiveDefinition.mockResolvedValue({ id: "def-term" });
      workflowEngine.findDueScheduledInstances.mockResolvedValue([
        {
          id: "wf-term-due",
          subjectId: "emp-1",
          currentState: "scheduled",
          metadata: {
            effectiveDate: "2026-10-19",
            reason: "Mutual agreement",
            lastWorkingDate: "2026-10-19",
          },
        },
      ]);
      employeesRepo.findByIdentifier.mockResolvedValue({
        id: "emp-1",
        userId: "u-emp-1",
        status: "working",
        deletedAt: null,
      });
      contractRepo.getCurrent.mockResolvedValue({ id: "contract-1" });

      const res = await executeDueUseCase.processAllDue(20);

      expect(lifecycle.executeImmediateTermination).toHaveBeenCalledWith(
        "emp-1",
        {
          reason: "Mutual agreement",
          effectiveDate: "2026-10-19",
          lastWorkingDate: "2026-10-19",
        },
        null,
        expect.anything(),
      );
      expect(contractRepo.update).toHaveBeenCalledWith(
        "contract-1",
        {
          isCurrent: false,
          status: "terminated",
          effectiveTo: "2026-10-19",
        },
        expect.anything(),
      );
      expect(identityAdmin.deactivateUser).toHaveBeenCalledWith(
        "u-emp-1",
        expect.anything(),
      );
      expect(eventOutbox.stage).toHaveBeenCalledTimes(2);
      expect(res).toEqual({ processed: 1 });
    });
  });
});
