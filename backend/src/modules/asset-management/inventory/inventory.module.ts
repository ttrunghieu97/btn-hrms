import { Module } from "@nestjs/common";
import { PlatformNotificationsDomainModule } from "../../platform-notifications/platform-notifications.module";
import { AssetInventoryController } from "./inventory.controller";
import { AssetInventoryRepository } from "./repositories/asset-inventory.repository";
import { ListStockLevelsUseCase } from "./use-cases/list-stock-levels.usecase";
import { GetStockLevelUseCase } from "./use-cases/get-stock-level.usecase";
import { ReceiveStockUseCase } from "./use-cases/receive-stock.usecase";
import { AdjustStockUseCase } from "./use-cases/adjust-stock.usecase";

@Module({
  imports: [PlatformNotificationsDomainModule],
  controllers: [AssetInventoryController],
  providers: [
    AssetInventoryRepository,
    ListStockLevelsUseCase,
    GetStockLevelUseCase,
    ReceiveStockUseCase,
    AdjustStockUseCase,
  ],
  exports: [AssetInventoryRepository],
})
export class AssetInventoryModule {}
