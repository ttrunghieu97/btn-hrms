import { Injectable } from '@nestjs/common';
import { RolesRepository } from '../roles.repository';
import { ContextLogger } from "../../../../shared/logging/context-logger";
import { RequestContextService } from "../../../../shared/context/request-context.service";

@Injectable()
export class GetRoleUseCase {
  private readonly logger: ContextLogger;
  constructor(
    private readonly rolesRepository: RolesRepository,
    private readonly requestContext: RequestContextService,
  ) {
    this.logger = new ContextLogger(this.requestContext, GetRoleUseCase.name);
  }

  async execute(id: string) {
    return this.rolesRepository.findById(id);
  }
}
