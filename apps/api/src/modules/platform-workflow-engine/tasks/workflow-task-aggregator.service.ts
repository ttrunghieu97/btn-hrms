import { Injectable } from "@nestjs/common";
import { RequestContextService } from "../../../shared/context/request-context.service";
import { ContextLogger } from "../../../shared/logging/context-logger";
import type {
  AggregatedWorkflowTasksResult,
  WorkflowTask,
  WorkflowTaskProvider,
} from "./interfaces/workflow-task.interface";
import { LeaveTaskProvider } from "./providers/leave-task.provider";
import { ExpenseTaskProvider } from "./providers/expense-task.provider";
import { AssetTaskProvider } from "./providers/asset-task.provider";
import { ScheduleTaskProvider } from "./providers/schedule-task.provider";
import { PayrollTaskProvider } from "./providers/payroll-task.provider";
import { AttendanceTaskProvider } from "./providers/attendance-task.provider";
import { OffboardingTaskProvider } from "./providers/offboarding-task.provider";

@Injectable()
export class WorkflowTaskAggregatorService {
  private readonly providers: WorkflowTaskProvider[];
  private readonly logger: ContextLogger;

  constructor(
    private readonly requestContext: RequestContextService,
    leaveProvider: LeaveTaskProvider,
    expenseProvider: ExpenseTaskProvider,
    assetProvider: AssetTaskProvider,
    scheduleProvider: ScheduleTaskProvider,
    payrollProvider: PayrollTaskProvider,
    attendanceProvider: AttendanceTaskProvider,
    offboardingProvider: OffboardingTaskProvider,
  ) {
    this.logger = new ContextLogger(
      this.requestContext,
      WorkflowTaskAggregatorService.name,
    );
    this.providers = [
      leaveProvider,
      expenseProvider,
      assetProvider,
      scheduleProvider,
      payrollProvider,
      attendanceProvider,
      offboardingProvider,
    ];
  }

  async aggregate(
    userId: string,
    targetDomain?: string,
  ): Promise<AggregatedWorkflowTasksResult> {
    const failedDomains: WorkflowTaskProvider["domain"][] = [];

    const results = await Promise.allSettled(
      this.providers.map(async (provider) => {
        try {
          return await provider.getTasks(userId);
        } catch (err) {
          this.logger.warn(
            `Task provider ${provider.domain} failed: ${err instanceof Error ? err.message : String(err)}`,
          );
          failedDomains.push(provider.domain);
          return [];
        }
      }),
    );

    const allTasks: WorkflowTask[] = [];
    for (const res of results) {
      if (res.status === "fulfilled") {
        allTasks.push(...res.value);
      }
    }

    const countsByDomain: Record<string, number> = {
      all: allTasks.length,
      leave: 0,
      expense: 0,
      asset: 0,
      schedule: 0,
      payroll: 0,
      attendance: 0,
      offboarding: 0,
    };

    for (const task of allTasks) {
      countsByDomain[task.domain] = (countsByDomain[task.domain] || 0) + 1;
    }

    let filtered = allTasks;
    if (targetDomain && targetDomain !== "all") {
      filtered = allTasks.filter((t) => t.domain === targetDomain);
    }

    const priorityWeight: Record<string, number> = {
      urgent: 3,
      high: 2,
      normal: 1,
    };
    filtered.sort((a, b) => {
      const pDiff =
        (priorityWeight[b.priority] || 1) - (priorityWeight[a.priority] || 1);
      if (pDiff !== 0) return pDiff;
      if (a.createdAt && b.createdAt) {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      return 0;
    });

    return {
      tasks: filtered,
      total: filtered.length,
      countsByDomain,
      meta: {
        partial: failedDomains.length > 0,
        failedDomains,
      },
    };
  }
}
