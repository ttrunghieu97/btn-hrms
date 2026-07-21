import { ReconciliationService, type AttendanceEvent, type AssignmentWindow } from "./reconciliation.service";

function e(
  id: string,
  employeeId: string,
  type: "CLOCK_IN" | "CLOCK_OUT",
  minutes: number,
  source: "DEVICE" | "MANUAL" = "DEVICE",
): AttendanceEvent {
  const base = new Date("2026-06-25T08:00:00Z"); // Thursday
  return { id, employeeId, type, timestamp: new Date(base.getTime() + minutes * 60_000), source };
}

function a(
  id: string,
  employeeId: string,
  startMin: number,
  endMin: number,
): AssignmentWindow {
  const base = new Date("2026-06-25T08:00:00Z");
  return {
    id,
    employeeId,
    scheduledStart: new Date(base.getTime() + startMin * 60_000),
    scheduledEnd: new Date(base.getTime() + endMin * 60_000),
  };
}

describe("ReconciliationService", () => {
  let service: ReconciliationService;

  beforeEach(() => {
    service = new ReconciliationService();
  });

  // Must-pass suite

  it("NO_SHOW — no events in window", () => {
    const result = service.reconcile([], [a("a1", "emp1", 0, 480)]);
    expect(result.sessions[0]!.status).toBe("NO_SHOW");
    expect(result.stats.noShowCount).toBe(1);
    expect(result.violations.some((v) => v.type === "NO_SHOW")).toBe(true);
  });

  it("COMPLETED — full clock-in/clock-out", () => {
    const events = [
      e("e1", "emp1", "CLOCK_IN", 0),
      e("e2", "emp1", "CLOCK_OUT", 480),
    ];
    const result = service.reconcile(events, [a("a1", "emp1", 0, 480)]);
    expect(result.sessions[0]!.status).toBe("COMPLETED");
    expect(result.stats.completionRate).toBe(1);
  });

  it("LATE — first event > scheduled start + threshold", () => {
    const events = [
      e("e1", "emp1", "CLOCK_IN", 45), // 45 min late
      e("e2", "emp1", "CLOCK_OUT", 495), // 15 min after end, within grace 30
    ];
    const result = service.reconcile(events, [a("a1", "emp1", 0, 480)], { lateThresholdMinutes: 15, graceBeforeMinutes: 60 });
    // 45 > 15 → LATE
    expect(result.violations.some((v) => v.type === "LATE")).toBe(true);
  });

  it("EARLY_LEAVE — clock-out before scheduled end", () => {
    const events = [
      e("e1", "emp1", "CLOCK_IN", 0),
      e("e2", "emp1", "CLOCK_OUT", 420), // 1h early
    ];
    // Use larger grace before to capture clock-out well before scheduled end
    const result = service.reconcile(events, [a("a1", "emp1", 0, 480)], { lateThresholdMinutes: 15, graceBeforeMinutes: 60, graceAfterMinutes: 60 });
    expect(result.violations.some((v) => v.type === "EARLY_LEAVE")).toBe(true);
  });

  it("OVERTIME — clock-out after scheduled end", () => {
    const events = [
      e("e1", "emp1", "CLOCK_IN", 0),
      e("e2", "emp1", "CLOCK_OUT", 495), // 15min overtime, within grace
    ];
    const result = service.reconcile(events, [a("a1", "emp1", 0, 480)], { lateThresholdMinutes: 5, graceAfterMinutes: 60 });
    expect(result.violations.some((v) => v.type === "OVERTIME")).toBe(true);
  });

  it("PARTIAL — missing clock-out", () => {
    const events = [e("e1", "emp1", "CLOCK_IN", 0)];
    const result = service.reconcile(events, [a("a1", "emp1", 0, 480)]);
    expect(result.sessions[0]!.status).toBe("PARTIAL");
  });

  it("DUPLICATE CLOCK-IN — multiple clock-ins logged", () => {
    const events = [
      e("e1", "emp1", "CLOCK_IN", 0),
      e("e2", "emp1", "CLOCK_IN", 5),
      e("e3", "emp1", "CLOCK_OUT", 480),
    ];
    const result = service.reconcile(events, [a("a1", "emp1", 0, 480)]);
    expect(result.violations.some((v) => v.type === "DOUBLE_CLOCK_IN")).toBe(true);
  });

  it("INVALID — clock-out before clock-in", () => {
    const events = [
      e("e1", "emp1", "CLOCK_OUT", 0),
      e("e2", "emp1", "CLOCK_IN", 480),
    ];
    const result = service.reconcile(events, [a("a1", "emp1", 0, 480)]);
    expect(result.sessions[0]!.status).toBe("INVALID");
  });

  it("determinism — same input always same output", () => {
    const events = [
      e("e1", "emp1", "CLOCK_IN", 0),
      e("e2", "emp1", "CLOCK_OUT", 480),
    ];
    const asgns = [a("a1", "emp1", 0, 480)];
    const r1 = service.reconcile(events, asgns);
    const r2 = service.reconcile(events, asgns);
    expect(r1.sessions).toEqual(r2.sessions);
    expect(r1.violations).toEqual(r2.violations);
  });

  it("deduplicate — duplicate event IDs ignored", () => {
    const events = [
      e("e1", "emp1", "CLOCK_IN", 0),
      e("e1", "emp1", "CLOCK_IN", 0), // duplicate
      e("e2", "emp1", "CLOCK_OUT", 480),
    ];
    const result = service.reconcile(events, [a("a1", "emp1", 0, 480)]);
    expect(result.sessions[0]!.eventCount).toBe(2);
  });

  it("multiple employees reconciled independently", () => {
    const events = [
      e("e1", "emp1", "CLOCK_IN", 0),
      e("e2", "emp1", "CLOCK_OUT", 480),
      e("e3", "emp2", "CLOCK_IN", 10),
    ];
    const asgns = [
      a("a1", "emp1", 0, 480),
      a("a2", "emp2", 0, 480),
    ];
    const result = service.reconcile(events, asgns);
    expect(result.sessions[0]!.status).toBe("COMPLETED");
    expect(result.sessions[1]!.status).toBe("PARTIAL");
    expect(result.stats.totalAssignments).toBe(2);
  });
});
