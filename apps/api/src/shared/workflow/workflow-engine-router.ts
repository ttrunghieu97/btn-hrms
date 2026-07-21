/**
 * Routes workflow execution. Mode is always "legacy" after USE_LEGACY_WORKFLOW_ENGINE removal.
 * shadow/dsl modes removed from env — kept for DI wiring.
 */

import { Injectable } from "@nestjs/common";
import { GenericWorkflowEngine } from "./workflow-engine";
import { WorkflowEngineRouterPort } from "./workflow-engine-router.port";
import type { WorkflowInstance } from "./workflow-instance.model";
import type { WorkflowDefinition } from "./workflow-definition";
import { StructuredLogger } from "../observability/structured-logger";

export type EngineMode = "legacy" | "shadow" | "dsl";

function resolveMode(): EngineMode {
  return "legacy";
}

@Injectable()
export class WorkflowEngineRouter {
  private readonly mode: EngineMode;
  private readonly logger: StructuredLogger;

  constructor(
    private readonly legacy: WorkflowEngineRouterPort,
    private readonly dsl: GenericWorkflowEngine,
  ) {
    this.mode = resolveMode();
    this.logger = new StructuredLogger(WorkflowEngineRouter.name);
  }

  get engineMode(): EngineMode {
    return this.mode;
  }

  async startWorkflow(defId: string, subjectId: string, context: Record<string, unknown> = {}) {
    // Legacy runs first (source of truth)
    const legacyInstance = await this.legacy.startWorkflow(defId, subjectId, context);

    if (this.mode === "shadow") {
      try {
        const dslInstance = await this.dsl.start(defId, subjectId, context);
        if (!this.areInstancesEqual(legacyInstance, dslInstance)) {
          this.logger.warn({
            event: "WORKFLOW_ENGINE_DIVERGENCE_DETECTED",
            stage: "start",
            workflowId: defId,
            subjectId,
            legacyState: legacyInstance.currentState,
            dslState: dslInstance.currentState,
          });
        }
      } catch (err) {
        this.logger.error({
          event: "workflow.engine.shadow_failed",
          workflowId: defId,
          subjectId,
          error: String(err),
        });
      }
    }

    return legacyInstance;
  }

  async transition(
    instanceId: string,
    event: string,
    actorUserId: string | null,
    payload?: Record<string, unknown>,
  ) {
    const legacyResult = await this.legacy.transition(instanceId, event, actorUserId, payload);

    if (this.mode === "shadow") {
      try {
        const defId = legacyResult.workflowId ?? "";
        const dslResult = await this.dsl.transition(instanceId, event, actorUserId, payload);
        if (!this.areInstancesEqual(legacyResult, dslResult)) {
          this.logger.warn({
            event: "WORKFLOW_ENGINE_DIVERGENCE_DETECTED",
            stage: "transition",
            transition: event,
            instanceId,
            legacyState: legacyResult.currentState,
            dslState: dslResult.currentState,
          });
        }
      } catch (err) {
        this.logger.error({
          event: "workflow.engine.shadow_transition_failed",
          instanceId,
          transition: event,
          error: String(err),
        });
      }
    }

    return legacyResult;
  }

  async findActiveInstance(defId: string, subjectType: string, subjectId: string) {
    return this.legacy.findActiveInstance(defId, subjectType, subjectId);
  }

  private areInstancesEqual(a: any, b: any): boolean {
    return a?.currentState === b?.currentState && a?.status === b?.status;
  }
}
