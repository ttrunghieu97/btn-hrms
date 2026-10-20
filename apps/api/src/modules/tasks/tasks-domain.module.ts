import { Module } from "@nestjs/common";
import { RouterModule } from "@nestjs/core";
import { TasksModule } from "./tasks/tasks.module";
import { TaskTemplatesModule } from "./task-templates/task-templates.module";

@Module({
  imports: [
    TaskTemplatesModule,
    TasksModule,
    RouterModule.register([
      { path: "tasks/templates", module: TaskTemplatesModule },
      { path: "tasks", module: TasksModule },
    ]),
  ],
})
export class TasksDomainModule {}
