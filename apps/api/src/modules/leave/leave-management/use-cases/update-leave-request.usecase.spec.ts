import { Test } from "@nestjs/testing";
import { UpdateLeaveRequestUseCase } from "./update-leave-request.usecase";
import { LeaveRequestsRepository } from "../repositories/leave-requests.repository";
import { LeaveLifecycleService } from "../services/leave-lifecycle.service";
import { RequestContextService } from "../../../../shared/context/request-context.service";

describe(UpdateLeaveRequestUseCase.name, () => {
  let useCase: UpdateLeaveRequestUseCase;
  let repo: jest.Mocked<LeaveRequestsRepository>;
  let lifecycle: jest.Mocked<LeaveLifecycleService>;

  beforeEach(async () => {
    repo = {
      findById: jest.fn(),
      transaction: jest.fn().mockImplementation(async (fn) => fn()),
      update: jest.fn(),
      createAuditLog: jest.fn(),
    } as any;
    lifecycle = { assertTransition: jest.fn() } as any;

    const module = await Test.createTestingModule({
      providers: [
        UpdateLeaveRequestUseCase,
        { provide: LeaveRequestsRepository, useValue: repo },
        { provide: LeaveLifecycleService, useValue: lifecycle },
        { provide: RequestContextService, useValue: { getRequestId: jest.fn(), get: jest.fn() } },
      ],
    }).compile();
    useCase = module.get(UpdateLeaveRequestUseCase);
  });

  it("updates a draft leave request", async () => {
    repo.findById.mockResolvedValue({ id: "req-1", status: "draft", startDate: "2026-08-01", endDate: "2026-08-01", employeeId: "emp-1", leaveTypeId: "type-1", createdAt: new Date(), updatedAt: new Date() } as any);

    await useCase.execute("req-1", { startDate: "2026-08-02", endDate: "2026-08-02" });

    expect(repo.update).toHaveBeenCalled();
    expect(repo.createAuditLog).toHaveBeenCalled();
  });

  it("rejects update of leave request in terminal state", async () => {
    repo.findById.mockResolvedValue({ id: "req-1", status: "approved", startDate: "2026-08-01", endDate: "2026-08-01", employeeId: "emp-1", leaveTypeId: "type-1", createdAt: new Date(), updatedAt: new Date() } as any);
    lifecycle.assertTransition.mockImplementation(() => { throw new Error("Invalid transition"); });

    await expect(
      useCase.execute("req-1", { startDate: "2026-08-02", endDate: "2026-08-02" }),
    ).rejects.toThrow("Invalid transition");
  });

  it("rejects update of non-existent request", async () => {
    repo.findById.mockResolvedValue(null);
    await expect(
      useCase.execute("missing", { startDate: "2026-08-01", endDate: "2026-08-01" }),
    ).rejects.toThrow("Leave request not found");
  });

  it("rejects invalid date range in update", async () => {
    repo.findById.mockResolvedValue({ id: "req-1", status: "draft", startDate: "2026-08-01", endDate: "2026-08-10", employeeId: "emp-1", leaveTypeId: "type-1", createdAt: new Date(), updatedAt: new Date() } as any);

    await expect(
      useCase.execute("req-1", { startDate: "2026-08-10", endDate: "2026-08-01" }),
    ).rejects.toThrow("Invalid leave date range");
  });
});
