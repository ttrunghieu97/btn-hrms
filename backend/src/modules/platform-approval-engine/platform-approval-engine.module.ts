import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../infrastructure/database/database.module";
import { PlatformApprovalEngineService } from "./platform-approval-engine.service";
import { PlatformApprovalEngineRepository } from "./repositories/platform-approval-engine.repository";

import { ApprovalPolicyController } from "./controllers/approval-policy.controller";
import { ApprovalRequestController } from "./controllers/approval-request.controller";

import { CreateApprovalPolicyUseCase } from "./use-cases/create-approval-policy.usecase";
import { ListApprovalPoliciesUseCase } from "./use-cases/list-approval-policies.usecase";
import { GetApprovalPolicyUseCase } from "./use-cases/get-approval-policy.usecase";
import { UpdateApprovalPolicyUseCase } from "./use-cases/update-approval-policy.usecase";
import { DeactivateApprovalPolicyUseCase } from "./use-cases/deactivate-approval-policy.usecase";
import { RequestApprovalUseCase } from "./use-cases/request-approval.usecase";
import { DecideApprovalStepUseCase } from "./use-cases/decide-approval-step.usecase";
import { CancelApprovalUseCase } from "./use-cases/cancel-approval.usecase";
import { GetApprovalRequestUseCase } from "./use-cases/get-approval-request.usecase";
import { ListApprovalRequestsUseCase } from "./use-cases/list-approval-requests.usecase";
import { GetApprovalInboxUseCase } from "./use-cases/get-approval-inbox.usecase";

@Module({
  imports: [DatabaseModule],
  controllers: [ApprovalPolicyController, ApprovalRequestController],
  providers: [
    PlatformApprovalEngineRepository,
    PlatformApprovalEngineService,
    CreateApprovalPolicyUseCase,
    ListApprovalPoliciesUseCase,
    GetApprovalPolicyUseCase,
    UpdateApprovalPolicyUseCase,
    DeactivateApprovalPolicyUseCase,
    RequestApprovalUseCase,
    DecideApprovalStepUseCase,
    CancelApprovalUseCase,
    GetApprovalRequestUseCase,
    ListApprovalRequestsUseCase,
    GetApprovalInboxUseCase,
  ],
  exports: [PlatformApprovalEngineService, PlatformApprovalEngineRepository],
})
export class PlatformApprovalEngineDomainModule {}
