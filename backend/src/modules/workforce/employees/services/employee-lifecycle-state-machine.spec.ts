import { assertStatusTransition, assertLifecycleOperation } from "./employee-lifecycle-state-machine";

describe("EmployeeLifecycleStateMachine", () => {
  describe("assertStatusTransition", () => {
    it("allows probation → working", () => {
      expect(() => assertStatusTransition("probation", "working")).not.toThrow();
    });

    it("allows working → leave", () => {
      expect(() => assertStatusTransition("working", "leave")).not.toThrow();
    });

    it("allows working → suspended", () => {
      expect(() => assertStatusTransition("working", "suspended")).not.toThrow();
    });

    it("allows working → retired", () => {
      expect(() => assertStatusTransition("working", "retired")).not.toThrow();
    });

    it("allows leave → working", () => {
      expect(() => assertStatusTransition("leave", "working")).not.toThrow();
    });

    it("allows suspended → working", () => {
      expect(() => assertStatusTransition("suspended", "working")).not.toThrow();
    });

    it("blocks retire → any", () => {
      expect(() => assertStatusTransition("retired", "terminated")).toThrow();
    });

    it("blocks terminated → any status change", () => {
      expect(() => assertStatusTransition("terminated", "working")).toThrow();
    });

    it("blocks direct → terminated through status change", () => {
      expect(() => assertStatusTransition("working", "terminated")).toThrow();
    });

    it("blocks same-status transition", () => {
      expect(() => assertStatusTransition("working", "working")).toThrow();
    });

    it("blocks invalid transition", () => {
      expect(() => assertStatusTransition("probation", "retired")).toThrow();
    });
  });

  describe("assertLifecycleOperation", () => {
    it("allows change_status for active employee", () => {
      const employee = { id: "e1", status: "working", deletedAt: null };
      expect(() =>
        assertLifecycleOperation("change_status", employee, { toStatus: "leave" }),
      ).not.toThrow();
    });

    it("blocks change_status for archived employee", () => {
      const employee = { id: "e1", status: "working", deletedAt: new Date() };
      expect(() =>
        assertLifecycleOperation("change_status", employee, { toStatus: "leave" }),
      ).toThrow();
    });

    it("allows schedule_termination for active", () => {
      const employee = { id: "e1", status: "working" };
      expect(() => assertLifecycleOperation("schedule_termination", employee)).not.toThrow();
    });

    it("blocks schedule_termination for terminated", () => {
      const employee = { id: "e1", status: "terminated" };
      expect(() => assertLifecycleOperation("schedule_termination", employee)).toThrow();
    });

    it("blocks schedule_termination for archived", () => {
      const employee = { id: "e1", status: "working", deletedAt: new Date() };
      expect(() => assertLifecycleOperation("execute_termination", employee)).toThrow();
    });

    it("allows request_transfer for active", () => {
      const employee = { id: "e1", status: "working" };
      expect(() => assertLifecycleOperation("request_transfer", employee)).not.toThrow();
    });

    it("blocks request_transfer for terminated", () => {
      const employee = { id: "e1", status: "terminated" };
      expect(() => assertLifecycleOperation("request_transfer", employee)).toThrow();
    });

    it("blocks request_transfer for retired", () => {
      const employee = { id: "e1", status: "retired" };
      expect(() => assertLifecycleOperation("request_transfer", employee)).toThrow();
    });

    it("blocks apply_transfer for terminated", () => {
      const employee = { id: "e1", status: "terminated" };
      expect(() => assertLifecycleOperation("apply_transfer", employee)).toThrow();
    });

    it("allows restore_archive for archived", () => {
      const employee = { id: "e1", status: "working", deletedAt: new Date() };
      expect(() => assertLifecycleOperation("restore_archive", employee)).not.toThrow();
    });

    it("blocks restore_archive for not archived", () => {
      const employee = { id: "e1", deletedAt: null };
      expect(() => assertLifecycleOperation("restore_archive", employee)).toThrow();
    });

    it("allows rehire for terminated", () => {
      const employee = { id: "e1", status: "terminated" };
      expect(() => assertLifecycleOperation("rehire", employee)).not.toThrow();
    });

    it("blocks rehire for working status", () => {
      const employee = { id: "e1", status: "working" };
      expect(() => assertLifecycleOperation("rehire", employee)).toThrow();
    });
  });
});
