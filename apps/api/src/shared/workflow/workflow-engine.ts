import { Injectable } from "@nestjs/common";
import type { WorkflowDefinition } from "./workflow-definition";
import type { WorkflowInstance, WorkflowTransitionRecord } from "./workflow-instance.model";
import { evaluateGuard } from "./workflow-guard.engine";

export interface WorkflowEnginePort {
  getDefinition(id: string, version?: number): Promise<WorkflowDefinition | null>;
  createInstance(def: WorkflowDefinition, subjectId: string, context: Record<string, unknown>): Promise<WorkflowInstance>;
  getInstance(instanceId: string): Promise<WorkflowInstance | null>;
  applyTransition(record: WorkflowTransitionRecord): Promise<void>;
  findActiveBySubject(defId: string, subjectType: string, subjectId: string): Promise<WorkflowInstance | null>;
}

/**
 * Generic workflow orchestration engine.
 * Engine only moves state. Business logic lives in use cases and actions.
 */
@Injectable()
export class GenericWorkflowEngine {
  constructor(private readonly port: WorkflowEnginePort) {}

  async start(defId: string, subjectId: string, context: Record<string, unknown> = {}): Promise<WorkflowInstance> {
    const def = await this.port.getDefinition(defId);
    if (!def) throw new Error(`Workflow definition not found: ${defId}`);

    return this.port.createInstance(def, subjectId, context);
  }

  async transition(
    instanceId: string,
    event: string,
    actorUserId: string | null,
    payload?: Record<string, unknown>,
  ): Promise<WorkflowInstance> {
    const instance = await this.port.getInstance(instanceId);
    if (!instance) throw new Error(`Workflow instance not found: ${instanceId}`);
    if (instance.status !== "active") throw new Error(`Workflow instance ${instanceId} is not active`);

    const def = await this.port.getDefinition(instance.workflowId, instance.version);
    if (!def) throw new Error(`Definition ${instance.workflowId} v${instance.version} not found`);

    const state = def.states[instance.currentState];
    if (!state) throw new Error(`Unknown state ${instance.currentState} in definition ${def.id}`);

    const transition = state.transitions.find((t) => t.event === event);
    if (!transition) {
      throw new Error(
        `No transition for event "${event}" from state "${instance.currentState}" ` +
        `in workflow "${def.id}" v${def.version}`,
      );
    }

    // Evaluate guard
    if (!evaluateGuard(transition.guard, instance.context)) {
      throw new Error(`Guard blocked transition "${event}" from "${instance.currentState}"`);
    }

    // Execute actions
    if (transition.actions) {
      for (const action of transition.actions) {
        if (action.type === "side-effect") {
          // Side effects are non-domain: logging, metrics
          // Not executed here; dispatched to configured handler
        }
      }
    }

    // Persist transition
    const record: WorkflowTransitionRecord = {
      instanceId,
      fromState: instance.currentState,
      toState: transition.target,
      transition: event,
      actorUserId,
      payload: payload ?? null,
    };
    await this.port.applyTransition(record);

    const updated = await this.port.getInstance(instanceId);
    return updated!;
  }

  async findActive(defId: string, subjectType: string, subjectId: string): Promise<WorkflowInstance | null> {
    return this.port.findActiveBySubject(defId, subjectType, subjectId);
  }
}
