import { Injectable } from "@nestjs/common";
import { CreateTaskDelegationDto } from "../dto/create-task-delegation.dto";
import { ManageTaskDelegationsUseCase } from "./manage-task-delegations.usecase";
import { ContextLogger } from "../../../../shared/logging/context-logger";
import { RequestContextService } from "../../../../shared/context/request-context.service";

@Injectable()
export class CreateTaskDelegationUseCase {
  private readonly logger: ContextLogger;
  constructor(
    private readonly manageTaskDelegations: ManageTaskDelegationsUseCase,
    private readonly requestContext: RequestContextService,
  ) {
    this.logger = new ContextLogger(this.requestContext, CreateTaskDelegationUseCase.name);
  }

  execute(
    dto: CreateTaskDelegationDto,
    actorUserId: string,
    actor: { isSuperAdmin?: boolean; permissions?: string[] },
  ) {
    return this.manageTaskDelegations.create(
      actorUserId,
      dto.delegateeUserId,
      actor,
      dto.startsAt ? new Date(dto.startsAt) : undefined,
      dto.expiresAt ? new Date(dto.expiresAt) : undefined,
      dto.departmentId ?? null,
    );
  }
}
