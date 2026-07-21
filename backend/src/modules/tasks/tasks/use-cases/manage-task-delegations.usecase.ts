import { Injectable } from "@nestjs/common";
import { throwForbidden } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { TaskDelegationsRepository } from "../repositories/task-delegations.repository";
import { ContextLogger } from "../../../../shared/logging/context-logger";
import { RequestContextService } from "../../../../shared/context/request-context.service";

@Injectable()
export class ManageTaskDelegationsUseCase {
  private readonly logger: ContextLogger;
  constructor(
    private readonly repo: TaskDelegationsRepository,
    private readonly requestContext: RequestContextService,
  ) {
    this.logger = new ContextLogger(this.requestContext, ManageTaskDelegationsUseCase.name);
  }

  async create(
    delegatorId: string,
    delegateeId: string,
    actor: { isSuperAdmin?: boolean; permissions?: string[] },
    startsAt?: Date,
    expiresAt?: Date,
    departmentId?: string | null,
  ) {
    // Department-scoped delegation requires admin-level permission
    if (departmentId) {
      const isAdmin =
        actor?.isSuperAdmin ||
        actor?.permissions?.includes("ALL") ||
        actor?.permissions?.includes("tasks:manage");
      if (!isAdmin) {
        throwForbidden(
          "Only admins can create department-scoped delegations",
          ERROR_CODES.PERMISSION_DENIED,
          { delegatorId },
        );
      }
    }

    return this.repo.create({
      delegatorUserId: delegatorId,
      delegateeUserId: delegateeId,
      departmentId: departmentId ?? null,
      startsAt: startsAt ?? new Date(),
      expiresAt: expiresAt ?? null,
    });
  }

  async listActive(userId: string): Promise<any> {
    return this.repo.listActiveByDelegator(userId);
  }

  async revoke(id: string, delegatorId: string) {
    await this.repo.revoke(id, delegatorId);
  }
}



