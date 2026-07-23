import { Injectable } from "@nestjs/common";
import { LocationsRepository } from "../repositories/locations.repository";
import { throwNotFound } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { ContextLogger } from "../../../../shared/logging/context-logger";
import { RequestContextService } from "../../../../shared/context/request-context.service";

@Injectable()
export class DeleteLocationUseCase {
  private readonly logger: ContextLogger;
  constructor(
    private readonly locationsRepo: LocationsRepository,
    private readonly requestContext: RequestContextService,
  ) {
    this.logger = new ContextLogger(this.requestContext, DeleteLocationUseCase.name);
  }

  async execute(id: string) {
    const existing = await this.locationsRepo.findById(id);
    if (!existing) {
      throwNotFound("Location not found", ERROR_CODES.LOCATION_NOT_FOUND, {
        id,
      });
    }

    await this.locationsRepo.delete(id);
  }
}


