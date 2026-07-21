import { Inject, Injectable } from "@nestjs/common";
import {
  CONTRACTS_TOKENS,
  type TaskWorkflowTasksPort,
  type TaskWorkflowTransaction,
  type WorkflowTaskRecord,
} from "../../../contracts";
import { TaskStatus } from "./state-machine";
import type { WorkflowCommand } from "./workflow-engine";

@Injectable()
export class WorkflowSideEffectsService {
  constructor(
    @Inject(CONTRACTS_TOKENS.TASK_WORKFLOW_TASKS_PORT)
    private readonly tasksRepo: TaskWorkflowTasksPort,
  ) {}

  async apply(
    task: WorkflowTaskRecord,
    cmd: WorkflowCommand,
    _nextStatus: TaskStatus,
    db: TaskWorkflowTransaction,
  ) {
    const { taskId, actor, transition, data = {} } = cmd;

    const notifyCreator = async (type: string, title: string) => {
      if (task.createdByUserId) {
        await this.tasksRepo.createNotification(
          {
            userId: task.createdByUserId,
            taskId,
            type,
            title,
            body: task.title,
          },
          db,
        );
      }
    };

    const notifyAssignee = async (type: string, title: string) => {
      const assigneeId = task.assigneeId ?? null;
      if (!assigneeId) return;
      const uid = await this.tasksRepo.getUserIdByEmployeeId(assigneeId, db);
      if (uid) {
        await this.tasksRepo.createNotification(
          { userId: uid, taskId, type, title, body: task.title },
          db,
        );
      }
    };

    switch (transition) {
      case "assign": {
        const assigneeId =
          this.getOptionalString(data, "assigneeId") ??
          task.assigneeId ??
          null;
        if (assigneeId) {
          await this.tasksRepo.addAssignment(taskId, assigneeId, actor.id ?? null, db);
          const uid = await this.tasksRepo.getUserIdByEmployeeId(assigneeId, db);
          if (uid) {
            await this.tasksRepo.createNotification(
              {
                userId: uid,
                taskId,
                type: "task_assigned",
                title: "You have been assigned a new task",
                body: task.title,
              },
              db,
            );
          }
        }
        break;
      }
      case "accept":
        await notifyCreator("task_accepted", "Employee has accepted the task");
        break;
      case "reject":
        await notifyCreator("task_declined", "Employee has declined the task");
        break;
      case "submit":
      case "resubmit": {
        const version = await this.tasksRepo.getNextSubmissionVersion(taskId, db);

        let checklist: unknown[] | null = null;
        if (data.checklist !== undefined) {
          checklist = Array.isArray(data.checklist) ? data.checklist : null;
        } else if (task.checklist) {
          try {
            const parsed = JSON.parse(task.checklist);
            checklist = Array.isArray(parsed) ? parsed : null;
          } catch {
            checklist = null;
          }
        }

        await this.tasksRepo.addSubmission(
          {
            taskId,
            submittedByUserId: actor.id ?? null,
            version,
            resultText:
              this.getOptionalString(data, "resultText") ??
              task.resultText ??
              null,
            checklist,
            submittedAt: new Date(),
          },
          db,
        );
        await notifyCreator("task_submitted", "Employee has submitted the task");
        break;
      }
      case "approve":
        await notifyAssignee("task_approved", "Your task has been approved");
        break;
      case "request_revision":
        await this.tasksRepo.update(
          taskId,
          { revisionCount: (task.revisionCount ?? 0) + 1 },
          db,
        );
        await notifyAssignee(
          "task_revision_requested",
          `Your task needs revision: ${this.getOptionalString(data, "reason") ?? ""}`,
        );
        break;
      case "cancel":
        await notifyAssignee(
          "task_cancelled",
          `Task has been cancelled: ${this.getOptionalString(data, "reason") ?? ""}`,
        );
        break;
    }
  }

  private getOptionalString(
    record: Record<string, unknown>,
    key: string,
  ): string | undefined {
    const value = record[key];
    return typeof value === "string" ? value : undefined;
  }
}
