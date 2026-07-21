import { Injectable } from "@nestjs/common";
import { ListTaskAttachmentsUseCase } from "./list-task-attachments.usecase";
import { ContextLogger } from "../../../../shared/logging/context-logger";
import { RequestContextService } from "../../../../shared/context/request-context.service";

@Injectable()
export class ListTaskAttachmentsEndpointUseCase {
  private readonly logger: ContextLogger;
  constructor(
    private readonly listTaskAttachments: ListTaskAttachmentsUseCase,
    private readonly requestContext: RequestContextService,
  ) {
    this.logger = new ContextLogger(this.requestContext, ListTaskAttachmentsEndpointUseCase.name);
  }

  execute(taskId: string) {
    return this.listTaskAttachments.execute(taskId);
  }
}
