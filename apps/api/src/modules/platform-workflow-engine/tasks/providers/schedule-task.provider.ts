import { Injectable } from "@nestjs/common";
import { WorkflowTaskAggregatorRepository } from "../../repositories/workflow-task-aggregator.repository";
import type { WorkflowTask, WorkflowTaskProvider } from "../interfaces/workflow-task.interface";

@Injectable()
export class ScheduleTaskProvider implements WorkflowTaskProvider {
  readonly domain = "schedule" as const;

  constructor(private readonly repo: WorkflowTaskAggregatorRepository) {}

  async getTasks(_userId: string): Promise<WorkflowTask[]> {
    return this.repo.getPendingScheduleTasks(_userId);
  }
}
