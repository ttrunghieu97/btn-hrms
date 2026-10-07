import { AttendanceAdjustmentService } from "./attendance-adjustment.service";

describe("AttendanceAdjustmentService", () => {
  let service: AttendanceAdjustmentService;
  let mockTimekeepingRepo: any;
  let mockEventOutbox: any;
  let mockPeriodLockService: any;

  beforeEach(() => {
    mockTimekeepingRepo = {
      findPeriodLock: jest.fn().mockResolvedValue({ status: "closed" }),
      findSnapshot: jest.fn().mockResolvedValue({ id: "snap-1" }),
      transaction: jest.fn().mockImplementation(async (fn) => fn({ tx: true })),
      insertAdjustment: jest.fn().mockImplementation((data) => Promise.resolve({ id: "adj-1", ...data })),
      insertAdjustmentItems: jest.fn().mockResolvedValue([]),
      updateAdjustment: jest.fn().mockImplementation((id, data) => Promise.resolve({ id, period: "2026-08", ...data })),
      findAdjustmentById: jest.fn().mockResolvedValue({
        id: "adj-1",
        period: "2026-08",
        employeeId: "emp-1",
        status: "requested",
        items: [],
      }),
      findAppliedAdjustmentsWithItems: jest.fn().mockResolvedValue([]),
      findAppliedAdjustmentsForEmployees: jest.fn().mockResolvedValue([]),
    };

    mockEventOutbox = {
      stage: jest.fn().mockResolvedValue(undefined),
    };

    mockPeriodLockService = {
      isClosed: jest.fn().mockReturnValue(true),
    };

    service = new AttendanceAdjustmentService(
      mockTimekeepingRepo,
      mockEventOutbox,
      mockPeriodLockService,
    );
  });

  it("creates adjustment and stages outbox event within transaction", async () => {
    const result = await service.create(
      {
        period: "2026-08",
        employeeId: "emp-1",
        reason: "retro punch fix",
        items: [
          { fieldName: "REGULAR_HOURS", oldValue: 8, newValue: 10, delta: 2 },
        ],
      },
      "user-admin",
    );

    expect(result.id).toBe("adj-1");
    expect(mockTimekeepingRepo.insertAdjustment).toHaveBeenCalledWith(
      expect.objectContaining({
        period: "2026-08",
        employeeId: "emp-1",
        status: "requested",
      }),
      { tx: true },
    );
    expect(mockTimekeepingRepo.insertAdjustmentItems).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ fieldName: "REGULAR_HOURS", delta: 2 }),
      ]),
      { tx: true },
    );
    expect(mockEventOutbox.stage).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: "attendance.adjustment.requested.v1" }),
      { tx: true },
    );
  });

  it("rejects adjustment creation if period is not closed", async () => {
    mockPeriodLockService.isClosed.mockReturnValue(false);

    await expect(
      service.create(
        {
          period: "2026-08",
          employeeId: "emp-1",
          reason: "not closed",
          items: [],
        },
        "user-admin",
      ),
    ).rejects.toThrow("Adjustments can only be created for closed periods");
  });

  it("approves adjustment and stages event within transaction", async () => {
    mockTimekeepingRepo.findAdjustmentById.mockResolvedValue({
      id: "adj-1",
      period: "2026-08",
      status: "under_review",
    });

    const result = await service.approve("adj-1", "user-approver");

    expect(result.status).toBe("approved");
    expect(mockTimekeepingRepo.updateAdjustment).toHaveBeenCalledWith(
      "adj-1",
      expect.objectContaining({ status: "approved", approvedByUserId: "user-approver" }),
      { tx: true },
    );
    expect(mockEventOutbox.stage).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: "attendance.adjustment.approved.v1" }),
      { tx: true },
    );
  });

  it("computes batch effective deltas for multiple employees", async () => {
    mockTimekeepingRepo.findAppliedAdjustmentsForEmployees.mockResolvedValue([
      {
        id: "adj-1",
        employeeId: "emp-1",
        items: [
          { fieldName: "REGULAR_HOURS", delta: 2 },
          { fieldName: "OVERTIME_HOURS", delta: 1.5 },
        ],
      },
      {
        id: "adj-2",
        employeeId: "emp-1",
        items: [
          { fieldName: "REGULAR_HOURS", delta: 1 },
        ],
      },
      {
        id: "adj-3",
        employeeId: "emp-2",
        items: [
          { fieldName: "OVERTIME_HOURS", delta: 3 },
        ],
      },
    ]);

    const result = await service.getEffectiveDeltasForEmployees("2026-08", ["emp-1", "emp-2"]);

    expect(result.get("emp-1")?.get("REGULAR_HOURS")).toBe(3);
    expect(result.get("emp-1")?.get("OVERTIME_HOURS")).toBe(1.5);
    expect(result.get("emp-2")?.get("OVERTIME_HOURS")).toBe(3);
  });
});
