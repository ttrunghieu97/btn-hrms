import { Module } from "@nestjs/common";
import { OnboardingTemplateRepository } from "./repositories/onboarding-template.repository";
import { OnboardingProcessRepository } from "./repositories/onboarding-process.repository";
import { ListOnboardingTemplatesUseCase } from "./use-cases/list-onboarding-templates.usecase";
import { GetOnboardingTemplateUseCase } from "./use-cases/get-onboarding-template.usecase";
import { CreateOnboardingTemplateUseCase } from "./use-cases/create-onboarding-template.usecase";
import { UpdateOnboardingTemplateUseCase } from "./use-cases/update-onboarding-template.usecase";
import { DeleteOnboardingTemplateUseCase } from "./use-cases/delete-onboarding-template.usecase";
import { CreateBoardingProcessUseCase } from "./use-cases/create-boarding-process.usecase";
import { ContractsModule } from "../../contracts/contracts.module";

/**
 * BoardingModule — single aggregate owner of boarding_* tables + exit_interviews.
 * Both onboarding and offboarding orchestration modules import this.
 */
@Module({
  imports: [ContractsModule],
  controllers: [],
  providers: [
    OnboardingTemplateRepository,

    OnboardingProcessRepository,
    ListOnboardingTemplatesUseCase,
    GetOnboardingTemplateUseCase,
    CreateOnboardingTemplateUseCase,
    UpdateOnboardingTemplateUseCase,
    DeleteOnboardingTemplateUseCase,
    CreateBoardingProcessUseCase,
  ],
  exports: [
    OnboardingTemplateRepository,
    OnboardingProcessRepository,
    CreateBoardingProcessUseCase,
  ],
})
export class BoardingModule {}
