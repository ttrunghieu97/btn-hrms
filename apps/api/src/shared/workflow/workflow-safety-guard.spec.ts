import { WorkflowSafetyGuard, TransitionLimitExceededError, GuardBudgetExceededError } from "./workflow-safety-guard";

describe("WorkflowSafetyGuard", () => {
  it("allows transitions within limit", () => {
    const guard = new WorkflowSafetyGuard({ maxTransitionsPerInstance: 3 });
    expect(() => {
      guard.assertTransitionAllowed("wf-1");
      guard.assertTransitionAllowed("wf-1");
    }).not.toThrow();
  });

  it("throws when transition limit exceeded", () => {
    const guard = new WorkflowSafetyGuard({ maxTransitionsPerInstance: 2 });
    guard.assertTransitionAllowed("wf-1");
    guard.assertTransitionAllowed("wf-1");
    expect(() => guard.assertTransitionAllowed("wf-1")).toThrow(TransitionLimitExceededError);
  });

  it("per-instance isolation", () => {
    const guard = new WorkflowSafetyGuard({ maxTransitionsPerInstance: 2 });
    guard.assertTransitionAllowed("wf-1");
    guard.assertTransitionAllowed("wf-1"); // wf-1 at limit
    guard.assertTransitionAllowed("wf-2"); // wf-2 allowed
    expect(() => guard.assertTransitionAllowed("wf-1")).toThrow();
    guard.assertTransitionAllowed("wf-2"); // wf-2 second
    expect(() => guard.assertTransitionAllowed("wf-2")).toThrow();
  });

  it("throws when guard budget exceeded", () => {
    const guard = new WorkflowSafetyGuard({ maxGuardEvaluations: 2 });
    guard.startGuardEvaluation("wf-1");
    guard.startGuardEvaluation("wf-1");
    expect(() => guard.startGuardEvaluation("wf-1")).toThrow(GuardBudgetExceededError);
  });

  it("shadow depth tracking throws at limit", () => {
    const guard = new WorkflowSafetyGuard({ maxShadowRecursionDepth: 2 });
    guard.checkShadowDepth("wf-1");
    guard.checkShadowDepth("wf-1");
    expect(() => guard.checkShadowDepth("wf-1")).toThrow("SHADOW_RECURSION_LIMIT");
  });

  it("reset clears counters for instance", () => {
    const guard = new WorkflowSafetyGuard({ maxTransitionsPerInstance: 1 });
    guard.assertTransitionAllowed("wf-1");
    expect(() => guard.assertTransitionAllowed("wf-1")).toThrow();
    guard.resetInstance("wf-1");
    expect(() => guard.assertTransitionAllowed("wf-1")).not.toThrow();
  });

  it("transition count is accurate", () => {
    const guard = new WorkflowSafetyGuard();
    expect(guard.getTransitionCount("wf-1")).toBe(0);
    guard.recordTransition("wf-1");
    guard.recordTransition("wf-1");
    expect(guard.getTransitionCount("wf-1")).toBe(2);
  });
});
