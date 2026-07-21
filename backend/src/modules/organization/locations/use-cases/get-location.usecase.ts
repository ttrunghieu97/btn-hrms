import { Injectable } from "@nestjs/common";
import { LocationQueryDto } from "../dto/location-query.dto";
import { LocationMapper } from "../mappers/location.mapper";
import { LocationsRepository } from "../repositories/locations.repository";
import { ContextLogger } from "../../../../shared/logging/context-logger";
import { RequestContextService } from "../../../../shared/context/request-context.service";

@Injectable()
export class GetLocationUseCase {
  private readonly logger: ContextLogger;
  constructor(
    private readonly locationsRepo: LocationsRepository,
    private readonly requestContext: RequestContextService,
  ) {
    this.logger = new ContextLogger(this.requestContext, GetLocationUseCase.name);
  }

  async execute(id: string, query?: LocationQueryDto) {
    const result = await this.locationsRepo.findById(id, query);
    return LocationMapper.toResponseDto(result);
  }
}


