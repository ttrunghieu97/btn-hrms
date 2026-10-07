import { Injectable } from "@nestjs/common";
import { CreateLocationDto } from "../dto/create-location.dto";
import { LocationMapper } from "../mappers/location.mapper";
import { LocationsRepository } from "../repositories/locations.repository";
import {
  throwBadRequest,
  throwConflict,
  throwNotFound,
} from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { ContextLogger } from "../../../../shared/logging/context-logger";
import { RequestContextService } from "../../../../shared/context/request-context.service";

@Injectable()
export class CreateLocationUseCase {
  private readonly logger: ContextLogger;
  constructor(
    private readonly locationsRepo: LocationsRepository,
    private readonly requestContext: RequestContextService,
  ) {
    this.logger = new ContextLogger(this.requestContext, CreateLocationUseCase.name);
  }

  private readonly HIERARCHY_ORDER = [
    "region",
    "country",
    "city",
    "district",
    "site",
    "office",
  ];

  async execute(data: CreateLocationDto) {
    if (data.parentId) {
      const parent = await this.locationsRepo.findById(data.parentId);
      if (!parent) {
        throwNotFound(
          "Parent location does not exist",
          ERROR_CODES.LOCATION_NOT_FOUND,
          {
            parentId: data.parentId,
          },
        );
      }

      // Validate hierarchy order
      const parentTypeIndex = this.HIERARCHY_ORDER.indexOf(parent.type);
      const childTypeIndex = this.HIERARCHY_ORDER.indexOf(data.type);

      if (childTypeIndex <= parentTypeIndex) {
        throwBadRequest(
          `Invalid hierarchy: A '${data.type}' cannot be a child of a '${parent.type}'.`,
          ERROR_CODES.LOCATION_INVALID_HIERARCHY,
          { childType: data.type, parentType: parent.type },
        );
      }
    }

    const result = await this.locationsRepo.create(data as any  );
    if (!result) {
      throwConflict(
        "Failed to create location",
        ERROR_CODES.LOCATION_ALREADY_EXISTS,
        {
          name: data.name,
        },
      );
    }
    return LocationMapper.toResponseDto(result);
  }
}






