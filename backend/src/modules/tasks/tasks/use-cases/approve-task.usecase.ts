import { Injectable } from "@nestjs/common";
import { EventOutboxService } from "../../../../core/events/event-outbox.service";
import { AuthUser } from "../../../../core/security/types/auth-user.interface";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { RequestContextService } from "../../../../shared/context/request-context.service";
import { ContextLogger } from "../../../../shared/logging/context-logger";
import { throwConflict, throwNotFound } from "../../../../shared/utils/http-error";
import { TransitionValidator } from "../../../platform-workflow-engine/tasks/transition-validator";
import { TaskMapper } from "../mappers/task.mapper";
import { TasksRepository } from "../repositories/tasks.repository";
import { TasksTransactionsRepository } from "../repositories/tasks-transactions.repository";

@Injectable()
export class ApproveTaskUseCase {
  private readonly logger: ContextLogger;

  constructor(
    private readonly txRepo: TasksTransactionsRepository,
    private readonly tasksRepo: TasksRepository,
    private readonly transitionValidator: TransitionValidator,
    private readonly eventOutbox: EventOutboxService,
    private readonly requestContext: RequestContextService,
  ) {
    this.logger = new ContextLogger(this.requestContext, ApproveTaskUseCase.name);
  }

  async execute(id: string, actor: AuthUser) {
    const task = await this.tasksRepo.findById(id);
    if (!task) {
      throwNotFound("Task not found", ERROR_CODES.TASK_NOT_FOUND, { taskId: id });
    }

    const { targetStatus } = await this.transitionValidator.validate({
      task: {
        id: task.id,
        status: task.status,
        assigneeId: task.assigneeId,
        createdByUserId: task.createdByUserId,
        assignee: task.assignee,
      },
      actor,
      transition: "approve",
    });

    await this.txRepo.transaction(async (tx) => {
      const updated = await this.tasksRepo.updateWithOptimisticLock(
        id,
        task.status,
        {
          status: targetStatus,
          progress: "100",
          completedAt: new Date(),
        },
        tx,
      );
      if (!updated) {
        throwConflict("State conflict — please retry", ERROR_CODES.TASK_CONFLICT);
      }

      await this.tasksRepo.addActivity(
        {
          taskId: id,
          actorUserId: actor.id,
          action: "approved",
          fromStatus: task.status,
          toStatus: targetStatus,
          metadata: {},
        } as any,
        tx,
      );

      await this.eventOutbox.stage(
        {
          eventType: "task.completed",
          aggregateId: id,
          actorUserId: actor.id,
          payload: { taskId: id, previousStatus: task.status, nextStatus: targetStatus },
        },
        tx,
      );
    });

    const loaded = await this.tasksRepo.findById(id);
    return TaskMapper.toResponseDto(loaded);
  }
}


