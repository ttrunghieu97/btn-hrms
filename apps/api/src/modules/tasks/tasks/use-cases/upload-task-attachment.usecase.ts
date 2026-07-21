import { type AuthUser } from "../../../../core/security/types/auth-user.interface";
import { Injectable } from "@nestjs/common";
import { TasksRepository } from "../repositories/tasks.repository";
import { StorageService } from "../../../../infrastructure/storage/storage.service";
import { throwNotFound } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { TaskAttachmentMapper } from "../mappers/task-attachment.mapper";
import { TaskEventsService } from "../realtime/task-events.service";
import { TaskMapper } from "../mappers/task.mapper";
import { ContextLogger } from "../../../../shared/logging/context-logger";
import { RequestContextService } from "../../../../shared/context/request-context.service";

@Injectable()
export class UploadTaskAttachmentUseCase {
  private readonly logger: ContextLogger;
  constructor(
    private readonly tasksRepo: TasksRepository,
    private readonly storage: StorageService,
    private readonly taskEvents: TaskEventsService,
    private readonly requestContext: RequestContextService,
  ) {
    this.logger = new ContextLogger(this.requestContext, UploadTaskAttachmentUseCase.name);
  }

  async execute(taskId: string, file: Express.Multer.File, actor: AuthUser) {
    const existing = await this.tasksRepo.findById(taskId);
    if (!existing) {
      throwNotFound("Task not found", ERROR_CODES.TASK_NOT_FOUND, { taskId });
    }

    const tempId = taskId;
    const upload = await this.storage.uploadTemp({
      buffer: file.buffer,
      mimeType: file.mimetype,
      originalName: file.originalname,
      ownerType: "task",
      ownerId: tempId,
      purpose: "attachment",
      uploadedBy: actor?.id ?? "system",
    });

    const url = await this.storage.promoteTempTo(upload.url, `tasks/${taskId}`);

    const row = await this.tasksRepo.addAttachment({
      taskId,
      uploadedByUserId: actor?.id ?? null,
      fileName: file.originalname,
      url: url ?? upload.url,
      mimeType: file.mimetype,
      size: file.size,
    });

    this.taskEvents.publishTaskEvent({
      action: "task_updated",
      taskId,
      task: TaskMapper.toResponseDto(existing),
      assigneeEmployeeId: (existing)?.assigneeId ?? null,
      actorUserId: actor?.id ?? null,
    });

    return TaskAttachmentMapper.toResponseDto(row as any);
  }
}




