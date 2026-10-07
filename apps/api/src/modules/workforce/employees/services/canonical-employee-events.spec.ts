import { EmployeeCreatedEvent } from "../../../../core/events/events/employee-created.event";
import { EmployeeHiredEvent } from "../../../../core/events/events/employee-hired.event";
import { EmployeeStatusChangedEvent } from "../../../../core/events/events/employee-status-changed.event";
import { EmployeeTerminatedEvent } from "../../../../core/events/events/employee-terminated.event";
import { EmployeeRehiredEvent } from "../../../../core/events/events/employee-rehired.event";
import { EmployeeTransferRequestedEvent } from "../../../../core/events/events/employee-transfer-requested.event";
import { EmployeeTransferAppliedEvent } from "../../../../core/events/events/employee-transfer-applied.event";
import { EmployeeTransferApprovedEvent } from "../../../../core/events/events/employee-transfer-approved.event";
import { EmployeeTransferCancelledEvent } from "../../../../core/events/events/employee-transfer-cancelled.event";
import { EmployeeTerminationScheduledEvent } from "../../../../core/events/events/employee-termination-scheduled.event";
import { EmployeeTerminationExecutedEvent } from "../../../../core/events/events/employee-termination-executed.event";
import { EmployeeTerminationCancelledEvent } from "../../../../core/events/events/employee-termination-cancelled.event";

describe("Canonical Employee Events", () => {
  // ─── EmployeeCreated ──────────────────────────────────────────────────────
  describe("EmployeeCreatedEvent", () => {
    it("has static eventType and eventVersion", () => {
      expect(EmployeeCreatedEvent.eventType).toBe("workforce.employee.created.v1");
      expect(EmployeeCreatedEvent.eventVersion).toBe(1);
    });

    it("produces correctly typed payload", () => {
      const event = new EmployeeCreatedEvent({ employeeId: "e1" });
      expect(event.data.employeeId).toBe("e1");
      expect(typeof event.scopeId).toBe("string");
      expect(event.scopeId.length).toBeGreaterThan(0);
    });
  });

  // ─── EmployeeHired ────────────────────────────────────────────────────────
  describe("EmployeeHiredEvent", () => {
    it("has static eventType and eventVersion", () => {
      expect(EmployeeHiredEvent.eventType).toBe("workforce.employee.hired.v1");
      expect(EmployeeHiredEvent.eventVersion).toBe(1);
    });

    it("produces correctly typed payload", () => {
      const event = new EmployeeHiredEvent({
        scopeId: "company-1",
        employeeId: "e1",
        userId: "u1",
        hiredByUserId: "hr-1",
      });
      expect(event.data.employeeId).toBe("e1");
      expect(event.data.userId).toBe("u1");
      expect(event.data.hiredByUserId).toBe("hr-1");
      expect(event.data.scopeId).toBe("company-1");
    });
  });

  // ─── EmployeeStatusChanged ────────────────────────────────────────────────
  describe("EmployeeStatusChangedEvent", () => {
    it("has static eventType and eventVersion", () => {
      expect(EmployeeStatusChangedEvent.eventType).toBe("workforce.employee.status-changed.v1");
      expect(EmployeeStatusChangedEvent.eventVersion).toBe(1);
    });

    it("produces correctly typed payload", () => {
      const event = new EmployeeStatusChangedEvent({
        employeeId: "e1",
        fromStatus: "working",
        toStatus: "leave",
        changedByUserId: "u1",
        effectiveDate: "2026-07-01",
        reason: "Personal leave",
      });
      expect(event.data.employeeId).toBe("e1");
      expect(event.data.fromStatus).toBe("working");
      expect(event.data.toStatus).toBe("leave");
      expect(event.data.effectiveDate).toBe("2026-07-01");
    });
  });

  // ─── EmployeeTerminated ────────────────────────────────────────────────────
  describe("EmployeeTerminatedEvent", () => {
    it("has static eventType and eventVersion", () => {
      expect(EmployeeTerminatedEvent.eventType).toBe("workforce.employee.terminated.v1");
      expect(EmployeeTerminatedEvent.eventVersion).toBe(1);
    });

    it("produces correctly typed payload", () => {
      const event = new EmployeeTerminatedEvent({
        employeeId: "e1",
        terminatedByUserId: "u1",
        effectiveDate: "2026-07-15",
        reason: "Resigned",
      });
      expect(event.data.employeeId).toBe("e1");
      expect(event.data.reason).toBe("Resigned");
    });
  });

  // ─── EmployeeRehired ──────────────────────────────────────────────────────
  describe("EmployeeRehiredEvent", () => {
    it("has static eventType and eventVersion", () => {
      expect(EmployeeRehiredEvent.eventType).toBe("workforce.employee.rehired.v1");
      expect(EmployeeRehiredEvent.eventVersion).toBe(1);
    });

    it("produces correctly typed payload", () => {
      const event = new EmployeeRehiredEvent({
        employeeId: "e1",
        rehiredByUserId: "u1",
        hireDate: "2026-08-01",
        status: "working",
        departmentId: "dept-2",
        positionId: "pos-2",
        newEmploymentRecordId: "er-2",
      });
      expect(event.data.employeeId).toBe("e1");
      expect(event.data.status).toBe("working");
    });
  });

  // ─── EmployeeTransferRequested ────────────────────────────────────────────
  describe("EmployeeTransferRequestedEvent", () => {
    it("has static eventType and eventVersion", () => {
      expect(EmployeeTransferRequestedEvent.eventType).toBe("workforce.employee.transfer-requested.v1");
      expect(EmployeeTransferRequestedEvent.eventVersion).toBe(1);
    });

    it("produces correctly typed payload", () => {
      const event = new EmployeeTransferRequestedEvent({
        employeeId: "e1",
        requestedByUserId: "u1",
        effectiveDate: "2026-08-01",
        toDepartmentId: "dept-2",
        toPositionId: "pos-2",
        toManagerEmployeeId: "mgr-2",
        reason: "Restructuring",
        workflowInstanceId: "wf-1",
      });
      expect(event.data.employeeId).toBe("e1");
      expect(event.data.toDepartmentId).toBe("dept-2");
    });
  });

  // ─── EmployeeTransferApproved ────────────────────────────────────────────
  describe("EmployeeTransferApprovedEvent", () => {
    it("has static eventType and eventVersion", () => {
      expect(EmployeeTransferApprovedEvent.eventType).toBe("workforce.employee.transfer-approved.v1");
      expect(EmployeeTransferApprovedEvent.eventVersion).toBe(1);
    });
  });

  // ─── EmployeeTransferApplied ──────────────────────────────────────────────
  describe("EmployeeTransferAppliedEvent", () => {
    it("has static eventType and eventVersion", () => {
      expect(EmployeeTransferAppliedEvent.eventType).toBe("workforce.employee.transfer-applied.v1");
      expect(EmployeeTransferAppliedEvent.eventVersion).toBe(1);
    });
  });

  // ─── EmployeeTransferCancelled ────────────────────────────────────────────
  describe("EmployeeTransferCancelledEvent", () => {
    it("has static eventType and eventVersion", () => {
      expect(EmployeeTransferCancelledEvent.eventType).toBe("workforce.employee.transfer-cancelled.v1");
      expect(EmployeeTransferCancelledEvent.eventVersion).toBe(1);
    });
  });

  // ─── Termination scheduled/executed/cancelled ──────────────────────────────
  describe("EmployeeTerminationScheduledEvent", () => {
    it("has static eventType and eventVersion", () => {
      expect(EmployeeTerminationScheduledEvent.eventType).toBe("workforce.employee.termination-scheduled.v1");
      expect(EmployeeTerminationScheduledEvent.eventVersion).toBe(1);
    });
  });

  describe("EmployeeTerminationExecutedEvent", () => {
    it("has static eventType and eventVersion", () => {
      expect(EmployeeTerminationExecutedEvent.eventType).toBe("workforce.employee.termination-executed.v1");
      expect(EmployeeTerminationExecutedEvent.eventVersion).toBe(1);
    });
  });

  describe("EmployeeTerminationCancelledEvent", () => {
    it("has static eventType and eventVersion", () => {
      expect(EmployeeTerminationCancelledEvent.eventType).toBe("workforce.employee.termination-cancelled.v1");
      expect(EmployeeTerminationCancelledEvent.eventVersion).toBe(1);
    });
  });

  // ─── Event idempotency / reliability ────────────────────────────────────
  describe("event identity", () => {
    it("all events carry a unique eventId", () => {
      const e1 = new EmployeeStatusChangedEvent({ employeeId: "e1", fromStatus: "a", toStatus: "b", changedByUserId: null, effectiveDate: "2026-01-01", reason: null });
      const e2 = new EmployeeStatusChangedEvent({ employeeId: "e1", fromStatus: "a", toStatus: "b", changedByUserId: null, effectiveDate: "2026-01-01", reason: null });
      expect(e1.eventId).toBeDefined();
      expect(e1.eventId).not.toBe(e2.eventId);
    });

    it("outbox idempotency key is natural eventId", () => {
      const event = new EmployeeTerminatedEvent({ employeeId: "e1", terminatedByUserId: null, effectiveDate: "2026-01-01", reason: "test" });
      expect(typeof event.eventId).toBe("string");
      expect(event.eventId.length).toBeGreaterThan(0);
    });
  });
});
