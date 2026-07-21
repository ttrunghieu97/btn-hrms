import { Injectable } from "@nestjs/common";
import { ManageTaskDelegationsUseCase } from "./manage-task-delegations.usecase";
import { ContextLogger } from "../../../../shared/logging/context-logger";
import { RequestContextService } from "../../../../shared/context/request-context.service";

@Injectable()
export class RevokeTaskDelegationUseCase {
  private readonly logger: ContextLogger;
  constructor(
    private readonly manageTaskDelegations: ManageTaskDelegationsUseCase,
    private readonly requestContext: RequestContextService,
  ) {
    this.logger = new ContextLogger(this.requestContext, RevokeTaskDelegationUseCase.name);
  }

  async execute(id: string, actorUserId: string) {
    await this.manageTaskDelegations.revoke(id, actorUserId);
    return { ok: true };
  }
}
