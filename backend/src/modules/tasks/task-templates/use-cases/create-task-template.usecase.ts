import { Injectable } from "@nestjs/common";
import { CreateTaskTemplateDto } from "../dto/create-task-template.dto";
import { TaskTemplatesRepository } from "../repositories/task-templates.repository";

@Injectable()
export class CreateTaskTemplateUseCase {
  constructor(private readonly repo: TaskTemplatesRepository) {}

  execute(dto: CreateTaskTemplateDto, creatorId: string) {
    return this.repo.create({ ...dto, createdByUserId: creatorId });
  }
}
