import { Module } from "@nestjs/common";
import { OnboardingController } from "./onboarding.controller";
import { BoardingProcessController } from "./boarding-process.controller";
import { OnboardingTemplateRepository } from "./repositories/onboarding-template.repository";
import { OnboardingProcessRepository } from "./repositories/onboarding-process.repository";
import { ListOnboardingTemplatesUseCase } from "./use-cases/list-onboarding-templates.usecase";
import { GetOnboardingTemplateUseCase } from "./use-cases/get-onboarding-template.usecase";
import { CreateOnboardingTemplateUseCase } from "./use-cases/create-onboarding-template.usecase";
import { UpdateOnboardingTemplateUseCase } from "./use-cases/update-onboarding-template.usecase";
import { DeleteOnboardingTemplateUseCase } from "./use-cases/delete-onboarding-template.usecase";
import { CreateOnboardingProcessUseCase } from "./use-cases/create-onboarding-process.usecase";
import { CreateBoardingProcessUseCase } from "./use-cases/create-boarding-process.usecase";
import { ListOnboardingProcessesUseCase } from "./use-cases/list-onboarding-processes.usecase";
import { GetOnboardingProcessUseCase } from "./use-cases/get-onboarding-process.usecase";
import { BoardingModule } from "./boarding.module";
import { ContractsModule } from "../../contracts/contracts.module";

@Module({
  imports: [BoardingModule, ContractsModule],
  controllers: [OnboardingController, BoardingProcessController],
  providers: [
    OnboardingTemplateRepository,
    OnboardingProcessRepository,
    ListOnboardingTemplatesUseCase,
    GetOnboardingTemplateUseCase,
    CreateOnboardingTemplateUseCase,
    UpdateOnboardingTemplateUseCase,
    DeleteOnboardingTemplateUseCase,
    CreateOnboardingProcessUseCase,
    CreateBoardingProcessUseCase,
    ListOnboardingProcessesUseCase,
    GetOnboardingProcessUseCase,
  ],
})
export class OnboardingModule {}
