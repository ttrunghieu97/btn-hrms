import { Injectable, Logger } from "@nestjs/common";
import { AdjustStockDto } from "../dto/adjust-stock.dto";
import { StockLevelMapper } from "../mappers/stock-level.mapper";
import { AssetInventoryRepository } from "../repositories/asset-inventory.repository";
import { throwBadRequest, throwNotFound } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { RequestContextService } from "../../../../shared/context/request-context.service";
import { SendNotificationUseCase } from "../../../platform-notifications/use-cases/send-notification.usecase";

@Injectable()
export class AdjustStockUseCase {
  private readonly logger = new Logger(AdjustStockUseCase.name);

  constructor(
    private readonly inventoryRepo: AssetInventoryRepository,
    private readonly requestContext: RequestContextService,
    private readonly sendNotification: SendNotificationUseCase,
  ) {}

  async execute(dto: AdjustStockDto) {
    if (dto.delta === 0) {
      throwBadRequest(
        "Adjustment delta must be non-zero",
        ERROR_CODES.ASSET_VALIDATION,
        { delta: dto.delta },
      );
    }

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

    const projected = stock.onHand + dto.delta;
    if (projected < 0) {
      throwBadRequest(
        "Adjustment would drive on-hand below zero",
        ERROR_CODES.ASSET_INSUFFICIENT_STOCK,
        { assetTypeId: dto.assetTypeId, onHand: stock.onHand, delta: dto.delta },
      );
    }

    const actorUserId = this.requestContext.get()?.userId ?? null;

    const updated = await this.inventoryRepo.transaction(async (tx) => {
      await this.inventoryRepo.appendHistory(
        {
          kind: "adjusted",
          assetTypeId: dto.assetTypeId,
          quantityDelta: dto.delta,
          actorUserId,
          detail: {
            ...(dto.reason !== undefined ? { reason: dto.reason } : {}),
          },
        },
        tx,
      );

      return this.inventoryRepo.adjustOnHand(dto.assetTypeId, dto.delta, tx);
    });

    // Low-stock signal only fires on a decrement that lands at/below threshold.
    if (dto.delta < 0) {
      await this.maybeSignalLowStock(
        updated!.assetTypeId,
        updated!.onHand,
        updated!.lowStockThreshold,
        type.name,
        actorUserId,
      );
    }

    return StockLevelMapper.toResponse(updated!);
  }

  private async maybeSignalLowStock(
    assetTypeId: string,
    onHand: number,
    lowStockThreshold: number | null,
    typeName: string,
    actorUserId: string | null,
  ) {
    if (lowStockThreshold == null || onHand > lowStockThreshold) return;
    if (!actorUserId) return;

    try {
      await this.sendNotification.execute({
        userId: actorUserId,
        subject: "Low stock alert",
        body: `Stock for {{typeName}} is low: {{onHand}} on hand (threshold {{threshold}}).`,
        context: {
          assetTypeId,
          typeName,
          onHand,
          threshold: lowStockThreshold,
        },
      });
    } catch (error) {
      // Never fail the adjustment because the signal could not be sent.
      this.logger.warn(
        `Failed to send low-stock notification for asset type ${assetTypeId}: ${String(error)}`,
      );
    }
  }
}
