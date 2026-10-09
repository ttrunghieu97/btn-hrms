import { Injectable } from "@nestjs/common";
import { WorkflowTaskAggregatorRepository } from "../../repositories/workflow-task-aggregator.repository";
import type { WorkflowTask, WorkflowTaskProvider } from "../interfaces/workflow-task.interface";

@Injectable()
export class PayrollTaskProvider implements WorkflowTaskProvider {
  readonly domain = "payroll" as const;

  constructor(private readonly repo: WorkflowTaskAggregatorRepository) {}

  async getTasks(_userId: string): Promise<WorkflowTask[]> {
    return this.repo.getPendingPayrollTasks(_userId);
  }
}
