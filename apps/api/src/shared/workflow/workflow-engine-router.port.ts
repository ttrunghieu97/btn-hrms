/**
 * Interface for the engine that the router delegates to.
 * Currently wraps the legacy PlatformWorkflowEngineService.
 */
export interface WorkflowEngineRouterPort {
  startWorkflow(defId: string, subjectId: string, context: Record<string, unknown>): Promise<{
    id: string;
    workflowId?: string;
    currentState: string;
    status: string;
  }>;

  transition(
    instanceId: string,
    event: string,
    actorUserId: string | null,
    payload?: Record<string, unknown>,
  ): Promise<{
    id: string;
    workflowId?: string;
    currentState: string;
    status: string;
  }>;

  findActiveInstance(defId: string, subjectType: string, subjectId: string): Promise<any>;
}
