import { Injectable } from "@nestjs/common";
import { TaskAssigneePerformanceReportQueryDto } from "../dto/task-assignee-performance-report-query.dto";
import { TaskAssigneePerformanceReportRepository } from "../repositories/task-assignee-performance-report.repository";
import { ContextLogger } from "../../../../shared/logging/context-logger";
import { RequestContextService } from "../../../../shared/context/request-context.service";

type AssigneeReportRow = {
  assignee_id: string;
  employee_code: string | null;
  assignee_name: string | null;
  department_name: string | null;
  total_assigned: number | string;
  completed_count: number | string;
  active_count: number | string;
  overdue_count: number | string;
  on_time_completed_count: number | string;
  avg_completion_hours: number | string | null;
};

function toNumber(value: number | string | null | undefined) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function toPercent(numerator: number, denominator: number) {
  if (denominator <= 0) return 0;
  return (numerator / denominator) * 100;
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

@Injectable()
export class TaskAssigneePerformanceReportUseCase {
  private readonly logger: ContextLogger;
  constructor(
    private readonly repo: TaskAssigneePerformanceReportRepository,
    private readonly requestContext: RequestContextService,
  ) {
    this.logger = new ContextLogger(this.requestContext, TaskAssigneePerformanceReportUseCase.name);
  }

  async execute(query: TaskAssigneePerformanceReportQueryDto) {
    const result = await this.repo.run(query);

    const rawRows = Array.isArray(result)
      ? result
      : ((result as { rows?: AssigneeReportRow[] }).rows ?? []);

    const items = rawRows.map((row) => {
      const totalAssigned = toNumber(row.total_assigned);
      const completedCount = toNumber(row.completed_count);
      const onTimeCompletedCount = toNumber(row.on_time_completed_count);

      return {
        assigneeId: row.assignee_id,
        employeeCode: row.employee_code,
        assigneeName: row.assignee_name?.trim() || "N/A",
        departmentName: row.department_name || "N/A",
        totalAssigned,
        completedCount,
        activeCount: toNumber(row.active_count),
        overdueCount: toNumber(row.overdue_count),
        onTimeCompletedCount,
        completionRate: round2(toPercent(completedCount, totalAssigned)),
        onTimeCompletionRate: round2(
          toPercent(onTimeCompletedCount, completedCount),
        ),
        avgCompletionHours: round2(toNumber(row.avg_completion_hours)),
      };
    });

    const summary = items.reduce(
      (acc, item) => {
        acc.totalAssigned += item.totalAssigned;
        acc.completedCount += item.completedCount;
        acc.activeCount += item.activeCount;
        acc.overdueCount += item.overdueCount;
        acc.onTimeCompletedCount += item.onTimeCompletedCount;
        acc.avgCompletionHoursWeightedSum +=
          item.avgCompletionHours * item.completedCount;
        return acc;
      },
      {
        totalAssigned: 0,
        completedCount: 0,
        activeCount: 0,
        overdueCount: 0,
        onTimeCompletedCount: 0,
        avgCompletionHoursWeightedSum: 0,
      },
    );

    return {
      items,
      summary: {
        totalAssignees: items.length,
        totalAssigned: summary.totalAssigned,
        completedCount: summary.completedCount,
        activeCount: summary.activeCount,
        overdueCount: summary.overdueCount,
        onTimeCompletedCount: summary.onTimeCompletedCount,
        completionRate: round2(
          toPercent(summary.completedCount, summary.totalAssigned),
        ),
        onTimeCompletionRate: round2(
          toPercent(summary.onTimeCompletedCount, summary.completedCount),
        ),
        avgCompletionHours: round2(
          summary.completedCount > 0
            ? summary.avgCompletionHoursWeightedSum / summary.completedCount
            : 0,
        ),
      },
    };
  }
}
