import { AttendanceTimeCalculationService } from "./attendance-time-calculation.service";

describe("AttendanceTimeCalculationService", () => {
  let service: AttendanceTimeCalculationService;

  beforeEach(() => {
    service = new AttendanceTimeCalculationService();
  });

  it("should compute regular workday summary", () => {
    // 08:00-17:00 local time (UTC+7) = 01:00-10:00 UTC
    const events = [
      { id: "1", type: "check_in", time: "2026-04-15T01:00:00.000Z" },
      { id: "2", type: "check_out", time: "2026-04-15T10:00:00.000Z" },
    ];
    const shiftContext = {
      shiftTemplate: {
        startTime: "08:00:00",
        endTime: "17:00:00",
        breakMinutes: 60,
      },
      employeeShiftAssignmentId: "shift-1",
    };

    const result = service.compute(events, shiftContext);

    expect(result.status).toBe("present");
    expect(result.scheduledMinutes).toBe(480); // 9h - 1h break
    expect(result.workedMinutes).toBe(480);
    expect(result.lateMinutes).toBe(0);
    expect(result.earlyLeaveMinutes).toBe(0);
    expect(result.anomalyFlags.missingPunch).toBe(false);
  });

  it("should mark lateness", () => {
    // 15 min late: check-in at 08:15 local = 01:15 UTC; check-out at 17:00 local = 10:00 UTC
    const events = [
      { id: "1", type: "check_in", time: "2026-04-15T01:15:00.000Z" },
      { id: "2", type: "check_out", time: "2026-04-15T10:00:00.000Z" },
    ];
    const shiftContext = {
      shiftTemplate: {
        startTime: "08:00:00",
        endTime: "17:00:00",
        breakMinutes: 60,
      },
    };

    const result = service.compute(events, shiftContext);

    expect(result.status).toBe("late");
    expect(result.lateMinutes).toBe(15);
    expect(result.workedMinutes).toBe(465);
  });

  it("should detect missing punch", () => {
    // Only check-in at 08:00 local = 01:00 UTC, no check-out
    const events = [
      { id: "1", type: "check_in", time: "2026-04-15T01:00:00.000Z" },
    ];
    const shiftContext = {
      shiftTemplate: {
        startTime: "08:00:00",
        endTime: "17:00:00",
      },
    };

    const result = service.compute(events, shiftContext);

    expect(result.anomalyFlags.missingPunch).toBe(true);
  });

  it("should handle overnight shift", () => {
    // Shift 22:00-06:00 local = 15:00-23:00 UTC (same UTC day)
    const events = [
      { id: "1", type: "check_in", time: "2026-04-15T15:00:00.000Z" },
      { id: "2", type: "check_out", time: "2026-04-15T23:00:00.000Z" },
    ];
    const shiftContext = {
      shiftTemplate: {
        startTime: "22:00:00",
        endTime: "06:00:00",
        isNightShift: true,
      },
    };

    const result = service.compute(events, shiftContext);

    expect(result.status).toBe("present");
    expect(result.workedMinutes).toBe(480);
    expect(result.scheduledMinutes).toBe(480);
  });
});
