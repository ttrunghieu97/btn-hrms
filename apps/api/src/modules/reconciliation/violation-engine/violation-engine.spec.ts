import { AttendanceViolationEngine } from "./violation-engine";
import { type ReconciliationContext, type AttendanceSession } from "./interfaces";

describe("AttendanceViolationEngine & Rules", () => {
  let engine: AttendanceViolationEngine;

  beforeEach(() => {
    engine = new AttendanceViolationEngine();
  });

  const baseSession: AttendanceSession = {
    id: "session-1",
    employeeId: "emp-1",
    assignmentId: "assign-1",
    sessionType: "MORNING",
    status: "READY",
    date: "2026-07-09",
    timezone: "Asia/Ho_Chi_Minh",
    plannedStart: "08:00",
    plannedEnd: "12:00",
    actualStart: null,
    actualEnd: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const defaultPolicy = {
    lateGraceMinutes: 15,
    earlyDepartureGraceMinutes: 15,
    overtimeMinMinutes: 30,
    allowUnscheduled: true,
  };

  describe("LateArrivalRule", () => {
    it("should return no violation if plannedStart or actualStart is missing", () => {
      const context: ReconciliationContext = {
        assignment: {} as any,
        session: { ...baseSession, actualStart: null },
        clockEvents: [],
        policy: defaultPolicy,
        evaluatedAt: new Date("2026-07-09T10:00:00Z"),
      };
      const result = engine.evaluate(context);
      expect(result.filter((v) => v.code === "LATE_ARRIVAL")).toHaveLength(0);
    });

    it("should return no violation if checked in on time", () => {
      // 08:00 in Asia/Ho_Chi_Minh is 01:00 UTC
      const context: ReconciliationContext = {
        assignment: {} as any,
        session: {
          ...baseSession,
          actualStart: new Date("2026-07-09T01:00:00Z"), // 08:00 Local
        },
        clockEvents: [],
        policy: defaultPolicy,
        evaluatedAt: new Date("2026-07-09T10:00:00Z"),
      };
      const result = engine.evaluate(context);
      expect(result.filter((v) => v.code === "LATE_ARRIVAL")).toHaveLength(0);
    });

    it("should return no violation if checked in late but within grace period", () => {
      const context: ReconciliationContext = {
        assignment: {} as any,
        session: {
          ...baseSession,
          actualStart: new Date("2026-07-09T01:10:00Z"), // 08:10 Local (grace is 15 mins)
        },
        clockEvents: [],
        policy: defaultPolicy,
        evaluatedAt: new Date("2026-07-09T10:00:00Z"),
      };
      const result = engine.evaluate(context);
      expect(result.filter((v) => v.code === "LATE_ARRIVAL")).toHaveLength(0);
    });

    it("should return violation if checked in late past grace period", () => {
      const context: ReconciliationContext = {
        assignment: {} as any,
        session: {
          ...baseSession,
          actualStart: new Date("2026-07-09T01:20:00Z"), // 08:20 Local (grace is 15 mins)
        },
        clockEvents: [],
        policy: defaultPolicy,
        evaluatedAt: new Date("2026-07-09T10:00:00Z"),
      };
      const result = engine.evaluate(context);
      const lateViolation = result.find((v) => v.code === "LATE_ARRIVAL");
      expect(lateViolation).toBeDefined();
      expect(lateViolation?.severity).toBe("WARNING");
      expect(lateViolation?.metadata?.minutesLate).toBe(20);
    });
  });

  describe("EarlyDepartureRule", () => {
    it("should return no violation if plannedEnd or actualEnd is missing", () => {
      const context: ReconciliationContext = {
        assignment: {} as any,
        session: { ...baseSession, actualEnd: null },
        clockEvents: [],
        policy: defaultPolicy,
        evaluatedAt: new Date("2026-07-09T10:00:00Z"),
      };
      const result = engine.evaluate(context);
      expect(result.filter((v) => v.code === "EARLY_DEPARTURE")).toHaveLength(0);
    });

    it("should return no violation if departed on time or later", () => {
      // 12:00 Local is 05:00 UTC
      const context: ReconciliationContext = {
        assignment: {} as any,
        session: {
          ...baseSession,
          actualEnd: new Date("2026-07-09T05:00:00Z"), // 12:00 Local
        },
        clockEvents: [],
        policy: defaultPolicy,
        evaluatedAt: new Date("2026-07-09T10:00:00Z"),
      };
      const result = engine.evaluate(context);
      expect(result.filter((v) => v.code === "EARLY_DEPARTURE")).toHaveLength(0);
    });

    it("should return no violation if departed early within grace", () => {
      const context: ReconciliationContext = {
        assignment: {} as any,
        session: {
          ...baseSession,
          actualEnd: new Date("2026-07-09T04:50:00Z"), // 11:50 Local (grace is 15 mins)
        },
        clockEvents: [],
        policy: defaultPolicy,
        evaluatedAt: new Date("2026-07-09T10:00:00Z"),
      };
      const result = engine.evaluate(context);
      expect(result.filter((v) => v.code === "EARLY_DEPARTURE")).toHaveLength(0);
    });

    it("should return violation if departed early past grace period", () => {
      const context: ReconciliationContext = {
        assignment: {} as any,
        session: {
          ...baseSession,
          actualEnd: new Date("2026-07-09T04:40:00Z"), // 11:40 Local
        },
        clockEvents: [],
        policy: defaultPolicy,
        evaluatedAt: new Date("2026-07-09T10:00:00Z"),
      };
      const result = engine.evaluate(context);
      const earlyViolation = result.find((v) => v.code === "EARLY_DEPARTURE");
      expect(earlyViolation).toBeDefined();
      expect(earlyViolation?.severity).toBe("WARNING");
      expect(earlyViolation?.metadata?.minutesEarly).toBe(20);
    });
  });

  describe("MissingCheckOutRule", () => {
    it("should return violation if status is COMPLETED but actualEnd is missing", () => {
      const context: ReconciliationContext = {
        assignment: {} as any,
        session: {
          ...baseSession,
          actualStart: new Date("2026-07-09T01:00:00Z"),
          actualEnd: null,
          status: "COMPLETED",
        },
        clockEvents: [],
        policy: defaultPolicy,
        evaluatedAt: new Date("2026-07-09T10:00:00Z"),
      };
      const result = engine.evaluate(context);
      const missingViolation = result.find((v) => v.code === "MISSING_CHECK_OUT");
      expect(missingViolation).toBeDefined();
      expect(missingViolation?.severity).toBe("ERROR");
    });

    it("should return no violation if session is IN_PROGRESS and plannedEnd is in future", () => {
      const context: ReconciliationContext = {
        assignment: {} as any,
        session: {
          ...baseSession,
          actualStart: new Date("2026-07-09T01:00:00Z"),
          actualEnd: null,
          status: "IN_PROGRESS",
        },
        clockEvents: [],
        policy: defaultPolicy,
        evaluatedAt: new Date("2026-07-09T04:00:00Z"), // 11:00 Local (before 12:00 + 2h)
      };
      const result = engine.evaluate(context);
      expect(result.filter((v) => v.code === "MISSING_CHECK_OUT")).toHaveLength(0);
    });

    it("should return violation if session is IN_PROGRESS but plannedEnd is passed by > 2 hours", () => {
      const context: ReconciliationContext = {
        assignment: {} as any,
        session: {
          ...baseSession,
          actualStart: new Date("2026-07-09T01:00:00Z"),
          actualEnd: null,
          status: "IN_PROGRESS",
        },
        clockEvents: [],
        policy: defaultPolicy,
        evaluatedAt: new Date("2026-07-09T07:30:00Z"), // 14:30 Local (after 12:00 + 2h)
      };
      const result = engine.evaluate(context);
      const missingViolation = result.find((v) => v.code === "MISSING_CHECK_OUT");
      expect(missingViolation).toBeDefined();
      expect(missingViolation?.severity).toBe("ERROR");
    });
  });

  describe("AbsentRule", () => {
    it("should return violation if status is MISSED and no actualStart", () => {
      const context: ReconciliationContext = {
        assignment: {} as any,
        session: {
          ...baseSession,
          actualStart: null,
          status: "MISSED",
        },
        clockEvents: [],
        policy: defaultPolicy,
        evaluatedAt: new Date("2026-07-09T10:00:00Z"),
      };
      const result = engine.evaluate(context);
      const absentViolation = result.find((v) => v.code === "ABSENT");
      expect(absentViolation).toBeDefined();
      expect(absentViolation?.severity).toBe("ERROR");
    });

    it("should return no violation if session is READY but plannedStart in the future", () => {
      const context: ReconciliationContext = {
        assignment: {} as any,
        session: {
          ...baseSession,
          actualStart: null,
          status: "READY",
        },
        clockEvents: [],
        policy: defaultPolicy,
        evaluatedAt: new Date("2026-07-09T00:30:00Z"), // 07:30 Local (before 08:00)
      };
      const result = engine.evaluate(context);
      expect(result.filter((v) => v.code === "ABSENT")).toHaveLength(0);
    });

    it("should return violation if session is READY but plannedStart is passed by > 2 hours", () => {
      const context: ReconciliationContext = {
        assignment: {} as any,
        session: {
          ...baseSession,
          actualStart: null,
          status: "READY",
        },
        clockEvents: [],
        policy: defaultPolicy,
        evaluatedAt: new Date("2026-07-09T03:30:00Z"), // 10:30 Local (after 08:00 + 2h)
      };
      const result = engine.evaluate(context);
      const absentViolation = result.find((v) => v.code === "ABSENT");
      expect(absentViolation).toBeDefined();
      expect(absentViolation?.severity).toBe("ERROR");
    });
  });

  describe("UnscheduledAttendanceRule", () => {
    it("should return violation if checked in but there is no assignment", () => {
      const context: ReconciliationContext = {
        assignment: null,
        session: {
          ...baseSession,
          actualStart: new Date("2026-07-09T01:00:00Z"),
        },
        clockEvents: [],
        policy: defaultPolicy,
        evaluatedAt: new Date("2026-07-09T10:00:00Z"),
      };
      const result = engine.evaluate(context);
      const unscheduledViolation = result.find((v) => v.code === "UNSCHEDULED_ATTENDANCE");
      expect(unscheduledViolation).toBeDefined();
      expect(unscheduledViolation?.severity).toBe("WARNING");
    });

    it("should return no violation if checked in and assignment exists", () => {
      const context: ReconciliationContext = {
        assignment: {} as any,
        session: {
          ...baseSession,
          actualStart: new Date("2026-07-09T01:00:00Z"),
        },
        clockEvents: [],
        policy: defaultPolicy,
        evaluatedAt: new Date("2026-07-09T10:00:00Z"),
      };
      const result = engine.evaluate(context);
      expect(result.filter((v) => v.code === "UNSCHEDULED_ATTENDANCE")).toHaveLength(0);
    });
  });

  describe("OvertimeRule", () => {
    it("should return violation if session type is OT", () => {
      const context: ReconciliationContext = {
        assignment: {} as any,
        session: {
          ...baseSession,
          sessionType: "OT",
          actualStart: new Date("2026-07-09T01:00:00Z"),
          actualEnd: new Date("2026-07-09T03:00:00Z"),
        },
        clockEvents: [],
        policy: defaultPolicy,
        evaluatedAt: new Date("2026-07-09T10:00:00Z"),
      };
      const result = engine.evaluate(context);
      const otViolation = result.find((v) => v.code === "OVERTIME");
      expect(otViolation).toBeDefined();
      expect(otViolation?.severity).toBe("INFO");
      expect(otViolation?.metadata?.overtimeMinutes).toBe(120);
    });

    it("should return violation if worked time exceeds planned by more than policy.overtimeMinMinutes", () => {
      const context: ReconciliationContext = {
        assignment: {} as any,
        session: {
          ...baseSession,
          actualStart: new Date("2026-07-09T01:00:00Z"), // 08:00 (planned)
          actualEnd: new Date("2026-07-09T05:45:00Z"), // 12:45 (planned is 12:00, worked 45 mins extra, min is 30)
        },
        clockEvents: [],
        policy: defaultPolicy,
        evaluatedAt: new Date("2026-07-09T10:00:00Z"),
      };
      const result = engine.evaluate(context);
      const otViolation = result.find((v) => v.code === "OVERTIME");
      expect(otViolation).toBeDefined();
      expect(otViolation?.severity).toBe("INFO");
      expect(otViolation?.metadata?.overtimeMinutes).toBe(45);
    });
  });
});
