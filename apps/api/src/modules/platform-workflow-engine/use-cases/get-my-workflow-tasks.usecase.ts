import { Injectable } from "@nestjs/common";
import { WorkflowTaskAggregatorService } from "../tasks/workflow-task-aggregator.service";
import type { AggregatedWorkflowTasksResult } from "../tasks/interfaces/workflow-task.interface";

@Injectable()
export class GetMyWorkflowTasksUseCase {
  constructor(
    private readonly aggregator: WorkflowTaskAggregatorService,
  ) {}

  async execute(
    userId: string,
    domain?: string,
  ): Promise<AggregatedWorkflowTasksResult> {
    return this.aggregator.aggregate(userId, domain);
  }
}
