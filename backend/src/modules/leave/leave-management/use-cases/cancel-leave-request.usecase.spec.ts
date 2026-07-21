import { Test, type TestingModule } from "@nestjs/testing";
import { CancelLeaveRequestUseCase } from "./cancel-leave-request.usecase";
import { LeaveRequestsRepository } from "../repositories/leave-requests.repository";
import { LeaveLifecycleService } from "../services/leave-lifecycle.service";
import { LeaveAttendanceReconciliationService } from "../services/leave-attendance-reconciliation.service";
import { RequestContextService } from "../../../../shared/context/request-context.service";
import { EventOutboxService } from "../../../../core/events/event-outbox.service";

describe("CancelLeaveRequestUseCase", () => {
  let useCase: CancelLeaveRequestUseCase;
  let repo: jest.Mocked<LeaveRequestsRepository>;
  let lifecycle: jest.Mocked<LeaveLifecycleService>;
  let reconciliation: jest.Mocked<LeaveAttendanceReconciliationService>;
  let eventOutbox: jest.Mocked<EventOutboxService>;

  beforeEach(async () => {
    repo = {
      findById: jest.fn(),
      findBalanceForYear: jest.fn(),
      decrementUsedBalance: jest.fn(),
      update: jest.fn(),
      createAuditLog: jest.fn(),
      transaction: jest.fn().mockImplementation(async (fn) => fn({})),
    } as any;

    lifecycle = {
      assertTransition: jest.fn(),
    } as any;

    reconciliation = {
      reconcileCanceledLeave: jest.fn(),
    } as any;

    eventOutbox = {
      stage: jest.fn().mockResolvedValue(undefined),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CancelLeaveRequestUseCase,
        { provide: LeaveRequestsRepository, useValue: repo },
        { provide: LeaveLifecycleService, useValue: lifecycle },
        {
          provide: LeaveAttendanceReconciliationService,
          useValue: reconciliation,
        },
        { provide: EventOutboxService, useValue: eventOutbox },
        { provide: RequestContextService, useValue: { getRequestId: jest.fn().mockReturnValue('test-request-id'), get: jest.fn() } },
      ],
    }).compile();

    useCase = module.get<CancelLeaveRequestUseCase>(CancelLeaveRequestUseCase);
  });

  it("should restore balance if canceling an approved request", async () => {
    const request = {
      id: "req-1",
      status: "approved",
      startDate: "2026-05-01",
      totalUnits: "5",
      employeeId: "emp-1",
      leaveTypeId: "type-1",
    };
    repo.findById.mockResolvedValue(request as any);
    repo.findBalanceForYear.mockResolvedValue({ id: "bal-1" } as any);
    repo.update.mockResolvedValue({ ...request, status: "cancelled" } as any);

    await useCase.execute("req-1", { id: "user-1", employeeId: "emp-1", permissions: [], roles: [], departmentId: null, username: "user1" });

    expect(repo.decrementUsedBalance).toHaveBeenCalledWith("bal-1", "5", expect.any(Object));
    expect(eventOutbox.stage).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: "leave.request.cancelled" }),
      expect.any(Object),
    );
    expect(reconciliation.reconcileCanceledLeave).toHaveBeenCalled();
  });

  it("should reject when attendance reconciliation fails after canceling an approved request", async () => {
    const request = {
      id: "req-1",
      status: "approved",
      startDate: "2026-05-01",
      totalUnits: "5",
      employeeId: "emp-1",
      leaveTypeId: "type-1",
    };
    repo.findById.mockResolvedValue(request as any);
    repo.findBalanceForYear.mockResolvedValue({ id: "bal-1" } as any);
    repo.update.mockResolvedValue({ ...request, status: "cancelled" } as any);
    reconciliation.reconcileCanceledLeave.mockRejectedValue(new Error("reconcile failed"));

    await expect(
      useCase.execute("req-1", { id: "user-1", employeeId: "emp-1", permissions: [], roles: [], departmentId: null, username: "user1" } as any),
    ).rejects.toThrow("reconcile failed");
  });

  it("rejects cancellation by non-owner without manager/admin permission", async () => {
    repo.findById.mockResolvedValue({
      id: "req-1",
      status: "pending",
      startDate: "2026-05-01",
      totalUnits: "5",
      employeeId: "emp-owner",
      leaveTypeId: "type-1",
    } as any);

    await expect(
      useCase.execute("req-1", {
        id: "user-2",
        employeeId: "emp-other",
        permissions: ["leave:edit"],
        roles: [],
        departmentId: null,
        username: "user2",
      } as any),
    ).rejects.toThrow("Cannot cancel another employee's leave request");

    expect(repo.update).not.toHaveBeenCalled();
  });

  it("should fail when the leave request disappears during cancellation", async () => {
    repo.findById.mockResolvedValue({
      id: "req-1",
      status: "approved",
      startDate: "2026-05-01",
      totalUnits: "5",
      employeeId: "emp-1",
      leaveTypeId: "type-1",
    } as any);
    repo.update.mockResolvedValue(null);

    await expect(
      useCase.execute("req-1", {
        id: "user-1",
        employeeId: "emp-1",
        permissions: [],
        roles: [],
        departmentId: null,
        username: "user1",
      } as any),
    ).rejects.toThrow("Leave request not found");

    expect(repo.decrementUsedBalance).not.toHaveBeenCalled();
    expect(eventOutbox.stage).not.toHaveBeenCalled();
    expect(reconciliation.reconcileCanceledLeave).not.toHaveBeenCalled();
  });

  it("should not restore balance if canceling a pending request", async () => {
    const request = {
      id: "req-1",
      status: "pending",
      startDate: "2026-05-01",
      totalUnits: "5",
      employeeId: "emp-1",
      leaveTypeId: "type-1",
    };
    repo.findById.mockResolvedValue(request as any);
    repo.update.mockResolvedValue({ ...request, status: "cancelled" } as any);

    await useCase.execute("req-1", { id: "user-1", employeeId: "emp-1", permissions: [], roles: [], departmentId: null, username: "user1" });

    expect(repo.decrementUsedBalance).not.toHaveBeenCalled();
    expect(reconciliation.reconcileCanceledLeave).not.toHaveBeenCalled();
  });
});

