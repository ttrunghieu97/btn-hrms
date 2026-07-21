import { Injectable } from "@nestjs/common";
import { AddTaskDependencyDto } from "../dto/add-task-dependency.dto";
import { ManageTaskDependenciesUseCase } from "./manage-task-dependencies.usecase";
import { ContextLogger } from "../../../../shared/logging/context-logger";
import { RequestContextService } from "../../../../shared/context/request-context.service";

@Injectable()
export class AddTaskDependencyEndpointUseCase {
  private readonly logger: ContextLogger;
  constructor(
    private readonly manageTaskDependencies: ManageTaskDependenciesUseCase,
    private readonly requestContext: RequestContextService,
  ) {
    this.logger = new ContextLogger(this.requestContext, AddTaskDependencyEndpointUseCase.name);
  }

  execute(taskId: string, dto: AddTaskDependencyDto) {
    return this.manageTaskDependencies.addDependency(
      taskId,
      dto.dependsOnTaskId,
      dto.type,
    );
  }
}
