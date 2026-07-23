import { type AuthUser } from "../../../../core/security/types/auth-user.interface";
import { Injectable } from "@nestjs/common";
import { UploadTaskAttachmentUseCase } from "./upload-task-attachment.usecase";
import { ContextLogger } from "../../../../shared/logging/context-logger";
import { RequestContextService } from "../../../../shared/context/request-context.service";

@Injectable()
export class UploadTaskAttachmentEndpointUseCase {
  private readonly logger: ContextLogger;
  constructor(
    private readonly uploadTaskAttachment: UploadTaskAttachmentUseCase,
    private readonly requestContext: RequestContextService,
  ) {
    this.logger = new ContextLogger(this.requestContext, UploadTaskAttachmentEndpointUseCase.name);
  }

  execute(taskId: string, file: Express.Multer.File, actor: AuthUser) {
    return this.uploadTaskAttachment.execute(taskId, file, actor);
  }
}



