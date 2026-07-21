import { Injectable } from "@nestjs/common";
import { UpdateAssetDto } from "../dto/update-asset.dto";
import { AssetMapper } from "../mappers/asset.mapper";
import {
  AssetCatalogRepository,
  type AssetValues,
} from "../repositories/asset-catalog.repository";
import { throwNotFound } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { RequestContextService } from "../../../../shared/context/request-context.service";

@Injectable()
export class UpdateAssetUseCase {
  constructor(
    private readonly catalogRepo: AssetCatalogRepository,
    private readonly requestContext: RequestContextService,
  ) {}

  async execute(id: string, dto: UpdateAssetDto) {
    const existing = await this.catalogRepo.findAssetById(id);
    if (!existing || existing.deletedAt) {
      throwNotFound("Asset not found", ERROR_CODES.ASSET_NOT_FOUND, { id });
    }

    const actorUserId = this.requestContext.get()?.userId ?? null;
    const values: Partial<AssetValues> = {
      ...(dto.name !== undefined ? { name: dto.name } : {}),
      ...(dto.serialNumber !== undefined
        ? { serialNumber: dto.serialNumber }
        : {}),
      ...(dto.purchaseDate !== undefined
        ? { purchaseDate: dto.purchaseDate }
        : {}),
      ...(dto.purchaseCost !== undefined
        ? { purchaseCost: dto.purchaseCost }
        : {}),
      ...(dto.currency !== undefined ? { currency: dto.currency } : {}),
      ...(dto.metadata !== undefined ? { metadata: dto.metadata } : {}),
      updatedBy: actorUserId,
    };

    const updated = await this.catalogRepo.updateAsset(id, values);
    return AssetMapper.toResponse(updated!);
  }
}
