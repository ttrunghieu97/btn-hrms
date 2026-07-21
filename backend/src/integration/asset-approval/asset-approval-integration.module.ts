import { Module } from "@nestjs/common";
import { DatabaseModule } from "@/infrastructure/database/database.module";
import { PlatformApprovalEngineDomainModule } from "@/modules/platform-approval-engine/platform-approval-engine.module";
import { AssetRequestModule } from "@/modules/asset-management/request/asset-request.module";
import { AssetApprovalIntegrationHandler } from "./asset-approval-integration.handler";
import { AssetApprovalPolicyResolver } from "./asset-approval-policy.resolver";
import { AssetApprovalGateway } from "./asset-approval.gateway";
import { AssetApprovalLinkRepository } from "./asset-approval-link.repository";
import { AssetApprovalListener } from "./asset-approval.listener";
import { AssetDecisionHandler } from "./asset-decision.handler.service";

@Module({
  imports: [
    DatabaseModule,
    PlatformApprovalEngineDomainModule,
    AssetRequestModule,
  ],
  providers: [
    AssetApprovalIntegrationHandler,
    AssetApprovalPolicyResolver,
    AssetApprovalGateway,
    AssetApprovalLinkRepository,
    AssetDecisionHandler,
    AssetApprovalListener,
  ],
  exports: [AssetApprovalLinkRepository],
})
export class AssetApprovalIntegrationModule {}
