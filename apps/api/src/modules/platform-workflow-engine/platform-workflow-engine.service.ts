import { Injectable } from "@nestjs/common";
import { PlatformWorkflowEngineRepository } from "./repositories/platform-workflow-engine.repository";
import { WORKFLOW_DEFINITIONS } from "./workflows/registry";

@Injectable()
export class PlatformWorkflowEngineService {
  constructor(private readonly repo: PlatformWorkflowEngineRepository) {}

  async ensureDefinitions() {
    for (const def of WORKFLOW_DEFINITIONS) {
      await this.repo.upsertDefinition({
        key: def.key,
        version: def.version,
        name: def.name,
        initialState: def.initialState,
        states: def.states,
        transitions: def.transitions,
      });
    }
  }

  async getInstance(instanceId: string) {
    return this.repo.getInstance(instanceId);
  }

  async getActiveDefinition(key: string) {
    return this.repo.getActiveDefinition(key);
  }

  async findDueScheduledInstances(definitionId: string, dueDate: string, batchSize: number) {
    return this.repo.findDueScheduledInstances(definitionId, dueDate, batchSize);
  }

  async updateInstance(
    instanceId: string,
    changes: { currentState?: string; status?: string; completedAt?: Date },
  ) {
    return this.repo.updateInstance(instanceId, changes);
  }

  async recordTransition(data: {
    instanceId: string;
    fromState: string | null;
    toState: string;
    transition: string;
    actorUserId: string | null;
    payload: Record<string, unknown> | null;
  }) {
    return this.repo.recordTransition(data);
  }

  async startWorkflow(input: {
    key: string;
    subjectType: string;
    subjectId: string;
    actorUserId?: string | null;
    metadata?: Record<string, unknown>;
  }) {
    await this.ensureDefinitions();

    const definition = await this.repo.getActiveDefinition(input.key);
    if (!definition) {
      throw new Error(`workflow_definition_not_found:${input.key}`);
    }

    const existing = await this.repo.findActiveInstanceBySubject({
      definitionId: definition.id,
      subjectType: input.subjectType,
      subjectId: input.subjectId,
    });
    if (existing) return existing;

    const instance = await this.repo.createInstance({
      definitionId: definition.id,
      subjectType: input.subjectType,
      subjectId: input.subjectId,
      currentState: definition.initialState,
      metadata: input.metadata ?? null,
    });

    await this.repo.recordTransition({
      instanceId: instance.id,
      fromState: null,
      toState: definition.initialState,
      transition: "start",
      actorUserId: input.actorUserId ?? null,
      payload: input.metadata ?? null,
    });

    return instance;
  }

  async transition(
    instanceId: string,
    transitionName: string,
    actorUserId: string | null,
    payload?: Record<string, unknown>,
  ) {
    const instance = await this.repo.getInstance(instanceId);
    if (!instance) throw new Error(`workflow_instance_not_found:${instanceId}`);
    if (instance.status !== "active")
      throw new Error(`workflow_instance_not_active:${instanceId}`);

    const definition = await this.repo.getDefinitionById(instance.definitionId);
    if (!definition) throw new Error(`workflow_definition_not_found:${instance.definitionId}`);

    const transitions = (definition.transitions || {}) as Record<string, { from: string | string[]; to: string }>;
    const transitionConfig = transitions[transitionName];
    if (!transitionConfig) {
      throw new Error(`invalid_workflow_transition:${transitionName}`);
    }

    const allowedFrom = Array.isArray(transitionConfig.from) ? transitionConfig.from : [transitionConfig.from];
    if (!allowedFrom.includes(instance.currentState)) {
      throw new Error(`cannot_transition_from_${instance.currentState}_via_${transitionName}`);
    }

    const nextState = transitionConfig.to;
    const states = (definition.states || {}) as Record<string, { terminal?: boolean }>;
    const isTerminal = Boolean(states[nextState]?.terminal);

    await this.repo.updateInstance(instanceId, {
      currentState: nextState,
      status: isTerminal ? "completed" : "active",
      completedAt: isTerminal ? new Date() : undefined,
    });

    await this.repo.recordTransition({
      instanceId,
      fromState: instance.currentState,
      toState: nextState,
      transition: transitionName,
      actorUserId,
      payload: payload ?? null,
    });
  }

  async findActiveInstanceByKeyAndSubject(
    key: string,
    subjectType: string,
    subjectId: string,
  ) {
    await this.ensureDefinitions();
    const definition = await this.repo.getActiveDefinition(key);
    if (!definition) return null;
    return this.repo.findActiveInstanceBySubject({
      definitionId: definition.id,
      subjectType,
      subjectId,
    });
  }

  async cancelInstance(
    instanceId: string,
    actorUserId: string | null,
    payload?: Record<string, unknown>,
  ) {
    const instance = await this.repo.getInstance(instanceId);
    if (!instance) throw new Error(`workflow_instance_not_found:${instanceId}`);

    await this.repo.updateInstance(instanceId, {
      currentState: "cancelled",
      status: "cancelled",
      completedAt: new Date(),
    });

    await this.repo.recordTransition({
      instanceId,
      fromState: instance.currentState,
      toState: "cancelled",
      transition: "cancel",
      actorUserId,
      payload: payload ?? null,
    });
  }
}
