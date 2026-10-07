import { CreateClockEventUseCase } from "./create-clock-event.usecase";

describe("CreateClockEventUseCase", () => {
  let useCase: CreateClockEventUseCase;
  let mockRepo: any;
  let mockRecompute: any;
  let mockDayTransaction: any;
  let mockWorkforcePort: any;
  let mockEventOutbox: any;
  let mockRequestContext: any;

  beforeEach(() => {
    mockRepo = {
      findPeriodLock: jest.fn().mockResolvedValue(null),
      createClockEvent: jest.fn().mockImplementation((data) => Promise.resolve({ id: "evt-1", ...data })),
    };
    mockRecompute = {
      execute: jest.fn().mockResolvedValue({
        summary: { id: "sum-1" },
        exceptions: [],
      }),
    };
    mockDayTransaction = {
      execute: jest.fn().mockImplementation(async (empId, date, fn) => fn({})),
    };
    mockWorkforcePort = {
      getEmployeeContext: jest.fn().mockResolvedValue({
        employmentStatus: "eligible",
      }),
    };
    mockEventOutbox = {
      stage: jest.fn().mockResolvedValue(undefined),
    };
    mockRequestContext = {
      get: jest.fn().mockReturnValue({ userId: "user-1", reqId: "req-1" }),
      getRequestId: jest.fn().mockReturnValue("req-1"),
    };

    useCase = new CreateClockEventUseCase(
      mockRepo,
      mockRecompute,
      mockDayTransaction,
      mockWorkforcePort,
      mockEventOutbox,
      mockRequestContext,
    );
  });

  it("should create clock event and recompute attendance day when period is open", async () => {
    const result = await useCase.execute("user-1", "emp-1", {
      employeeId: "emp-1",
      type: "check_in",
      workDate: "2026-08-15",
    });

    expect(result).toBeDefined();
    expect(mockRepo.createClockEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        employeeId: "emp-1",
        type: "check_in",
        date: "2026-08-15",
      }),
      expect.anything(),
    );
    expect(mockEventOutbox.stage).toHaveBeenCalled();
    expect(mockRecompute.execute).toHaveBeenCalledWith("emp-1", "2026-08-15", expect.anything());
  });

  it("should reject clock event if period is locked", async () => {
    mockRepo.findPeriodLock.mockResolvedValue({ status: "locked" });

    await expect(
      useCase.execute("user-1", "emp-1", {
        employeeId: "emp-1",
        type: "check_in",
        workDate: "2026-08-15",
      }),
    ).rejects.toThrow("Period 2026-08 is locked/closed — clock events not allowed");

    expect(mockRepo.createClockEvent).not.toHaveBeenCalled();
  });

  it("should reject clock event if employee is not eligible", async () => {
    mockWorkforcePort.getEmployeeContext.mockResolvedValue({
      employmentStatus: "terminated",
    });

    await expect(
      useCase.execute("user-1", "emp-1", {
        employeeId: "emp-1",
        type: "check_in",
        workDate: "2026-08-15",
      }),
    ).rejects.toThrow("Employee is not eligible for attendance check");

    expect(mockRepo.createClockEvent).not.toHaveBeenCalled();
  });
});
