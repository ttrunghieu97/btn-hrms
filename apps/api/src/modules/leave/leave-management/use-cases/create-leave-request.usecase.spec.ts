import { Test } from "@nestjs/testing";
import { CreateLeaveRequestUseCase } from "./create-leave-request.usecase";
import { LeaveRequestsRepository } from "../repositories/leave-requests.repository";
import { LeaveAttendanceReconciliationService } from "../services/leave-attendance-reconciliation.service";
import { EventOutboxService } from "../../../../core/events/event-outbox.service";
import { RequestContextService } from "../../../../shared/context/request-context.service";
import { LeaveAuthorizationService } from "../services/leave-authorization.service";

describe(CreateLeaveRequestUseCase.name, () => {
  let useCase: CreateLeaveRequestUseCase;
  let repo: jest.Mocked<LeaveRequestsRepository>;
  let eventOutbox: jest.Mocked<EventOutboxService>;

  const validDto = {
    employeeId: "emp-1", leaveTypeId: "type-1",
    startDate: "2026-08-01", endDate: "2026-08-01", totalUnits: "1",
    startSession: "morning" as const, endSession: "afternoon" as const,
  };

  beforeEach(async () => {
    repo = {
      findEmployeeById: jest.fn(),
      findLeaveTypeById: jest.fn(),
      findOverlappingApprovedRequest: jest.fn().mockResolvedValue(null),
      transaction: jest.fn().mockImplementation(async (fn) => fn({})),
      create: jest.fn().mockResolvedValue({ id: "req-1", employeeId: "emp-1", leaveTypeId: "type-1", status: "pending", startDate: "2026-08-01", endDate: "2026-08-01", totalUnits: "1", startSession: "morning", endSession: "afternoon" }),
      createAuditLog: jest.fn(),
      findBalanceForYear: jest.fn(),
      findById: jest.fn().mockResolvedValue({ id: "req-1", employeeId: "emp-1", leaveTypeId: "type-1", status: "pending", startDate: "2026-08-01", endDate: "2026-08-01", totalUnits: "1", startSession: "morning", endSession: "afternoon", approverUserId: null, approver: null, leaveType: { id: "type-1", name: "Annual", code: "AL", unit: "day" }, createdAt: new Date(), updatedAt: new Date() }),
      incrementUsedBalance: jest.fn().mockResolvedValue({ id: "bal-1" } as any),
    } as any;

    eventOutbox = { stage: jest.fn().mockResolvedValue({ id: "out-1" }) } as any;

    const module = await Test.createTestingModule({
      providers: [
        CreateLeaveRequestUseCase,
        { provide: LeaveRequestsRepository, useValue: repo },
        { provide: LeaveAttendanceReconciliationService, useValue: { reconcileApprovedLeave: jest.fn() } },
        { provide: EventOutboxService, useValue: eventOutbox },
        { provide: RequestContextService, useValue: { getRequestId: jest.fn(), get: jest.fn() } },
        { provide: LeaveAuthorizationService, useValue: { canCreate: jest.fn().mockResolvedValue(undefined), canCancel: jest.fn().mockResolvedValue(undefined) } },
      ],
    }).compile();

    useCase = module.get(CreateLeaveRequestUseCase);
  });

  it("creates a pending leave request", async () => {
    repo.findEmployeeById.mockResolvedValue({ id: "emp-1", userId: "user-1" } as any);
    repo.findLeaveTypeById.mockResolvedValue({ id: "type-1", isPaid: false, requiresApproval: true, minNoticeHours: null } as any);

    await useCase.execute(validDto);

    expect(repo.create).toHaveBeenCalled();
    expect(eventOutbox.stage).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: "leave.approval.requested.v1" }),
      expect.anything(),
    );
  });

  it("rejects overlapping approved or pending request", async () => {
    repo.findEmployeeById.mockResolvedValue({ id: "emp-1" } as any);
    repo.findLeaveTypeById.mockResolvedValue({ id: "type-1", requiresApproval: true, minNoticeHours: null } as any);
    repo.findOverlappingApprovedRequest.mockResolvedValue({ id: "overlap-1" } as any);

    await expect(
      useCase.execute(validDto as any),
    ).rejects.toThrow("Leave request overlaps");
  });

  it("rejects request when leave balance is insufficient for paid leave", async () => {
    repo.findEmployeeById.mockResolvedValue({ id: "emp-1", userId: "user-1" } as any);
    repo.findLeaveTypeById.mockResolvedValue({ id: "type-1", isPaid: true, requiresApproval: true, minNoticeHours: null } as any);
    repo.findBalanceForYear.mockResolvedValue({
      id: "bal-1",
      openingBalance: "5",
      accruedAmount: "0",
      carriedOverAmount: "0",
      adjustedAmount: "0",
      usedAmount: "5", // 5 - 5 = 0 remaining
    } as any);

    await expect(
      useCase.execute(validDto as any),
    ).rejects.toThrow(/Số ngày phép còn lại không đủ/);
  });

  it("rejects invalid date range", async () => {
    await expect(
      useCase.execute({ ...validDto, startDate: "2026-08-10", endDate: "2026-08-01" } as any),
    ).rejects.toThrow("Invalid leave date range");
  });

  it("auto-approves leave when type does not require approval and balance is sufficient", async () => {
    repo.findEmployeeById.mockResolvedValue({ id: "emp-1", userId: "user-1" } as any);
    repo.findLeaveTypeById.mockResolvedValue({ id: "type-1", isPaid: true, requiresApproval: false, minNoticeHours: null } as any);
    repo.findBalanceForYear.mockResolvedValue({
      id: "bal-1",
      openingBalance: "10",
      accruedAmount: "0",
      carriedOverAmount: "0",
      adjustedAmount: "0",
      usedAmount: "2", // 10 - 2 = 8 available
    } as any);
    repo.incrementUsedBalance.mockResolvedValue({ id: "bal-1" } as any);

    await useCase.execute(validDto);

    expect(eventOutbox.stage).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: "leave.approved.v1" }),
      expect.anything(),
    );
  });

  it("rejects auto-approval when used balance increment fails due to insufficient balance", async () => {
    repo.findEmployeeById.mockResolvedValue({ id: "emp-1", userId: "user-1" } as any);
    repo.findLeaveTypeById.mockResolvedValue({ id: "type-1", isPaid: true, requiresApproval: false, minNoticeHours: null } as any);
    repo.findBalanceForYear.mockResolvedValue({
      id: "bal-1",
      openingBalance: "10",
      accruedAmount: "0",
      carriedOverAmount: "0",
      adjustedAmount: "0",
      usedAmount: "0",
    } as any);
    repo.incrementUsedBalance.mockResolvedValue(null as any); // atomic conditional update failed

    await expect(
      useCase.execute(validDto as any),
    ).rejects.toThrow(/Số ngày phép còn lại không đủ/);
  });
});
