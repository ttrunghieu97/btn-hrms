import { Injectable } from "@nestjs/common";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { throwNotFound } from "../../../../shared/utils/http-error";
import { TaskTemplatesRepository } from "../repositories/task-templates.repository";

@Injectable()
export class GetTaskTemplateUseCase {
  constructor(private readonly repo: TaskTemplatesRepository) {}

  async execute(id: string) {
    const template = await this.repo.findById(id);
    if (!template) {
      throwNotFound("Task template not found", ERROR_CODES.TASK_TEMPLATE_NOT_FOUND, { templateId: id });
    }
    return template;
  }
}
