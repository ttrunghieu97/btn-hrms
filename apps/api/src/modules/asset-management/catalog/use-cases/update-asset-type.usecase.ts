import { Injectable } from "@nestjs/common";
import { UpdateAssetTypeDto } from "../dto/update-asset-type.dto";
import { AssetTypeMapper } from "../mappers/asset.mapper";
import {
  AssetCatalogRepository,
  type AssetTypeValues,
} from "../repositories/asset-catalog.repository";
import { throwNotFound } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { RequestContextService } from "../../../../shared/context/request-context.service";

@Injectable()
export class UpdateAssetTypeUseCase {
  constructor(
    private readonly catalogRepo: AssetCatalogRepository,
    private readonly requestContext: RequestContextService,
  ) {}

  async execute(id: string, dto: UpdateAssetTypeDto) {
    const existing = await this.catalogRepo.findTypeById(id);
    if (!existing || existing.deletedAt) {
      throwNotFound("Asset type not found", ERROR_CODES.ASSET_TYPE_NOT_FOUND, {
        id,
      });
    }

    const actorUserId = this.requestContext.get()?.userId ?? null;
    const values: Partial<AssetTypeValues> = {
      ...(dto.name !== undefined ? { name: dto.name } : {}),
      ...(dto.description !== undefined
        ? { description: dto.description }
        : {}),
      updatedBy: actorUserId,
    };

    const updated = await this.catalogRepo.updateType(id, values);
    return AssetTypeMapper.toResponse(updated!);
  }
}
