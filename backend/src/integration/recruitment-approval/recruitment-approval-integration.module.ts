import { Module } from "@nestjs/common";
import { DatabaseModule } from "@/infrastructure/database/database.module";
import { PlatformApprovalEngineDomainModule } from "@/modules/platform-approval-engine/platform-approval-engine.module";
import { RecruitmentDomainModule } from "@/modules/recruitment/recruitment.module";
import { RecruitmentApprovalIntegrationHandler } from "./recruitment-approval-integration.handler";
import { RecruitmentApprovalPolicyResolver } from "./recruitment-approval-policy.resolver";
import { RecruitmentApprovalGateway } from "./recruitment-approval.gateway";
import { RecruitmentApprovalLinkRepository } from "./recruitment-approval-link.repository";
import { RecruitmentApprovalListener } from "./recruitment-approval.listener";
import { RecruitmentDecisionHandler } from "./recruitment-decision.handler.service";

@Module({
  imports: [
    DatabaseModule,
    PlatformApprovalEngineDomainModule,
    RecruitmentDomainModule,
  ],
  providers: [
    RecruitmentApprovalIntegrationHandler,
    RecruitmentApprovalPolicyResolver,
    RecruitmentApprovalGateway,
    RecruitmentApprovalLinkRepository,
    RecruitmentDecisionHandler,
    RecruitmentApprovalListener,
  ],
  exports: [RecruitmentApprovalLinkRepository],
})
export class RecruitmentApprovalIntegrationModule {}
