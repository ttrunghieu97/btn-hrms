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

  async execute(
    templateId: string,
    overrides: Partial<CreateTaskDto> | undefined,
    creatorId: string,
  ) {
    const safeOverrides = overrides ?? {};
    const template = await this.getTaskTemplate.execute(templateId);
    const createTaskPayload: CreateTaskDto = {
      title: safeOverrides.title ?? template.title,
    };

    const templateDescription = template.description === null ? undefined : template.description;
    const templateAssigneeId = template.defaultAssigneeId === null ? undefined : template.defaultAssigneeId;
    const templateChecklist = Array.isArray(template.checklist)
      ? (template.checklist.map((item: Record<string, unknown>) => ({
          ...item,
          text: String(item.text ?? item.title ?? ""),
          done: Boolean(item.done ?? item.completed ?? false),
        })) as CreateTaskDto["checklist"])
      : undefined;

    if (templateDescription !== undefined) createTaskPayload.description = templateDescription;
    if (templateAssigneeId !== undefined) createTaskPayload.assigneeId = templateAssigneeId;
    createTaskPayload.priority = template.priority;
    if (templateChecklist !== undefined) createTaskPayload.checklist = templateChecklist;

    if (safeOverrides.description !== undefined) createTaskPayload.description = safeOverrides.description;
    if (safeOverrides.assigneeId !== undefined) createTaskPayload.assigneeId = safeOverrides.assigneeId;
    if (safeOverrides.parentTaskId !== undefined) createTaskPayload.parentTaskId = safeOverrides.parentTaskId;
    if (safeOverrides.priority !== undefined) createTaskPayload.priority = safeOverrides.priority;
    if (safeOverrides.dueDate !== undefined) createTaskPayload.dueDate = safeOverrides.dueDate;
    if (safeOverrides.progress !== undefined) createTaskPayload.progress = safeOverrides.progress;
    if (safeOverrides.resultText !== undefined) createTaskPayload.resultText = safeOverrides.resultText;
    if (safeOverrides.checklist !== undefined) createTaskPayload.checklist = safeOverrides.checklist;

    const newTask = await this.createTaskUseCase.execute(createTaskPayload, creatorId);
    await this.repo.updateTaskTemplateLink(newTask.id, templateId);
    return { ...newTask, templateId };
  }
}
