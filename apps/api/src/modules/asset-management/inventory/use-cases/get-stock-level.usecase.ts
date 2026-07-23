import { Injectable } from "@nestjs/common";
import { StockLevelMapper } from "../mappers/stock-level.mapper";
import { AssetInventoryRepository } from "../repositories/asset-inventory.repository";
import { throwNotFound } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";

@Injectable()
export class GetStockLevelUseCase {
  constructor(private readonly inventoryRepo: AssetInventoryRepository) {}

  async execute(assetTypeId: string) {
    const row = await this.inventoryRepo.getStockByType(assetTypeId);
    if (!row) {
      throwNotFound(
        "Stock level not found for asset type",
        ERROR_CODES.ASSET_TYPE_NOT_FOUND,
        { assetTypeId },
      );
    }
    return StockLevelMapper.toResponse(row);
  }
}
