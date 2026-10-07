import { Injectable } from "@nestjs/common";
import { TasksRepository } from "../repositories/tasks.repository";
import { CreateTaskDto } from "../dto/create-task.dto";
import { TaskMapper } from "../mappers/task.mapper";
import { TaskNotificationsService } from "../notifications/task-notifications.service";
import { TaskEventsService } from "../realtime/task-events.service";
import { TasksTransactionsRepository } from "../repositories/tasks-transactions.repository";
import { EventOutboxService } from "../../../../core/events/event-outbox.service";
import { ContextLogger } from "../../../../shared/logging/context-logger";
import { RequestContextService } from "../../../../shared/context/request-context.service";
import { throwNotFound, throwBadRequest, throwInternalServer } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";

@Injectable()
export class CreateTaskUseCase {
  private readonly logger: ContextLogger;
  constructor(
    private readonly txRepo: TasksTransactionsRepository,
    private readonly tasksRepo: TasksRepository,
    private readonly notifications: TaskNotificationsService,
    private readonly taskEvents: TaskEventsService,
    private readonly eventOutbox: EventOutboxService,
    private readonly requestContext: RequestContextService,
  ) {
    this.logger = new ContextLogger(this.requestContext, CreateTaskUseCase.name);
  }

  async execute(dto: CreateTaskDto, actorUserId?: string | null) {
    if (dto.parentTaskId) {
      const parentTask = await this.tasksRepo.findById(dto.parentTaskId);
      if (!parentTask) throwNotFound("Parent task not found", ERROR_CODES.TASK_NOT_FOUND);
      if (parentTask.parentTaskId)
        throwBadRequest("Subtasks cannot have subtasks (max depth 1)", ERROR_CODES.INVALID_REQUEST);
    }

    const status = dto.assigneeId ? "assigned" : "created";
    const row = await this.txRepo.transaction(async (tx) => {
      const created = await this.tasksRepo.insert(
        {
          title: dto.title,
          description: dto.description ?? null,
          parentTaskId: dto.parentTaskId ?? null,
          status: status as any,
          assigneeId: dto.assigneeId ?? null,
          createdByUserId: actorUserId ?? null,
          priority: dto.priority ?? "medium",
          dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
          startedAt: dto.startedAt ? new Date(dto.startedAt) : null,
          progress: dto.progress ?? 0,
          resultText: dto.resultText ?? null,
          checklist: dto.checklist ? JSON.stringify(dto.checklist) : null,
        } as any,
        tx,
      );

      if (!created) throwInternalServer("Failed to create task", ERROR_CODES.INTERNAL_ERROR);

      await this.tasksRepo.addActivity(
        {
          taskId: created.id,
          actorUserId: actorUserId ?? null,
          action: "created",
          fromStatus: null,
          toStatus: status,
          metadata: {},
        } as any,
        tx,
      );

      if (actorUserId) {
        await this.notifications.create(
          {
            userId: actorUserId,
            taskId: created.id,
            type: "task_created",
            title: "Bạn đã tạo công việc",
            body: dto.title,
          },
          tx,
        );
      }

      await this.eventOutbox.stage(
        {
          eventType: "task.created",
          aggregateId: created.id,
          actorUserId: actorUserId ?? null,
          payload: { taskId: created.id, assigneeEmployeeId: dto.assigneeId ?? null },
        },
        tx,
      );

      if (dto.assigneeId) {
        await this.tasksRepo.addAssignment(
          created.id,
          dto.assigneeId,
          actorUserId ?? null,
          tx,
        );
        await this.tasksRepo.addActivity(
          {
            taskId: created.id,
            actorUserId: actorUserId ?? null,
            action: "assigned",
            fromStatus: "created",
            toStatus: "assigned",
            metadata: { assigneeId: dto.assigneeId },
          } as any,
          tx,
        );
        const assigneeUserId = await this.tasksRepo.getUserIdByEmployeeId(
          dto.assigneeId,
          tx,
        );
        if (assigneeUserId) {
          await this.notifications.create(
            {
              userId: assigneeUserId,
              taskId: created.id,
              type: "task_assigned",
              title: "Bạn được giao công việc mới",
              body: dto.title,
            },
            tx,
          );
        }
      }

      return created;
    });

    const loaded = await this.tasksRepo.findById(row.id);
    const response = TaskMapper.toResponseDto(loaded);

    this.taskEvents.publishTaskEvent({
      action: "task_created",
      taskId: row.id,
      task: response,
      assigneeEmployeeId: dto.assigneeId ?? null,
      actorUserId: actorUserId ?? null,
    });

    return response;
  }
}
