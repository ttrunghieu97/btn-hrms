import { Injectable } from "@nestjs/common";
import { PermissionsRepository } from "../../permissions/repositories/permissions.repository";
import { ContextLogger } from "../../../../shared/logging/context-logger";
import { RequestContextService } from "../../../../shared/context/request-context.service";

@Injectable()
export class GetUserPermissionsUseCase {
  private readonly logger: ContextLogger;
  constructor(
    private readonly permissionsRepo: PermissionsRepository,
    private readonly requestContext: RequestContextService,
  ) {
    this.logger = new ContextLogger(this.requestContext, GetUserPermissionsUseCase.name);
  }

  async execute(userId: string) {
    return this.permissionsRepo.findUserPermissionCodes(userId);
  }
}
