import { Injectable } from "@nestjs/common";
import { ReceiveStockDto } from "../dto/receive-stock.dto";
import { StockLevelMapper } from "../mappers/stock-level.mapper";
import { AssetInventoryRepository } from "../repositories/asset-inventory.repository";
import { throwNotFound } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { RequestContextService } from "../../../../shared/context/request-context.service";

@Injectable()
export class ReceiveStockUseCase {
  constructor(
    private readonly inventoryRepo: AssetInventoryRepository,
    private readonly requestContext: RequestContextService,
  ) {}

  async execute(dto: ReceiveStockDto) {
    const type = await this.inventoryRepo.findTypeById(dto.assetTypeId);
    if (!type || type.deletedAt) {
      throwNotFound("Asset type not found", ERROR_CODES.ASSET_TYPE_NOT_FOUND, {
        assetTypeId: dto.assetTypeId,
      });
    }

    const stock = await this.inventoryRepo.getStockByType(dto.assetTypeId);
    if (!stock) {
      throwNotFound(
        "Stock level not found for asset type",
        ERROR_CODES.ASSET_TYPE_NOT_FOUND,
        { assetTypeId: dto.assetTypeId },
      );
    }

    const actorUserId = this.requestContext.get()?.userId ?? null;

    const updated = await this.inventoryRepo.transaction(async (tx) => {
      // Append-only log first, then move the projection in the same tx.
      await this.inventoryRepo.appendHistory(
        {
          kind: "received",
          assetTypeId: dto.assetTypeId,
          quantityDelta: dto.quantity,
          actorUserId,
          detail: {
            ...(dto.note !== undefined ? { note: dto.note } : {}),
          },
        },
        tx,
      );

      return this.inventoryRepo.adjustOnHand(dto.assetTypeId, dto.quantity, tx);
    });

    return StockLevelMapper.toResponse(updated!);
  }
}
