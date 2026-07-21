import { type AuthUser } from "../../../../core/security/types/auth-user.interface";
import { Injectable } from "@nestjs/common";
import { TasksRepository } from "../repositories/tasks.repository";
import {
  throwForbidden,
  throwNotFound,
} from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { Permissions } from "../../../../core/security/permissions/permissions.registry";
import { ContextLogger } from "../../../../shared/logging/context-logger";
import { RequestContextService } from "../../../../shared/context/request-context.service";

@Injectable()
export class DeleteTaskCommentUseCase {
  private readonly logger: ContextLogger;
  constructor(
    private readonly tasksRepo: TasksRepository,
    private readonly requestContext: RequestContextService,
  ) {
    this.logger = new ContextLogger(this.requestContext, DeleteTaskCommentUseCase.name);
  }

  async execute(taskId: string, commentId: string, actor: AuthUser) {
    const comment = await this.tasksRepo
      .listComments(taskId)
      .then((rows) =>
        rows.find((row: any) => String(row.id) === String(commentId)),
      );
    if (!comment) {
      throwNotFound("Comment not found", ERROR_CODES.TASK_NOT_FOUND, {
        taskId,
        commentId,
      });
    }

    const actorPerms: string[] = actor?.permissions ?? [];
    const isAdmin =
      actor?.isSuperAdmin ||
      actorPerms.includes("ALL") ||
      actorPerms.includes("tasks:manage") ||
      actorPerms.includes(Permissions.TASKS_EDIT);

    const isOwner =
      actor?.id && String(actor.id) === String(comment.authorUserId);

    if (!isAdmin && !isOwner) {
      throwForbidden("Permission denied", ERROR_CODES.PERMISSION_DENIED, {
        taskId,
        commentId,
        actorId: actor?.id ?? null,
      });
    }

    await this.tasksRepo.deleteComment(commentId);
    return { ok: true };
  }
}



