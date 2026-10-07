import { Injectable } from "@nestjs/common";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { throwNotFound } from "../../../../shared/utils/http-error";
import { UpdateTaskTemplateDto } from "../dto/update-task-template.dto";
import { TaskTemplatesRepository } from "../repositories/task-templates.repository";

@Injectable()
export class UpdateTaskTemplateUseCase {
  constructor(private readonly repo: TaskTemplatesRepository) {}

  async execute(id: string, dto: UpdateTaskTemplateDto) {
    const updated = await this.repo.update(id, { ...dto, updatedAt: new Date() });
    if (!updated) {
      throwNotFound("Task template not found", ERROR_CODES.TASK_TEMPLATE_NOT_FOUND, { templateId: id });
    }
    return updated;
  }
}
