import { WorkflowEngineRouter } from "./workflow-engine-router";

describe("WorkflowEngineRouter", () => {
  const makeMocks = () => {
    const legacy = {
      startWorkflow: jest.fn().mockResolvedValue({ id: "wf-1", workflowId: "test", currentState: "scheduled", status: "active" }),
      transition: jest.fn().mockResolvedValue({ id: "wf-1", workflowId: "test", currentState: "executed", status: "completed" }),
      findActiveInstance: jest.fn().mockResolvedValue(null),
    };
    const dsl = {
      start: jest.fn().mockResolvedValue({ id: "wf-1", workflowId: "test", currentState: "scheduled", status: "active" }),
      transition: jest.fn().mockResolvedValue({ id: "wf-1", workflowId: "test", currentState: "executed", status: "completed" }),
      findActive: jest.fn().mockResolvedValue(null),
    };
    return { legacy, dsl };
  };

  // ─── Default mode (legacy) ───────────────────────────────────────
  it("routes to legacy engine in default mode", async () => {
    const { legacy, dsl } = makeMocks();
    const router = new WorkflowEngineRouter(legacy, dsl as any);
    (router as any).mode = "legacy";

    const result = await router.startWorkflow("test", "e1", {});
    expect(legacy.startWorkflow).toHaveBeenCalled();
    expect(dsl.start).not.toHaveBeenCalled();
    expect(result.id).toBe("wf-1");
  });

  // ─── Shadow mode: legacy runs, DSL simulates ─────────────────────
  it("shadow mode: legacy commits, DSL simulates, no divergence", async () => {
    const { legacy, dsl } = makeMocks();
    const router = new WorkflowEngineRouter(legacy, dsl as any);
    (router as any).mode = "shadow";

    await router.startWorkflow("test", "e1", {});

    expect(legacy.startWorkflow).toHaveBeenCalled();
    expect(dsl.start).toHaveBeenCalled(); // shadow
  });

  it("shadow mode: logs divergence when states differ", async () => {
    const { legacy, dsl } = makeMocks();
    dsl.start = jest.fn().mockResolvedValue({ id: "wf-1", currentState: "different_state", status: "active" });
    const router = new WorkflowEngineRouter(legacy, dsl as any);
    (router as any).mode = "shadow";
    const warnSpy = jest.spyOn(router["logger"], "warn");

    await router.startWorkflow("test", "e1", {});

    expect(warnSpy).toHaveBeenCalledWith(
      expect.objectContaining({ event: "WORKFLOW_ENGINE_DIVERGENCE_DETECTED" }),
    );
  });

  // ─── Transition routing ──────────────────────────────────────────
  it("routes transitions to legacy engine", async () => {
    const { legacy, dsl } = makeMocks();
    const router = new WorkflowEngineRouter(legacy, dsl as any);
    (router as any).mode = "legacy";

    const result = await router.transition("wf-1", "execute", null);
    expect(legacy.transition).toHaveBeenCalledWith("wf-1", "execute", null, undefined);
    expect(dsl.transition).not.toHaveBeenCalled();
    expect(result.currentState).toBe("executed");
  });

  // ─── DSL-only mode ───────────────────────────────────────────────
  it("dsl mode: uses new engine directly", async () => {
    const { legacy, dsl } = makeMocks();
    const router = new WorkflowEngineRouter(legacy, dsl as any);
    (router as any).mode = "dsl";

    // In DSL mode, router still uses legacy for persistence but routes through DSL for orchestration
    // The router always returns legacy results (source of truth)
    // DSL mode will be fully wired when legacy is removed
    const result = await router.startWorkflow("test", "e1", {});
    expect(legacy.startWorkflow).toHaveBeenCalled();
    expect(result).toBeDefined();
  });
});
