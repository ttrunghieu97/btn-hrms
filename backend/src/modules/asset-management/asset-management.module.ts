import { Module } from "@nestjs/common";
import { RouterModule } from "@nestjs/core";
import { AssetCatalogModule } from "./catalog/catalog.module";
import { AssetInventoryModule } from "./inventory/inventory.module";
import { AssetRequestModule } from "./request/asset-request.module";
import { AssetIssueModule } from "./issue/asset-issue.module";
import { AssetHistoryModule } from "./history/asset-history.module";

/**
 * Asset-management bounded context. Sub-modules are mounted under distinct
 * route prefixes: catalog and inventory both define `GET /` and would collide
 * if they shared a prefix, so each owns its own segment.
 */
@Module({
  imports: [
    AssetCatalogModule,
    AssetInventoryModule,
    AssetRequestModule,
    AssetIssueModule,
    AssetHistoryModule,
    RouterModule.register([
      { path: "asset-management/catalog", module: AssetCatalogModule },
      { path: "asset-management/inventory", module: AssetInventoryModule },
      { path: "asset-management/requests", module: AssetRequestModule },
      { path: "asset-management/issues", module: AssetIssueModule },
      { path: "asset-management", module: AssetHistoryModule },
    ]),
  ],
  exports: [
    AssetCatalogModule,
    AssetInventoryModule,
    AssetRequestModule,
    AssetIssueModule,
    AssetHistoryModule,
  ],
})
export class AssetManagementModule {}
