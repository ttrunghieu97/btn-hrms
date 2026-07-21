import { Module } from "@nestjs/common";
import { BenefitsController } from "./benefits.controller";
import { BenefitPlanRepository } from "./plan/repositories/benefit-plan.repository";
import { BenefitEnrollmentRepository } from "./enrollment/repositories/benefit-enrollment.repository";
import {
  CreatePlanUseCase, ListPlansUseCase, GetPlanUseCase, PublishPlanUseCase,
} from "./plan/use-cases";
import {
  EnrollEmployeeUseCase, ApproveEnrollmentUseCase, CancelEnrollmentUseCase, ListEnrollmentsUseCase,
} from "./enrollment/use-cases";
import { AddDependentUseCase } from "./dependents/use-cases";
import { BenefitEnrollmentNotificationSubscriber } from "./subscribers/enrollment-notification.subscriber";
import { PlatformNotificationsDomainModule } from "../platform-notifications/platform-notifications.module";

@Module({
  imports: [PlatformNotificationsDomainModule],
  controllers: [BenefitsController],
  providers: [
    BenefitPlanRepository, BenefitEnrollmentRepository,
    CreatePlanUseCase, ListPlansUseCase, GetPlanUseCase, PublishPlanUseCase,
    EnrollEmployeeUseCase, ApproveEnrollmentUseCase, CancelEnrollmentUseCase, ListEnrollmentsUseCase,
    AddDependentUseCase,
    BenefitEnrollmentNotificationSubscriber,
  ],
})
export class BenefitsDomainModule {}
