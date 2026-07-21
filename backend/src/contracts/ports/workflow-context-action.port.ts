export interface WorkflowContextActionPort {
  executeAction(input: {
    context: string;
    actionType: string;
    aggregateId: string;
    payload: Record<string, unknown>;
    correlationId: string;
  }): Promise<{
    status: "completed" | "failed";
    error?: string;
    details?: Record<string, unknown>;
  }>;
}
