import { Injectable } from "@nestjs/common";
import { UpdateLocationDto } from "../dto/update-location.dto";
import { LocationMapper } from "../mappers/location.mapper";
import { LocationsRepository } from "../repositories/locations.repository";
import { throwNotFound } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { ContextLogger } from "../../../../shared/logging/context-logger";
import { RequestContextService } from "../../../../shared/context/request-context.service";

@Injectable()
export class UpdateLocationUseCase {
  private readonly logger: ContextLogger;
  constructor(
    private readonly locationsRepo: LocationsRepository,
    private readonly requestContext: RequestContextService,
  ) {
    this.logger = new ContextLogger(this.requestContext, UpdateLocationUseCase.name);
  }

  async execute(id: string, data: UpdateLocationDto) {
    const existing = await this.locationsRepo.findById(id);
    if (!existing) {
      throwNotFound("Location not found", ERROR_CODES.LOCATION_NOT_FOUND, {
        id,
      });
    }

    const result = await this.locationsRepo.update(id, data as any /* eslint-disable-line @typescript-eslint/no-explicit-any */);
    return LocationMapper.toResponseDto(result);
  }
}






