import { type AuthUser } from "../../../../core/security/types/auth-user.interface";
import { Injectable } from "@nestjs/common";
import { CreateTaskCommentDto } from "../dto/create-task-comment.dto";
import { CreateTaskCommentUseCase } from "./create-task-comment.usecase";
import { ContextLogger } from "../../../../shared/logging/context-logger";
import { RequestContextService } from "../../../../shared/context/request-context.service";

@Injectable()
export class CreateTaskCommentEndpointUseCase {
  private readonly logger: ContextLogger;
  constructor(
    private readonly createTaskComment: CreateTaskCommentUseCase,
    private readonly requestContext: RequestContextService,
  ) {
    this.logger = new ContextLogger(this.requestContext, CreateTaskCommentEndpointUseCase.name);
  }

  execute(taskId: string, dto: CreateTaskCommentDto, actor: AuthUser) {
    return this.createTaskComment.execute(taskId, dto, actor);
  }
}



