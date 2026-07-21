import {
  OvertimeWorkflowService,
  OvertimeStatus,
} from "./overtime-workflow.service";

describe("OvertimeWorkflowService", () => {
  let service: OvertimeWorkflowService;
  let repo: any;
  let payrollLock: any;

  beforeEach(() => {
    repo = {
      findByEmployeeAndDate: jest.fn(),
      create: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      transaction: jest.fn().mockImplementation(async (fn) => fn(undefined)),
    };
    payrollLock = {
      ensureDateNotLocked: jest.fn().mockResolvedValue(undefined),
    };
    service = new OvertimeWorkflowService(repo, payrollLock);
  });

  describe("submitRequest", () => {
    it("should submit a pending request if not locked and no existing request", async () => {
      repo.findByEmployeeAndDate.mockResolvedValue(null);
      repo.create.mockResolvedValue({
        id: "ot-1",
        status: OvertimeStatus.PENDING,
      });

      const result = await service.submitRequest({
        employeeId: "emp-1",
        workDate: "2026-04-14",
        requestedMinutes: 60,
        candidateMinutes: 120,
      });
      if (!result) throw new Error("Expected overtime request to be created");

      expect(payrollLock.ensureDateNotLocked).toHaveBeenCalledWith(
        "2026-04-14",
      );
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          status: OvertimeStatus.PENDING,
          requestedMinutes: 60,
        }),
      );
      expect(result.status).toBe(OvertimeStatus.PENDING);
    });

    it("should throw error if request already exists for that date", async () => {
      repo.findByEmployeeAndDate.mockResolvedValue({
        status: OvertimeStatus.PENDING,
      });

      await expect(
        service.submitRequest({
          employeeId: "emp-1",
          workDate: "2026-04-14",
          requestedMinutes: 60,
          candidateMinutes: 120,
        }),
      ).rejects.toThrow();
    });
  });

  describe("approveRequest", () => {
    it("should approve inside a repository transaction", async () => {
      repo.transaction = jest.fn().mockImplementation(async (fn) => fn({ tx: true }));
      repo.findById.mockResolvedValue({
        id: "ot-1",
        status: OvertimeStatus.PENDING,
        workDate: "2026-04-14",
        requestedMinutes: 60,
      });
      repo.update.mockResolvedValue({
        id: "ot-1",
        status: OvertimeStatus.APPROVED,
      });

      await service.approveRequest("ot-1", "user-1");

      expect(repo.transaction).toHaveBeenCalled();
      expect(repo.findById).toHaveBeenCalledWith("ot-1", { tx: true });
      expect(repo.update).toHaveBeenCalledWith(
        "ot-1",
        expect.objectContaining({ status: OvertimeStatus.APPROVED }),
        { tx: true },
      );
    });

    it("should transition status to approved", async () => {
      repo.findById.mockResolvedValue({
        id: "ot-1",
        status: OvertimeStatus.PENDING,
        workDate: "2026-04-14",
        requestedMinutes: 60,
      });
      repo.update.mockResolvedValue({
        id: "ot-1",
        status: OvertimeStatus.APPROVED,
      });

      const result = await service.approveRequest("ot-1", "user-1");
      if (!result) throw new Error("Expected overtime request to be approved");

      expect(payrollLock.ensureDateNotLocked).toHaveBeenCalledWith(
        "2026-04-14",
      );
      expect(repo.update).toHaveBeenCalledWith(
        "ot-1",
        expect.objectContaining({
          status: OvertimeStatus.APPROVED,
          approvedByUserId: "user-1",
        }),
        undefined,
      );
      expect(result.status).toBe(OvertimeStatus.APPROVED);
    });

    it("should throw error if request is not pending", async () => {
      repo.findById.mockResolvedValue({
        id: "ot-1",
        status: OvertimeStatus.APPROVED,
        workDate: "2026-04-14",
      });

      await expect(
        service.approveRequest("comp-1", "ot-1", "user-1" as any),
      ).rejects.toThrow();
    });
  });

  describe("rejectRequest", () => {
    it("should reject inside a repository transaction", async () => {
      repo.transaction = jest.fn().mockImplementation(async (fn) => fn({ tx: true }));
      repo.findById.mockResolvedValue({
        id: "ot-1",
        status: OvertimeStatus.PENDING,
        workDate: "2026-04-14",
      });
      repo.update.mockResolvedValue({
        id: "ot-1",
        status: OvertimeStatus.REJECTED,
      });

      await service.rejectRequest("ot-1", "user-1", "not needed");

      expect(repo.transaction).toHaveBeenCalled();
      expect(repo.findById).toHaveBeenCalledWith("ot-1", { tx: true });
      expect(repo.update).toHaveBeenCalledWith(
        "ot-1",
        expect.objectContaining({ status: OvertimeStatus.REJECTED }),
        { tx: true },
      );
    });
  });
});
