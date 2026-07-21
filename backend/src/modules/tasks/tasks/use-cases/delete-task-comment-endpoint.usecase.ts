import { type AuthUser } from "../../../../core/security/types/auth-user.interface";
import { Injectable } from "@nestjs/common";
import { DeleteTaskCommentUseCase } from "./delete-task-comment.usecase";
import { ContextLogger } from "../../../../shared/logging/context-logger";
import { RequestContextService } from "../../../../shared/context/request-context.service";

@Injectable()
export class DeleteTaskCommentEndpointUseCase {
  private readonly logger: ContextLogger;
  constructor(
    private readonly deleteTaskComment: DeleteTaskCommentUseCase,
    private readonly requestContext: RequestContextService,
  ) {
    this.logger = new ContextLogger(this.requestContext, DeleteTaskCommentEndpointUseCase.name);
  }

  execute(taskId: string, commentId: string, actor: AuthUser) {
    return this.deleteTaskComment.execute(taskId, commentId, actor);
  }
}



