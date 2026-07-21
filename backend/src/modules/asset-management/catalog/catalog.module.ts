import { Module } from "@nestjs/common";
import { AssetCatalogController } from "./catalog.controller";
import { AssetCatalogRepository } from "./repositories/asset-catalog.repository";
import { CreateAssetTypeUseCase } from "./use-cases/create-asset-type.usecase";
import { UpdateAssetTypeUseCase } from "./use-cases/update-asset-type.usecase";
import { RetireAssetTypeUseCase } from "./use-cases/retire-asset-type.usecase";
import { ListAssetTypesUseCase } from "./use-cases/list-asset-types.usecase";
import { RegisterAssetUseCase } from "./use-cases/register-asset.usecase";
import { UpdateAssetUseCase } from "./use-cases/update-asset.usecase";
import { ListAssetsUseCase } from "./use-cases/list-assets.usecase";
import { ChangeAssetStatusUseCase } from "./use-cases/change-asset-status.usecase";

@Module({
  controllers: [AssetCatalogController],
  providers: [
    AssetCatalogRepository,
    CreateAssetTypeUseCase,
    UpdateAssetTypeUseCase,
    RetireAssetTypeUseCase,
    ListAssetTypesUseCase,
    RegisterAssetUseCase,
    UpdateAssetUseCase,
    ListAssetsUseCase,
    ChangeAssetStatusUseCase,
  ],
  exports: [AssetCatalogRepository],
})
export class AssetCatalogModule {}
