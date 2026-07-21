import { Injectable } from "@nestjs/common";
import { WorkflowContextActionPort } from "../ports/workflow-context-action.port";

@Injectable()
export class WorkflowContextActionAdapter implements WorkflowContextActionPort {
  async executeAction(input: {
    context: string;
    actionType: string;
    aggregateId: string;
    payload: Record<string, unknown>;
    correlationId: string;
  }): Promise<{
    status: "completed" | "failed";
    details?: Record<string, unknown>;
  }> {
    return {
      status: "completed",
      details: {
        context: input.context,
        actionType: input.actionType,
        aggregateId: input.aggregateId,
        correlationId: input.correlationId,
      },
    };
  }
}
