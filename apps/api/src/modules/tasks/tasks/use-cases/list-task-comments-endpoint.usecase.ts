import { Injectable } from "@nestjs/common";
import { ListTaskCommentsUseCase } from "./list-task-comments.usecase";
import { ContextLogger } from "../../../../shared/logging/context-logger";
import { RequestContextService } from "../../../../shared/context/request-context.service";

@Injectable()
export class ListTaskCommentsEndpointUseCase {
  private readonly logger: ContextLogger;
  constructor(
    private readonly listTaskComments: ListTaskCommentsUseCase,
    private readonly requestContext: RequestContextService,
  ) {
    this.logger = new ContextLogger(this.requestContext, ListTaskCommentsEndpointUseCase.name);
  }

  execute(taskId: string) {
    return this.listTaskComments.execute(taskId);
  }
}
