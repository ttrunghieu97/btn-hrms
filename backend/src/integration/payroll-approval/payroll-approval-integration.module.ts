import { Module } from "@nestjs/common";
import { DatabaseModule } from "@/infrastructure/database/database.module";
import { PlatformApprovalEngineDomainModule } from "@/modules/platform-approval-engine/platform-approval-engine.module";
import { PayrollApprovalIntegrationHandler } from "./payroll-approval-integration.handler";
import { PayrollApprovalPolicyResolver } from "./payroll-approval-policy.resolver";
import { PayrollApprovalGateway } from "./payroll-approval.gateway";
import { PayrollApprovalListener } from "./payroll-approval.listener";
import { PayrollDecisionHandler } from "./payroll-decision.handler.service";

@Module({
  imports: [DatabaseModule, PlatformApprovalEngineDomainModule],
  providers: [
    PayrollApprovalIntegrationHandler,
    PayrollApprovalPolicyResolver,
    PayrollApprovalGateway,
    PayrollDecisionHandler,
    PayrollApprovalListener,
  ],
})
export class PayrollApprovalIntegrationModule {}
