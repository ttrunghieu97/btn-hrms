import { Injectable } from "@nestjs/common";
import { WorkflowTaskAggregatorRepository } from "../../repositories/workflow-task-aggregator.repository";
import type { WorkflowTask, WorkflowTaskProvider } from "../interfaces/workflow-task.interface";

@Injectable()
export class LeaveTaskProvider implements WorkflowTaskProvider {
  readonly domain = "leave" as const;

  constructor(private readonly repo: WorkflowTaskAggregatorRepository) {}

  async getTasks(userId: string): Promise<WorkflowTask[]> {
    return this.repo.getPendingLeaveTasks(userId);
  }
}
