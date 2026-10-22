import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { OverrideAttendanceSummaryUseCase } from "./override-attendance-summary.usecase";
import { QueryTimesheetWorkspaceUseCase } from "./query-timesheet-workspace.usecase";
import { OverrideAttendanceSummaryDto } from "../dto/override-attendance-summary.dto";
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

  it("should preserve existing note when updating another cell field without note", async () => {
    mockRepo.findPeriodLock.mockResolvedValue({ status: "open" });
    mockRepo.findOverride.mockResolvedValue({
      id: "ov-existing",
      overriddenWorkedMinutes: 480,
      note: "Existing audit note",
    });

    await useCase.execute("actor-1", {
      employeeId: "emp-1",
      workDate: "2026-08-01",
      reason: "manual_correction",
      overriddenWorkedMinutes: 450,
    });

    expect(mockRepo.updateOverride).toHaveBeenCalledWith(
      "ov-existing",
      expect.objectContaining({
        note: "Existing audit note",
      }),
    );
  });

  it("should persist duty30kMinutes into attendance daily summary sourceData", async () => {
    mockRepo.findPeriodLock.mockResolvedValue({ status: "open" });

    await useCase.execute("actor-1", {
      employeeId: "emp-1",
      workDate: "2026-08-02",
      reason: "manual_correction",
      duty30kMinutes: 90,
      note: "Trực 35k buổi chiều",
    });

    expect(mockRepo.upsertAttendanceSummary).toHaveBeenCalledWith(
      "emp-1",
      "2026-08-02",
      expect.objectContaining({
        sourceData: { duty30kMinutes: 90 },
      }),
    );
    expect(mockRepo.insertOverride).toHaveBeenCalledWith(
      expect.objectContaining({
        employeeId: "emp-1",
        workDate: "2026-08-02",
        note: "Trực 35k buổi chiều",
      }),
    );
  });

  describe("OverrideAttendanceSummaryDto validation (AUD-02 & AUD-12)", () => {
    it("rejects out-of-range time strings, minute totals > 1440, and non-integer/out-of-range duty counts", async () => {
      const invalidDto = plainToInstance(OverrideAttendanceSummaryDto, {
        employeeId: "emp-1",
        workDate: "2026-10-02",
        reason: "manual_correction",
        checkInMorning: "25:00",
        checkOutMorning: "08:75",
        checkInAfternoon: "9999",
        checkOutAfternoon: "::",
        overriddenWorkedMinutes: 1500,
        nightShiftDutyCount: 15,
        waterBoothDutyCount: 1.5,
      });

      const errors = await validate(invalidDto);
      const props = errors.map((e) => e.property);
      expect(props).toEqual(
        expect.arrayContaining([
          "checkInMorning",
          "checkOutMorning",
          "checkInAfternoon",
          "checkOutAfternoon",
          "overriddenWorkedMinutes",
          "nightShiftDutyCount",
          "waterBoothDutyCount",
        ]),
      );
    });

    it("accepts valid HH:mm, ISO datetime, empty string, and valid bounds", async () => {
      const validDto = plainToInstance(OverrideAttendanceSummaryDto, {
        employeeId: "550e8400-e29b-41d4-a716-446655440000",
        workDate: "2026-10-02",
        reason: "manual_correction",
        checkInMorning: "07:30",
        checkOutMorning: "2026-10-02T11:30:00.000Z",
        checkInAfternoon: "",
        checkOutAfternoon: null,
        overriddenWorkedMinutes: 480,
        breakMinutes: 60,
        nightShiftDutyCount: 1,
        waterBoothDutyCount: 2,
      });

      const errors = await validate(validDto);
      expect(errors).toHaveLength(0);
    });
  });

  describe("QueryTimesheetWorkspaceUseCase clock event resolution (AUD-01)", () => {
    it("prioritizes explicit session rows over null-session rows and ignores noon (LUNCH_DUTY) events for shift punches", async () => {
      const mockPeriodLockRepo = {
        ensurePeriod: jest.fn().mockResolvedValue({ status: "open" }),
        listEmployeeVerification: jest.fn().mockResolvedValue([]),
      };
      const mockTimekeepingRepo = {
        findWorkspaceData: jest.fn().mockResolvedValue({
          employees: [
            {
              id: "emp-1",
              employeeCode: "NV001",
              firstName: "Nguyen",
              lastName: "Van A",
              departmentName: "IT",
              jobTitle: "Dev",
              baseSalary: "10000000",
            },
          ],
          summaries: [
            {
              employeeId: "emp-1",
              workDate: "2026-10-02",
              status: "present",
              workedMinutes: 480,
              scheduledMinutes: 480,
              lateMinutes: 0,
              earlyLeaveMinutes: 0,
              overtimeMinutes: 0,
              breakMinutes: 60,
              personalBreakMinutes: 0,
              lunchDutyMinutes: 60,
              duty30kMinutes: 0,
              nightShiftDutyCount: 0,
              waterBoothDutyCount: 0,
              isHoliday: false,
              note: null,
            },
          ],
          events: [
            // Explicit morning check-in at 08:00
            {
              id: "ev-explicit-morning",
              employeeId: "emp-1",
              date: "2026-10-02",
              type: "check_in",
              session: "morning",
              time: new Date(2026, 9, 2, 8, 0, 0),
            },
            // Legacy null-session morning check-in appearing AFTER explicit event in array (07:30)
            {
              id: "ev-null-morning",
              employeeId: "emp-1",
              date: "2026-10-02",
              type: "check_in",
              session: null,
              time: new Date(2026, 9, 2, 7, 30, 0),
            },
            // Explicit afternoon check-in at 13:30
            {
              id: "ev-explicit-afternoon",
              employeeId: "emp-1",
              date: "2026-10-02",
              type: "check_in",
              session: "afternoon",
              time: new Date(2026, 9, 2, 13, 30, 0),
            },
            // Noon LUNCH_DUTY check-in at 12:15 (must NOT overwrite checkInAfternoon)
            {
              id: "ev-noon",
              employeeId: "emp-1",
              date: "2026-10-02",
              type: "check_in",
              session: "noon",
              time: new Date(2026, 9, 2, 12, 15, 0),
            },
          ],
          allowances: [],
        }),
      };

      const queryUseCase = new QueryTimesheetWorkspaceUseCase(
        mockPeriodLockRepo as any,
        {} as any,
        mockTimekeepingRepo as any,
      );

      const res = await queryUseCase.execute({ period: "2026-10" }, ["sys:all"]);
      expect(res.records).toHaveLength(1);
      const rec = res.records[0]!;
      expect(new Date(rec.checkInMorning!).getHours()).toBe(8);
      expect(new Date(rec.checkInMorning!).getMinutes()).toBe(0);
      expect(new Date(rec.checkInAfternoon!).getHours()).toBe(13);
      expect(new Date(rec.checkInAfternoon!).getMinutes()).toBe(30);
    });
  });
});
