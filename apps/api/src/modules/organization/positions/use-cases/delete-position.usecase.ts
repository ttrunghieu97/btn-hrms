import { Injectable } from "@nestjs/common";
import { throwNotFound } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { PositionsRepository } from "../repositories/positions.repository";
import { ContextLogger } from "../../../../shared/logging/context-logger";
import { RequestContextService } from "../../../../shared/context/request-context.service";

@Injectable()
export class DeletePositionUseCase {
  private readonly logger: ContextLogger;
  constructor(
    private readonly positionsRepo: PositionsRepository,
    private readonly requestContext: RequestContextService,
  ) {
    this.logger = new ContextLogger(this.requestContext, DeletePositionUseCase.name);
  }

  async execute(id: string): Promise<void> {
    const existing = await this.positionsRepo.getActive(id);

    if (!existing) {
      throwNotFound("Position not found", ERROR_CODES.POSITION_NOT_FOUND, { positionId: id });
    }

    await this.positionsRepo.softDeletePosition(id);
  }
}

