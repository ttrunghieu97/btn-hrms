import { Injectable } from "@nestjs/common";
import { ManageTaskDelegationsUseCase } from "./manage-task-delegations.usecase";
import { ContextLogger } from "../../../../shared/logging/context-logger";
import { RequestContextService } from "../../../../shared/context/request-context.service";

@Injectable()
export class ListTaskDelegationsUseCase {
  private readonly logger: ContextLogger;
  constructor(
    private readonly manageTaskDelegations: ManageTaskDelegationsUseCase,
    private readonly requestContext: RequestContextService,
  ) {
    this.logger = new ContextLogger(this.requestContext, ListTaskDelegationsUseCase.name);
  }

  execute(userId: string) {
    return this.manageTaskDelegations.listActive(userId);
  }
}
