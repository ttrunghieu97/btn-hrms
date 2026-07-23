import { GenericWorkflowEngine } from "./workflow-engine";
import { createDefinition, type WorkflowDefinition } from "./workflow-definition";

describe("GenericWorkflowEngine", () => {
  const terminatedDef = createDefinition({
    id: "employee_termination",
    version: 1,
    name: "Test Termination",
    initialState: "scheduled",
    states: {
      scheduled: {
        onEnter: [],
        transitions: [
          { event: "execute", target: "executed" },
          { event: "cancel", target: "cancelled" },
        ],
      },
      executed: { transitions: [] },
      cancelled: { transitions: [] },
    },
  });

  function mockPort(overrides?: any) {
    const instances = new Map<string, any>();
    const port = {
      getDefinition: jest.fn().mockResolvedValue(terminatedDef),
      getInstance: jest.fn().mockImplementation((id: string) => Promise.resolve(instances.get(id) ?? null)),
      createInstance: jest.fn().mockImplementation(async (def: WorkflowDefinition, subjectId: string, context: Record<string, unknown> = {}) => {
        const inst = {
          id: "wf-" + Math.random().toString(36).slice(2),
          workflowId: def.id,
          version: def.version,
          subjectId,
          currentState: def.initialState,
          context,
          status: "active" as const,
        };
        instances.set(inst.id, inst);
        return inst;
      }),
      applyTransition: jest.fn().mockImplementation(async (record: any) => {
        const inst = instances.get(record.instanceId);
        if (inst) {
          inst.currentState = record.toState;
          inst.status = record.toState === "executed" || record.toState === "cancelled" || record.toState === "rejected"
            ? "completed" : "active";
          instances.set(record.instanceId, inst);
        }
      }),
      findActiveBySubject: jest.fn().mockResolvedValue(null),
      ...overrides,
    };
    return { port, instances };
  }

  // ─── State transitions ──────────────────────────────────────────
  it("valid event changes state", async () => {
    const { port, instances } = mockPort();
    const engine = new GenericWorkflowEngine(port);

    const instance = await engine.start("employee_termination", "e1", { reason: "test" });
    expect(instance.currentState).toBe("scheduled");

    const updated = await engine.transition(instance.id, "execute", null);
    expect(updated.currentState).toBe("executed");
  });

  // ─── Invalid transitions ────────────────────────────────────────
  it("unknown event is rejected", async () => {
    const { port } = mockPort();
    const engine = new GenericWorkflowEngine(port);

    const instance = await engine.start("employee_termination", "e1");
    await expect(engine.transition(instance.id, "nonexistent", null)).rejects.toThrow("No transition");
  });

  it("transition from terminal state is rejected", async () => {
    const { port, instances } = mockPort();
    const engine = new GenericWorkflowEngine(port);

    const instance = await engine.start("employee_termination", "e1");
    await engine.transition(instance.id, "cancel", null); // state = cancelled
    await expect(engine.transition(instance.id, "execute", null)).rejects.toThrow("is not active");
  });

  // ─── Guard evaluation ───────────────────────────────────────────
  it("guard true allows transition", async () => {
    const def = createDefinition({
      ...terminatedDef,
      id: "test-guard-true",
      states: {
        active: {
          transitions: [
            {
              event: "promote",
              target: "done",
              guard: { type: "expression" as const, expression: 'context.role == "admin"' },
            },
          ],
        },
        done: { transitions: [] },
      },
      initialState: "active",
    });

    const port = mockPort({
      getDefinition: jest.fn().mockResolvedValue(def),
    }).port;
    const engine = new GenericWorkflowEngine(port);

    const instance = await engine.start("test-guard-true", "e1", { role: "admin" });
    const updated = await engine.transition(instance.id, "promote", null);
    expect(updated.currentState).toBe("done");
  });

  it("guard false blocks transition", async () => {
    const def = createDefinition({
      ...terminatedDef,
      id: "test-guard-false",
      states: {
        active: {
          transitions: [
            {
              event: "promote",
              target: "done",
              guard: { type: "expression" as const, expression: 'context.role == "admin"' },
            },
          ],
        },
        done: { transitions: [] },
      },
      initialState: "active",
    });

    const port = mockPort({
      getDefinition: jest.fn().mockResolvedValue(def),
    }).port;
    const engine = new GenericWorkflowEngine(port);

    const instance = await engine.start("test-guard-false", "e1", { role: "user" });
    await expect(engine.transition(instance.id, "promote", null)).rejects.toThrow("Guard blocked");
  });

  // ─── Determinism ────────────────────────────────────────────────
  it("same input produces same state", async () => {
    const { port } = mockPort();
    const engine = new GenericWorkflowEngine(port);

    const instance = await engine.start("employee_termination", "e1");
    const updated = await engine.transition(instance.id, "execute", null);
    expect(updated.currentState).toBe("executed");
    const updated2 = await engine.transition(instance.id, "execute", null).catch(() => null);
    expect(updated2).toBeNull(); // second transition fails
  });
});
