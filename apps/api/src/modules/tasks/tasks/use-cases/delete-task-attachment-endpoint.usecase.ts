import { type AuthUser } from "../../../../core/security/types/auth-user.interface";
import { Injectable } from "@nestjs/common";
import { DeleteTaskAttachmentUseCase } from "./delete-task-attachment.usecase";
import { ContextLogger } from "../../../../shared/logging/context-logger";
import { RequestContextService } from "../../../../shared/context/request-context.service";

@Injectable()
export class DeleteTaskAttachmentEndpointUseCase {
  private readonly logger: ContextLogger;
  constructor(
    private readonly deleteTaskAttachment: DeleteTaskAttachmentUseCase,
    private readonly requestContext: RequestContextService,
  ) {
    this.logger = new ContextLogger(this.requestContext, DeleteTaskAttachmentEndpointUseCase.name);
  }

  execute(taskId: string, attachmentId: string, actor: AuthUser) {
    return this.deleteTaskAttachment.execute(taskId, attachmentId, actor);
  }
}



