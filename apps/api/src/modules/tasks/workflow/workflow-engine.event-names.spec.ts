/**
 * workflow-engine.event-names.spec.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Asserts that every task transition emits the correct domain event name.
 * Covers the three bugs fixed in task-workflow-hardening:
 *   - reject must emit task.declined (not task.assigned)
 *   - unassign must emit task.unassigned (not task.created)
 *   - cancel must emit task.cancelled
 */

import { WorkflowEngine } from "../../platform-workflow-engine/tasks/workflow-engine";

describe("WorkflowEngine – transitionToDomainEvent mapping", () => {
  // We test the private method via cast; alternatively, trigger a full execute
  // but that needs DB/Kafka — here we just unit-test the mapping table directly.

  function getEngine(): WorkflowEngine {
    // Provide stub constructor dependencies
    return new WorkflowEngine(
      {} as any, // tasksRepo
      {} as any, // taskEvents
      {} as any, // eventPublisher
      {} as any, // transitionValidator
      {} as any, // workflowActionPort
      {} as any, // workflowRepo
      {} as any, // sideEffects
    );
  }

  const engine = getEngine();
  const mapping = (engine as any).transitionToDomainEvent.bind(engine);

  it("maps reject → task.declined", () => {
    expect(mapping("reject")).toBe("task.declined");
  });

  it("maps unassign → task.unassigned", () => {
    expect(mapping("unassign")).toBe("task.unassigned");
  });

  it("maps cancel → task.cancelled", () => {
    expect(mapping("cancel")).toBe("task.cancelled");
  });

  it("maps assign → task.assigned", () => {
    expect(mapping("assign")).toBe("task.assigned");
  });

  it("maps accept → task.accepted", () => {
    expect(mapping("accept")).toBe("task.accepted");
  });

  it("maps submit → task.submitted", () => {
    expect(mapping("submit")).toBe("task.submitted");
  });

  it("maps resubmit → task.submitted", () => {
    expect(mapping("resubmit")).toBe("task.submitted");
  });

  it("maps approve → task.completed", () => {
    expect(mapping("approve")).toBe("task.completed");
  });

  it("maps request_revision → task.revision_requested", () => {
    expect(mapping("request_revision")).toBe("task.revision_requested");
  });
});
