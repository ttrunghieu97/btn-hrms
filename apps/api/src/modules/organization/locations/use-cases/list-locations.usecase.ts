import { Injectable } from "@nestjs/common";
import { LocationQueryDto } from "../dto/location-query.dto";
import { LocationMapper } from "../mappers/location.mapper";
import { LocationsRepository } from "../repositories/locations.repository";
import { buildPaginatedResponse } from "../../../../shared/utils/pagination.util";
import { ContextLogger } from "../../../../shared/logging/context-logger";
import { RequestContextService } from "../../../../shared/context/request-context.service";

@Injectable()
export class ListLocationsUseCase {
  private readonly logger: ContextLogger;
  constructor(
    private readonly locationsRepo: LocationsRepository,
    private readonly requestContext: RequestContextService,
  ) {
    this.logger = new ContextLogger(this.requestContext, ListLocationsUseCase.name);
  }

  async execute(query: LocationQueryDto) {
    const { rows, total, page, limit } =
      await this.locationsRepo.findPaginated(query);

    return buildPaginatedResponse(
      LocationMapper.toResponseDtos(rows),
      total,
      page,
      limit,
    );
  }
}


