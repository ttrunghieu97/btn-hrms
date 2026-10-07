import { Injectable } from "@nestjs/common";
import { CreateTaskDto } from "../../tasks/dto/create-task.dto";
import { CreateTaskUseCase } from "../../tasks/use-cases/create-task.usecase";
import { TaskTemplatesRepository } from "../repositories/task-templates.repository";
import { GetTaskTemplateUseCase } from "./get-task-template.usecase";

@Injectable()
export class InstantiateTaskTemplateUseCase {
  constructor(
    private readonly getTaskTemplate: GetTaskTemplateUseCase,
    private readonly repo: TaskTemplatesRepository,
    private readonly createTaskUseCase: CreateTaskUseCase,
  ) {}

  async execute(templateId: string, overrides: Partial<CreateTaskDto>, creatorId: string) {
    const template = await this.getTaskTemplate.execute(templateId);
    const createTaskPayload: CreateTaskDto = {
      title: overrides.title ?? template.title,
    };

    const templateDescription = template.description === null ? undefined : template.description;
    const templateAssigneeId = template.defaultAssigneeId === null ? undefined : template.defaultAssigneeId;
    const templateChecklist = Array.isArray(template.checklist) ? (template.checklist as CreateTaskDto["checklist"]) : undefined;

    if (templateDescription !== undefined) createTaskPayload.description = templateDescription;
    if (templateAssigneeId !== undefined) createTaskPayload.assigneeId = templateAssigneeId;
    createTaskPayload.priority = template.priority;
    if (templateChecklist !== undefined) createTaskPayload.checklist = templateChecklist;

    if (overrides.description !== undefined) createTaskPayload.description = overrides.description;
    if (overrides.assigneeId !== undefined) createTaskPayload.assigneeId = overrides.assigneeId;
    if (overrides.parentTaskId !== undefined) createTaskPayload.parentTaskId = overrides.parentTaskId;
    if (overrides.priority !== undefined) createTaskPayload.priority = overrides.priority;
    if (overrides.dueDate !== undefined) createTaskPayload.dueDate = overrides.dueDate;
    if (overrides.progress !== undefined) createTaskPayload.progress = overrides.progress;
    if (overrides.resultText !== undefined) createTaskPayload.resultText = overrides.resultText;
    if (overrides.checklist !== undefined) createTaskPayload.checklist = overrides.checklist;

    const newTask = await this.createTaskUseCase.execute(createTaskPayload, creatorId);
    await this.repo.updateTaskTemplateLink(newTask.id, templateId);
    return { ...newTask, templateId };
  }
}
