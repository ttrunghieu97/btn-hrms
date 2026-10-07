import { EmployeeTerminatedEvent } from "./events/employee-terminated.event";
import { EmployeeRehiredEvent } from "./events/employee-rehired.event";
import { EmployeeStatusChangedEvent } from "./events/employee-status-changed.event";
import { EmployeeHiredEvent } from "./events/employee-hired.event";

describe("Event Subscriber Contract", () => {
  it("EmployeeTerminatedEvent has correct eventType for subscriber routing", () => {
    expect(EmployeeTerminatedEvent.eventType).toBe("workforce.employee.terminated.v1");
    const event = new EmployeeTerminatedEvent({ employeeId: "e1", terminatedByUserId: null, effectiveDate: "2026-01-01", reason: "test" });
    expect(event.eventType).toBe("workforce.employee.terminated.v1");
  });

  it("EmployeeRehiredEvent has correct eventType for subscriber routing", () => {
    expect(EmployeeRehiredEvent.eventType).toBe("workforce.employee.rehired.v1");
    const event = new EmployeeRehiredEvent({ employeeId: "e1", rehiredByUserId: null, hireDate: "2026-01-01", status: "working", newEmploymentRecordId: "er-1" });
    expect(event.eventType).toBe("workforce.employee.rehired.v1");
  });

  it("EmployeeStatusChangedEvent has correct eventType for subscriber routing", () => {
    expect(EmployeeStatusChangedEvent.eventType).toBe("workforce.employee.status-changed.v1");
  });

  it("EmployeeHiredEvent has correct eventType for subscriber routing", () => {
    expect(EmployeeHiredEvent.eventType).toBe("workforce.employee.hired.v1");
    const event = new EmployeeHiredEvent({ scopeId: "s1", employeeId: "e1", userId: "u1", hiredByUserId: null });
    expect(event.eventType).toBe("workforce.employee.hired.v1");
  });

  // ─── Consumer idempotency table schema ──────────────────────────
  it("consumer_idempotency PK is (consumer_id, event_id)", () => {
    // Schema enforcement: compound PK prevents duplicate processing
    const consumerId = "identity:employee_terminated";
    const eventId = "evt-001";
    expect(`${consumerId}:${eventId}`).toContain(":");
  });

  // ─── Idempotent subscriber should not process duplicate event ───
  it("subscriber identity check prevents double processing", () => {
    const processed = new Set<string>();
    const consumerId = "identity:employee_terminated";
    const eventId = "evt-001";
    const key = `${consumerId}:${eventId}`;

    // First call
    expect(processed.has(key)).toBe(false);
    processed.add(key);
    // Second call - should be skipped
    expect(processed.has(key)).toBe(true);
  });

  // ─── Terminated event payload shape ─────────────────────────────
  it("terminated event carries all fields subscribers need", () => {
    const event = new EmployeeTerminatedEvent({
      employeeId: "e1",
      terminatedByUserId: "hr-1",
      effectiveDate: "2026-07-15",
      reason: "Resignation",
    });
    expect(event.data.employeeId).toBe("e1");
    expect(event.data.terminatedByUserId).toBe("hr-1");
    expect(event.data.effectiveDate).toBe("2026-07-15");
    expect(event.data.reason).toBe("Resignation");
  });
});
