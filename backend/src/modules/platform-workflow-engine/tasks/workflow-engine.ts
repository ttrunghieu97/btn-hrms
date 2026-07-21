import {
  Inject,
  Injectable,
  Logger,
} from "@nestjs/common";
import { throwBadRequest, throwUnprocessable, throwConflict, throwNotFound } from "../../../shared/utils/http-error";
import {
  type TaskEventAction,
  TaskEventsService,
} from "../../tasks/tasks/realtime/task-events.service";
import { TaskEventPublisher } from "../../tasks/events/task-event-publisher";
import { TaskMapper } from "../../tasks/tasks/mappers/task.mapper";
import { ERROR_CODES } from "../../../shared/constants/error-codes";
import { AuthUser } from "../../../core/security/types/auth-user.interface";
import { TaskStatus, TaskTransition } from "./state-machine";
import { TransitionContext, TransitionValidator } from "./transition-validator";
import {
  CONTRACTS_TOKENS,
  TaskWorkflowTasksPort,
  type WorkflowTaskActivityAction,
  WorkflowContextActionPort,
} from "../../../contracts";
import { TaskWorkflowRepository } from "./repositories/task-workflow.repository";
import { WorkflowSideEffectsService } from "./workflow-side-effects.service";

export interface WorkflowCommand {
  taskId: string;
  actor: AuthUser;
  transition: TaskTransition;
  metadata?: { ip?: string; userAgent?: string };
  data?: Record<string, unknown>;
}

export interface WorkflowResult {
  task: ReturnType<typeof TaskMapper.toResponseDto>;
  transition: TaskTransition;
  previousStatus: TaskStatus;
  nextStatus: TaskStatus;
}

@Injectable()
export class WorkflowEngine {
  private readonly logger = new Logger(WorkflowEngine.name);

  constructor(
    @Inject(CONTRACTS_TOKENS.TASK_WORKFLOW_TASKS_PORT)
    private readonly tasksRepo: TaskWorkflowTasksPort,
    private readonly sseEvents: TaskEventsService,
    private readonly eventPublisher: TaskEventPublisher,
    private readonly transitionValidator: TransitionValidator,
    @Inject(CONTRACTS_TOKENS.WORKFLOW_CONTEXT_ACTION_PORT)
    private readonly workflowActionPort: WorkflowContextActionPort,
    private readonly workflowRepo: TaskWorkflowRepository,
    private readonly sideEffects: WorkflowSideEffectsService,
  ) {}

  async execute(cmd: WorkflowCommand): Promise<WorkflowResult> {
    const { taskId, actor, transition, data = {}, metadata = {} } = cmd;
    const correlationId =
      (data.correlationId as string | undefined) ?? `wf-${taskId}-${Date.now()}`;

    await this.eventPublisher.publish({
      eventType: "workflow.action_requested",
      aggregateId: taskId,
      actorUserId: actor.id ?? null,
      correlationId,
      payload: {
        context: "tasks",
        actionType: transition,
        taskId,
        retryPolicy: "default-task-workflow-retry",
        escalationPolicy: "task-workflow-manager-escalation",
      },
    });

    const contractResult = await this.workflowActionPort.executeAction({
      context: "tasks",
      actionType: transition,
      aggregateId: taskId,
      payload: { ...data, ...metadata },
      correlationId,
    });

    if (contractResult.status === "failed") {
      const contractError =
        contractResult.error ??
        this.getOptionalString(contractResult.details, "error") ??
        this.getOptionalString(contractResult.details, "message") ??
        null;
      await this.eventPublisher.publish({
        eventType: "workflow.action_failed",
        aggregateId: taskId,
        actorUserId: actor.id ?? null,
        correlationId,
        payload: {
          context: "tasks",
          actionType: transition,
          taskId,
          retryPolicy: "default-task-workflow-retry",
          escalationPolicy: "task-workflow-manager-escalation",
          error: contractError,
        },
      });
      throwUnprocessable(
        contractError ?? "Workflow contract action failed",
        ERROR_CODES.WORKFLOW_ACTION_FAILED,
        { taskId, transition },
      );
    }

    try {
      const task = (await this.tasksRepo.findById(taskId));
      if (!task) {
        throwNotFound("Task not found", ERROR_CODES.TASK_NOT_FOUND, { taskId });
      }

      const previousStatus: TaskStatus = task.status;

      const ctx: TransitionContext = {
        task: {
          id: task.id,
          status: task.status,
          assigneeId: task.assigneeId ?? null,
          createdByUserId: task.createdByUserId ?? null,
          assignee: task.assignee,
          revisionCount: task.revisionCount ?? 0,
          priority: task.priority ?? undefined,
        },
        actor,
        transition,
        reason: data.reason as string | undefined,
      };

      const {
        targetStatus,
        actorRoles,
        isDelegated,
        delegatorUserId,
        delegationScope,
        delegationDepartmentId,
      } = await this.transitionValidator.validate(ctx);
      const nextStatus: TaskStatus = targetStatus;

      if (["accept", "submit", "approve"].includes(transition)) {
        const pendingBlockers =
          await this.workflowRepo.listBlockingDependencies(taskId);
        const incomplete = pendingBlockers.filter(
          (dependency) => dependency.dependsOnTask?.status !== "completed",
        );
        if (incomplete.length > 0) {
          throwBadRequest(
            `Cannot proceed: Task is blocked by incomplete dependencies: ${incomplete
              .map((dependency) => dependency.dependsOnTask?.title)
              .filter(Boolean)
              .join(", ")}`,
            ERROR_CODES.TASK_BLOCKED_BY_DEPENDENCIES,
            {
              taskId,
              blockers: incomplete
                .map((dependency) => dependency.dependsOnTask?.id)
                .filter(Boolean),
            },
          );
        }
      }

      if (transition === "request_revision") {
        const maxRevisions =
          await this.workflowRepo.getMaxRevisionCountForPriority(task.priority);
        const currentRevisionCount = task.revisionCount ?? 0;
        if (maxRevisions !== null && currentRevisionCount >= maxRevisions) {
          await this.eventPublisher.publish({
            eventType: "task.revision_limit_reached",
            aggregateId: taskId,
            actorUserId: actor.id ?? null,
            correlationId,
            payload: {
              taskId,
              revisionCount: currentRevisionCount,
              maxRevisionCount: maxRevisions,
              taskTitle: task.title,
            },
          });
          throwUnprocessable(
            `Revision limit reached (${maxRevisions}). Further revisions are blocked. An admin has been notified.`,
            ERROR_CODES.TASK_REVISION_LIMIT_REACHED,
            { taskId, revisionCount: currentRevisionCount, maxRevisions },
          );
        }
      }

      const statusUpdates = this.buildStatusUpdates(transition, nextStatus, data);

      await this.workflowRepo.transaction(async (tx) => {
        const updated = await this.tasksRepo.updateWithOptimisticLock(
          taskId,
          previousStatus,
          statusUpdates,
          tx,
        );

        if (!updated) {
          throwConflict(
            "Concurrent state change detected — please retry",
            ERROR_CODES.TASK_CONFLICT,
            { taskId, expectedStatus: previousStatus, transition },
          );
        }

        const activityAction = this.transitionToActivityAction(transition);
        await this.tasksRepo.addActivity(
          {
            taskId,
            actorUserId: actor.id ?? null,
            action: activityAction,
            fromStatus: previousStatus,
            toStatus: nextStatus,
            metadata: {
              transition,
              actorRoles,
              isDelegated,
              delegatorUserId,
              delegationScope: delegationScope ?? null,
              delegationDepartmentId: delegationDepartmentId ?? null,
              ...data,
              ...metadata,
            },
          },
          tx,
        );

        await this.sideEffects.apply(task, cmd, nextStatus, tx);
      });

      const loaded = await this.tasksRepo.findById(taskId);
      const response = TaskMapper.toResponseDto(loaded);

      const domainEventType = this.transitionToDomainEvent(transition);
      await this.eventPublisher.publish({
        eventType: domainEventType,
        aggregateId: taskId,
        actorUserId: actor.id ?? null,
        correlationId,
        payload: { task: response, previousStatus, nextStatus, transition, ...data },
      });

      this.sseEvents.publishTaskEvent({
        action: this.transitionToTaskEventAction(transition),
        taskId,
        task: response,
        assigneeEmployeeId: task.assigneeId ?? null,
        actorUserId: actor.id ?? null,
      });

      this.logger.log(
        `Workflow: task ${taskId} ${previousStatus} → ${nextStatus} by user ${actor.id}`,
      );

      await this.eventPublisher.publish({
        eventType: "workflow.action_completed",
        aggregateId: taskId,
        actorUserId: actor.id ?? null,
        correlationId,
        payload: {
          context: "tasks",
          actionType: transition,
          taskId,
        },
      });

      return { task: response, transition, previousStatus, nextStatus };
    } catch (error: unknown) {
      await this.eventPublisher.publish({
        eventType: "workflow.action_failed",
        aggregateId: taskId,
        actorUserId: actor.id ?? null,
        correlationId,
        payload: {
          context: "tasks",
          actionType: transition,
          taskId,
          error: this.errorMessage(error),
        },
      });
      throw error;
    }
  }

  private buildStatusUpdates(
    transition: TaskTransition,
    nextStatus: TaskStatus,
    data: Record<string, unknown>,
  ) {
    const now = new Date();
    const updates: Record<string, unknown> = { status: nextStatus };

    switch (transition) {
      case "accept":
        updates.startedAt = now;
        break;
      case "submit":
      case "resubmit":
        updates.submittedAt = now;
        updates.resultText = this.getOptionalString(data, "resultText") ?? null;
        break;
      case "approve":
        updates.completedAt = now;
        updates.progress = "100";
        break;
      case "reject":
        updates.rejectionReason = this.getOptionalString(data, "reason") ?? null;
        break;
      case "request_revision":
        updates.revisionReason = this.getOptionalString(data, "reason") ?? null;
        break;
      case "cancel":
        updates.cancellationReason =
          this.getOptionalString(data, "reason") ?? null;
        break;
    }

    return updates;
  }

  private transitionToActivityAction(
    transition: TaskTransition,
  ): WorkflowTaskActivityAction {
    const map: Record<TaskTransition, WorkflowTaskActivityAction> = {
      assign: "assigned",
      unassign: "unassigned",
      accept: "accepted",
      reject: "declined",
      submit: "submitted",
      resubmit: "resubmitted",
      approve: "approved",
      request_revision: "returned",
      cancel: "cancelled",
    };
    return map[transition] ?? "status_changed";
  }

  private transitionToDomainEvent(transition: TaskTransition): string {
    const map: Record<TaskTransition, string> = {
      assign: "task.assigned",
      unassign: "task.unassigned",
      accept: "task.accepted",
      reject: "task.declined",
      submit: "task.submitted",
      resubmit: "task.submitted",
      approve: "task.completed",
      request_revision: "task.revision_requested",
      cancel: "task.cancelled",
    };
    return map[transition] ?? "task.created";
  }

  private transitionToTaskEventAction(
    transition: TaskTransition,
  ): TaskEventAction {
    const map: Record<TaskTransition, TaskEventAction> = {
      assign: "task_updated",
      unassign: "task_updated",
      accept: "task_accepted",
      reject: "task_declined",
      submit: "task_submitted",
      resubmit: "task_resubmitted",
      approve: "task_approved",
      request_revision: "task_returned",
      cancel: "task_updated",
    };
    return map[transition];
  }

  private getOptionalString(
    record: Record<string, unknown> | undefined,
    key: string,
  ): string | undefined {
    const value = record?.[key];
    return typeof value === "string" ? value : undefined;
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : "Unknown error";
  }
}
