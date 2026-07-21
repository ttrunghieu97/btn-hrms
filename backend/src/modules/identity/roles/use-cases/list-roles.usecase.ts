import { Injectable } from '@nestjs/common';
import { RolesRepository } from '../roles.repository';
import { ContextLogger } from "../../../../shared/logging/context-logger";
import { RequestContextService } from "../../../../shared/context/request-context.service";

@Injectable()
export class ListRolesUseCase {
  private readonly logger: ContextLogger;
  constructor(
    private readonly rolesRepository: RolesRepository,
    private readonly requestContext: RequestContextService,
  ) {
    this.logger = new ContextLogger(this.requestContext, ListRolesUseCase.name);
  }

  async execute() {
    return this.rolesRepository.findAll();
  }
}
