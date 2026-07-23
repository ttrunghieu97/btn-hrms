import { Injectable } from "@nestjs/common";
import { LocationMapper } from "../mappers/location.mapper";
import { LocationQueryDto } from "../dto/location-query.dto";
import { LocationsRepository } from "../repositories/locations.repository";
import { ContextLogger } from "../../../../shared/logging/context-logger";
import { RequestContextService } from "../../../../shared/context/request-context.service";

@Injectable()
export class ListLocationsFlatUseCase {
  private readonly logger: ContextLogger;
  constructor(
    private readonly locationsRepo: LocationsRepository,
    private readonly requestContext: RequestContextService,
  ) {
    this.logger = new ContextLogger(this.requestContext, ListLocationsFlatUseCase.name);
  }

  async execute(query: LocationQueryDto) {
    const list = await this.locationsRepo.findList(query);
    return LocationMapper.toResponseDtos(list);
  }
}


