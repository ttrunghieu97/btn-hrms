import { Module } from "@nestjs/common";
import { AssetIssueController } from "./asset-issue.controller";
import { AssetIssueRepository } from "./repositories/asset-issue.repository";
import { AssetRequestModule } from "../request/asset-request.module";
import { StorageDomainModule } from "../../storage/storage.module";
import { IssueAssetUseCase } from "./use-cases/issue-asset.usecase";
import { ReturnAssetUseCase } from "./use-cases/return-asset.usecase";
import { GetIssueUseCase } from "./use-cases/get-issue.usecase";
import { ListIssuesUseCase } from "./use-cases/list-issues.usecase";
import { GetEmployeeHoldingsUseCase } from "./use-cases/get-employee-holdings.usecase";
import { AssetHoldingsReaderAdapter } from "./adapters/asset-holdings-reader.adapter";
import { AssetEmployeeTerminatedSubscriber } from "./subscribers/employee-terminated.subscriber";
import { PlatformNotificationsDomainModule } from "../../platform-notifications/platform-notifications.module";
import { CONTRACTS_TOKENS } from "../../../contracts/contracts.tokens";

@Module({
  imports: [
    AssetRequestModule,
    StorageDomainModule,
    PlatformNotificationsDomainModule,
  ],
  controllers: [AssetIssueController],
  providers: [
    AssetIssueRepository,
    IssueAssetUseCase,
    ReturnAssetUseCase,
    GetIssueUseCase,
    ListIssuesUseCase,
    GetEmployeeHoldingsUseCase,
    AssetEmployeeTerminatedSubscriber,
    {
      provide: CONTRACTS_TOKENS.ASSET_HOLDINGS_READER_PORT,
      useClass: AssetHoldingsReaderAdapter,
    },
  ],
  exports: [
    AssetIssueRepository,
    CONTRACTS_TOKENS.ASSET_HOLDINGS_READER_PORT,
  ],
})
export class AssetIssueModule {}
