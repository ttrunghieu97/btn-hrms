import { type AuthUser } from "../../../../core/security/types/auth-user.interface";
import { Injectable } from "@nestjs/common";
import { TasksRepository } from "../repositories/tasks.repository";
import { UpdateTaskDto } from "../dto/update-task.dto";
import { TaskMapper } from "../mappers/task.mapper";
import { Permissions } from "../../../../core/security/permissions/permissions.registry";
import { throwBadRequest, throwForbidden, throwNotFound } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { TaskNotificationsService } from "../notifications/task-notifications.service";
import { TaskEventsService } from "../realtime/task-events.service";
import { TasksTransactionsRepository } from "../repositories/tasks-transactions.repository";
import { ContextLogger } from "../../../../shared/logging/context-logger";
import { RequestContextService } from "../../../../shared/context/request-context.service";

@Injectable()
export class UpdateTaskUseCase {
  private readonly logger: ContextLogger;
  constructor(
    private readonly txRepo: TasksTransactionsRepository,
    private readonly tasksRepo: TasksRepository,
    private readonly notifications: TaskNotificationsService,
    private readonly taskEvents: TaskEventsService,
    private readonly requestContext: RequestContextService,
  ) {
    this.logger = new ContextLogger(this.requestContext, UpdateTaskUseCase.name);
  }

  async execute(id: string, dto: UpdateTaskDto, actor: AuthUser) {
    // Guard: status cannot be set via PATCH. Use POST /tasks/:id/transitions.
    if ("status" in dto && (dto as any).status !== undefined) {
      throwBadRequest(
        "Task status cannot be changed via PATCH. Use POST /tasks/:id/transitions to change status.",
        ERROR_CODES.INVALID_REQUEST,
        { hint: `POST /api/v1/tasks/${id}/transitions` },
      );
    }

    // Guard: assignment must go through workflow transitions for state consistency.
    if (dto.assigneeId !== undefined) {
      throwBadRequest(
        "Task assignee cannot be changed via PATCH. Use POST /tasks/:id/transitions with assign/unassign.",
        ERROR_CODES.INVALID_REQUEST,
        { hint: `POST /api/v1/tasks/${id}/transitions` },
      );
    }

    const existing = await this.tasksRepo.findById(id);
    if (!existing) {
      throwNotFound("Task not found", ERROR_CODES.TASK_NOT_FOUND, {
        taskId: id,
      });
    }

    const actorUserId = actor?.id ?? null;
    const creatorUserId: string | null =
      (existing).createdByUserId ?? null;
    const previousAssigneeId: string | null =
      (existing).assigneeId ?? null;
    const actorPerms: string[] = actor?.permissions ?? [];
    const canManageAll =
      actor?.isSuperAdmin ||
      actorPerms.includes("ALL") ||
      actorPerms.includes("tasks:manage");
    const canManageScoped = actorPerms.includes(Permissions.TASKS_EDIT);
    const isAdmin = canManageAll || canManageScoped;
    const isAssignee =
      (existing).assigneeId &&
      actor?.employeeId &&
      String((existing).assigneeId) === String(actor.employeeId);

    if (!isAdmin && !isAssignee) {
      throwForbidden("Permission denied", ERROR_CODES.PERMISSION_DENIED, {
        taskId: id,
        actorId: actorUserId,
      });
    }

    if (isAdmin && !canManageAll && !isAssignee) {
      const assigneeDeptId =
        (existing)?.assignee?.department?.id ??
        (existing)?.assignee?.departmentId ??
        null;
      if (
        !assigneeDeptId ||
        String(assigneeDeptId) !== String(actor?.departmentId ?? "")
      ) {
        throwForbidden("Permission denied", ERROR_CODES.PERMISSION_DENIED, {
          taskId: id,
          actorId: actorUserId,
        });
      }
    }

    if (!isAdmin) {
      if (dto.title !== undefined || dto.description !== undefined) {
        throwForbidden("Permission denied", ERROR_CODES.PERMISSION_DENIED, {
          taskId: id,
          actorId: actorUserId,
        });
      }
      if (dto.priority !== undefined || dto.dueDate !== undefined) {
        throwForbidden("Permission denied", ERROR_CODES.PERMISSION_DENIED, {
          taskId: id,
          actorId: actorUserId,
        });
      }
    }

    const nextDueDate =
      dto.dueDate !== undefined
        ? dto.dueDate
          ? new Date(dto.dueDate)
          : null
        : undefined;

    const nextStartedAt =
      dto.startedAt !== undefined
        ? dto.startedAt
          ? new Date(dto.startedAt)
          : null
        : undefined;

    const patch: any = {
      ...(dto.title !== undefined ? { title: dto.title } : {}),
      ...(dto.description !== undefined
        ? { description: dto.description }
        : {}),
      ...(dto.priority !== undefined ? { priority: dto.priority } : {}),
      ...(dto.dueDate !== undefined ? { dueDate: nextDueDate } : {}),
      ...(dto.startedAt !== undefined ? { startedAt: nextStartedAt } : {}),
      ...(dto.progress !== undefined ? { progress: dto.progress } : {}),
      ...(dto.resultText !== undefined ? { resultText: dto.resultText } : {}),
      ...(dto.checklist !== undefined
        ? { checklist: JSON.stringify(dto.checklist ?? []) }
        : {}),
    };

    if (Object.keys(patch).length === 0) {
      throwBadRequest(
        "No fields to update",
        ERROR_CODES.INVALID_UPDATE_PAYLOAD,
        {
          taskId: id,
          fields: [],
        },
      );
    }

    const previousStatus = (existing).status;

    const changedFields: string[] = [];
    if (dto.title !== undefined && dto.title !== (existing).title)
      changedFields.push("title");
    if (
      dto.description !== undefined &&
      dto.description !== (existing).description
    )
      changedFields.push("description");
    if (
      dto.priority !== undefined &&
      dto.priority !== (existing).priority
    )
      changedFields.push("priority");
    if (dto.dueDate !== undefined) {
      const prevDue = (existing).dueDate
        ? new Date((existing).dueDate).getTime()
        : null;
      const nextDue = nextDueDate ? nextDueDate.getTime() : null;
      if (prevDue !== nextDue) changedFields.push("dueDate");
    }
    if (dto.startedAt !== undefined) {
      const prevStart = (existing).startedAt
        ? new Date((existing).startedAt).getTime()
        : null;
      const nextStart = nextStartedAt ? nextStartedAt.getTime() : null;
      if (prevStart !== nextStart) changedFields.push("startedAt");
    }
    if (
      dto.progress !== undefined &&
      Number(dto.progress) !== Number((existing).progress)
    )
      changedFields.push("progress");
    if (
      dto.resultText !== undefined &&
      dto.resultText !== (existing).resultText
    )
      changedFields.push("resultText");
    if (dto.checklist !== undefined) changedFields.push("checklist");

    const shouldNotifyUpdate =
      dto.progress !== undefined ||
      dto.resultText !== undefined ||
      dto.checklist !== undefined ||
      dto.title !== undefined ||
      dto.description !== undefined;

    await this.txRepo.transaction(async (tx) => {
      await this.tasksRepo.updateById(id, patch, tx);

      if (changedFields.length > 0) {
        await this.tasksRepo.addActivity(
          {
            taskId: id,
            actorUserId: actorUserId,
            action: "progress_updated",
            fromStatus: previousStatus,
            toStatus: previousStatus,
            metadata: { fields: changedFields },
          } as any,
          tx,
        );
      }

      if (shouldNotifyUpdate) {
        const recipientUserIds = new Set<string>();
        if (actorUserId) recipientUserIds.add(actorUserId);
        if (creatorUserId) recipientUserIds.add(creatorUserId);

        if (previousAssigneeId) {
          const assigneeUserId = await this.tasksRepo.getUserIdByEmployeeId(
            previousAssigneeId,
            tx,
          );
          if (assigneeUserId) recipientUserIds.add(assigneeUserId);
        }

        const title = "Công việc đã được cập nhật";
        const body = dto.title ?? (existing).title ?? "";

        await Promise.all(
          Array.from(recipientUserIds).map((userId) =>
            this.notifications.create(
              {
                userId,
                taskId: id,
                type: "task_updated",
                title,
                body,
              },
              tx,
            ),
          ),
        );
      }
    });

    const loaded = await this.tasksRepo.findById(id);
    const response = TaskMapper.toResponseDto(loaded);

    this.taskEvents.publishTaskEvent({
      action: "task_updated",
      taskId: id,
      task: response,
      assigneeEmployeeId: previousAssigneeId,
      actorUserId,
    });

    return response;
  }
}



