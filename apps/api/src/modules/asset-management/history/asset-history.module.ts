import { Module } from "@nestjs/common";
import { AssetHistoryController } from "./asset-history.controller";
import { AssetHistoryRepository } from "./repositories/asset-history.repository";
import { GetAssetHistoryUseCase } from "./use-cases/get-asset-history.usecase";

@Module({
  controllers: [AssetHistoryController],
  providers: [AssetHistoryRepository, GetAssetHistoryUseCase],
  exports: [AssetHistoryRepository],
})
export class AssetHistoryModule {}
