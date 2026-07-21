import { Module } from "@nestjs/common";
import { TaskTemplatesController } from "./task-templates.controller";
import { TaskRecurrenceService } from "../tasks/jobs/task-recurrence.service";
import { TaskRecurrenceRepository } from "../tasks/repositories/task-recurrence.repository";
import { TasksModule } from "../tasks/tasks.module";
import { TaskTemplatesRepository } from "./repositories/task-templates.repository";
import {
  CreateTaskTemplateUseCase,
  DeleteTaskTemplateUseCase,
  GetTaskTemplateUseCase,
  InstantiateTaskTemplateUseCase,
  ListTaskTemplatesUseCase,
  UpdateTaskTemplateUseCase,
} from "./use-cases";

@Module({
  imports: [TasksModule],
  controllers: [TaskTemplatesController],
  providers: [
    TaskTemplatesRepository,
    TaskRecurrenceRepository,
    TaskRecurrenceService,
    ListTaskTemplatesUseCase,
    GetTaskTemplateUseCase,
    CreateTaskTemplateUseCase,
    UpdateTaskTemplateUseCase,
    DeleteTaskTemplateUseCase,
    InstantiateTaskTemplateUseCase,
  ],
  exports: [
    TaskRecurrenceService,
    ListTaskTemplatesUseCase,
    GetTaskTemplateUseCase,
    InstantiateTaskTemplateUseCase,
  ],
})
export class TaskTemplatesModule {}
