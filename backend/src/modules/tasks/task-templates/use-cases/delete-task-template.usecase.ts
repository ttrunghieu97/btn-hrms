import { Injectable } from "@nestjs/common";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { throwNotFound } from "../../../../shared/utils/http-error";
import { TaskTemplatesRepository } from "../repositories/task-templates.repository";

@Injectable()
export class DeleteTaskTemplateUseCase {
  constructor(private readonly repo: TaskTemplatesRepository) {}

  async execute(id: string) {
    const deleted = await this.repo.delete(id);
    if (!deleted) {
      throwNotFound("Task template not found", ERROR_CODES.TASK_TEMPLATE_NOT_FOUND, { templateId: id });
    }
    return deleted;
  }
}
