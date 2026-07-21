import { Module } from "@nestjs/common";
import { DatabaseModule } from "@/infrastructure/database/database.module";
import { PlatformApprovalEngineDomainModule } from "@/modules/platform-approval-engine/platform-approval-engine.module";
import { LeaveManagementModule } from "@/modules/leave/leave-management/leave-management.module";
import { LeaveApprovalIntegrationHandler } from "./leave-approval-integration.handler";
import { LeaveApprovalPolicyResolver } from "./leave-approval-policy.resolver";
import { LeaveApprovalGateway } from "./leave-approval.gateway";
import { LeaveApprovalLinkRepository } from "./leave-approval-link.repository";
import { LeaveApprovalListener } from "./leave-approval.listener";
import { LeaveDecisionHandler } from "./leave-decision.handler.service";
import { ApprovalInboxController } from "./approval-inbox.controller";
import { ApprovalInboxRepository } from "./approval-inbox.repository";
import { LeaveTraceController } from "./leave-trace.controller";
import { LeaveTraceRepository } from "./leave-trace.repository";

@Module({
  imports: [DatabaseModule, PlatformApprovalEngineDomainModule, LeaveManagementModule],
  controllers: [ApprovalInboxController, LeaveTraceController],
  providers: [
    LeaveApprovalIntegrationHandler,
    LeaveApprovalPolicyResolver,
    LeaveApprovalGateway,
    LeaveApprovalLinkRepository,
    LeaveDecisionHandler,
    LeaveApprovalListener,
    ApprovalInboxRepository,
    LeaveTraceRepository,
  ],
  exports: [LeaveApprovalLinkRepository, ApprovalInboxRepository],
})
export class LeaveApprovalIntegrationModule {}
