import { OverrideAttendanceSummaryUseCase } from "./override-attendance-summary.usecase";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";

describe("OverrideAttendanceSummaryUseCase", () => {
  let useCase: OverrideAttendanceSummaryUseCase;
  let mockRepo: any;
  let mockRequestContext: any;

  beforeEach(() => {
    mockRepo = {
      employeeExists: jest.fn().mockResolvedValue(true),
      findPeriodLock: jest.fn().mockResolvedValue(null),
      findOverride: jest.fn().mockResolvedValue(null),
      insertOverride: jest.fn().mockImplementation((data) => Promise.resolve({ id: "ov-1", ...data })),
      updateOverride: jest.fn().mockImplementation((id, data) => Promise.resolve({ id, ...data })),
      upsertAttendanceSummary: jest.fn().mockResolvedValue({ id: "sum-1" }),
      upsertSessionClockEvent: jest.fn().mockResolvedValue(null),
    };
    mockRequestContext = {
      get: jest.fn().mockReturnValue("req-123"),
    };
    useCase = new OverrideAttendanceSummaryUseCase(mockRepo, mockRequestContext);
  });

  it("should create override when period is open and fields are valid", async () => {
    mockRepo.findPeriodLock.mockResolvedValue({ status: "open" });

    const result = await useCase.execute("actor-1", {
      employeeId: "emp-1",
      workDate: "2026-08-01",
      reason: "manual_correction",
      overriddenWorkedMinutes: 480,
    });

    expect(result).toEqual({
      id: "ov-1",
      employeeId: "emp-1",
      workDate: "2026-08-01",
      action: "created",
    });
    expect(mockRepo.insertOverride).toHaveBeenCalledWith(
      expect.objectContaining({
        employeeId: "emp-1",
        workDate: "2026-08-01",
        reason: "manual_correction",
        overriddenWorkedMinutes: 480,
        createdByUserId: "actor-1",
      }),
    );
  });

  it("should update override if override already exists for employee and date", async () => {
    mockRepo.findPeriodLock.mockResolvedValue({ status: "in_review" });
    mockRepo.findOverride.mockResolvedValue({
      id: "ov-existing",
      overriddenWorkedMinutes: 400,
    });

    const result = await useCase.execute("actor-1", {
      employeeId: "emp-1",
      workDate: "2026-08-01",
      reason: "manual_correction",
      overriddenWorkedMinutes: 480,
    });

    expect(result).toEqual({
      id: "ov-existing",
      employeeId: "emp-1",
      workDate: "2026-08-01",
      action: "updated",
    });
    expect(mockRepo.updateOverride).toHaveBeenCalled();
  });

  it("should reject correction if period is locked", async () => {
    mockRepo.findPeriodLock.mockResolvedValue({ status: "locked" });

    await expect(
      useCase.execute("actor-1", {
        employeeId: "emp-1",
        workDate: "2026-08-01",
        reason: "manual_correction",
        overriddenWorkedMinutes: 480,
      }),
    ).rejects.toThrow("Period 2026-08 is locked/closed — timesheet corrections not allowed");
  });

  it("should throw bad request if employee does not exist", async () => {
    mockRepo.employeeExists.mockResolvedValue(false);

    await expect(
      useCase.execute("actor-1", {
        employeeId: "emp-invalid",
        workDate: "2026-08-01",
        reason: "manual_correction",
        overriddenWorkedMinutes: 480,
      }),
    ).rejects.toThrow("Employee not found");
  });

  it("should throw bad request if no override fields provided", async () => {
    await expect(
      useCase.execute("actor-1", {
        employeeId: "emp-1",
        workDate: "2026-08-01",
        reason: "manual_correction",
      }),
    ).rejects.toThrow("At least one override field must be provided");
  });
});
