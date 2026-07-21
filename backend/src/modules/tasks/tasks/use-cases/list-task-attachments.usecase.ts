import { Injectable } from "@nestjs/common";
import { TasksRepository } from "../repositories/tasks.repository";
import { TaskAttachmentMapper } from "../mappers/task-attachment.mapper";
import { ContextLogger } from "../../../../shared/logging/context-logger";
import { RequestContextService } from "../../../../shared/context/request-context.service";

@Injectable()
export class ListTaskAttachmentsUseCase {
  private readonly logger: ContextLogger;
  constructor(
    private readonly tasksRepo: TasksRepository,
    private readonly requestContext: RequestContextService,
  ) {
    this.logger = new ContextLogger(this.requestContext, ListTaskAttachmentsUseCase.name);
  }

  async execute(taskId: string) {
    const rows = await this.tasksRepo.listAttachments(taskId);
    return { data: TaskAttachmentMapper.toResponseDtos(rows as any) };
  }
}


