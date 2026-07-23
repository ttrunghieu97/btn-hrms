import { Module } from "@nestjs/common";
import { RouterModule } from "@nestjs/core";
import { TasksModule } from "./tasks/tasks.module";
import { TaskTemplatesModule } from "./task-templates/task-templates.module";

@Module({
  imports: [
    TasksModule,
    TaskTemplatesModule,
    RouterModule.register([
      { path: "tasks", module: TasksModule },
      { path: "tasks/templates", module: TaskTemplatesModule },
    ]),
  ],
})
export class TasksDomainModule {}
