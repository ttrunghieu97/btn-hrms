import { Injectable } from "@nestjs/common";
import { MyTaskSummaryRepository } from "../repositories/my-task-summary.repository";

const GROUP_MAP: Record<string, "pending" | "inProgress" | "submitted" | "completed"> = {
  created: "pending",
  assigned: "pending",
  in_progress: "inProgress",
  declined: "pending",
  submitted: "submitted",
  revision: "submitted",
  completed: "completed",
};

@Injectable()
export class MyTaskSummaryUseCase {
  constructor(private readonly repo: MyTaskSummaryRepository) {}

  async execute(employeeId: string | null) {
    if (!employeeId) {
      return { pending: 0, inProgress: 0, submitted: 0, completed: 0, overdue: 0 };
    }

    const [rows, overdue] = await Promise.all([
      this.repo.countByStatus(employeeId),
      this.repo.countOverdue(employeeId),
    ]);

    const summary = { pending: 0, inProgress: 0, submitted: 0, completed: 0, overdue };

    for (const row of rows) {
      const group = GROUP_MAP[row.status as string];
      if (group) summary[group] += row.count;
    }

    return summary;
  }
}
