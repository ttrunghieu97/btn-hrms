import { Injectable } from "@nestjs/common";
import { throwBadRequest, throwNotFound } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { TasksRepository } from "../repositories/tasks.repository";
import { TaskDependenciesRepository } from "../repositories/task-dependencies.repository";
import { ContextLogger } from "../../../../shared/logging/context-logger";
import { RequestContextService } from "../../../../shared/context/request-context.service";

@Injectable()
export class ManageTaskDependenciesUseCase {
  private readonly logger: ContextLogger;
  constructor(
    private readonly depsRepo: TaskDependenciesRepository,
    private readonly tasksRepo: TasksRepository,
    private readonly requestContext: RequestContextService,
  ) {
    this.logger = new ContextLogger(this.requestContext, ManageTaskDependenciesUseCase.name);
  }

  async listDependencies(taskId: string): Promise<any> {
    return this.depsRepo.listByTaskId(taskId);
  }

  async addDependency(
    taskId: string,
    dependsOnTaskId: string,
    type: "blocks" | "related" = "blocks",
  ) {
    if (taskId === dependsOnTaskId) {
      throwBadRequest("Task cannot depend on itself", ERROR_CODES.TASK_DEPENDENCY_SELF_REF, { taskId });
    }

    // Check circular dependencies minimally (depth 1)
    const existingReverse = await this.depsRepo.findReverse(
      dependsOnTaskId,
      taskId,
    );
    if (existingReverse)
      throwBadRequest("Circular dependencies are not allowed", ERROR_CODES.TASK_DEPENDENCY_CIRCULAR, { taskId, dependsOnTaskId });

    const row = await this.depsRepo.create({
      taskId,
      dependsOnTaskId,
      type: type,
    });
    return row;
  }

  async removeDependency(taskId: string, dependsOnTaskId: string) {
    const row = await this.depsRepo.remove(taskId, dependsOnTaskId);
    if (!row) throwNotFound("Dependency not found", ERROR_CODES.TASK_DEPENDENCY_NOT_FOUND, { taskId, dependsOnTaskId });
    return row;
  }
}



