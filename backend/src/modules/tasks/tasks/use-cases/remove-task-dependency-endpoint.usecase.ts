import { Injectable } from "@nestjs/common";
import { ManageTaskDependenciesUseCase } from "./manage-task-dependencies.usecase";
import { ContextLogger } from "../../../../shared/logging/context-logger";
import { RequestContextService } from "../../../../shared/context/request-context.service";

@Injectable()
export class RemoveTaskDependencyEndpointUseCase {
  private readonly logger: ContextLogger;
  constructor(
    private readonly manageTaskDependencies: ManageTaskDependenciesUseCase,
    private readonly requestContext: RequestContextService,
  ) {
    this.logger = new ContextLogger(this.requestContext, RemoveTaskDependencyEndpointUseCase.name);
  }

  execute(taskId: string, dependsOnTaskId: string) {
    return this.manageTaskDependencies.removeDependency(taskId, dependsOnTaskId);
  }
}
