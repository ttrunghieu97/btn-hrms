import { Injectable } from "@nestjs/common";
import { OnboardingTemplateRepository } from "../repositories/onboarding-template.repository";
import type { CreateOnboardingTemplateDto } from "../dto/onboarding-template.dto";
import type { OnboardingTemplateResponseDto } from "../dto/onboarding-template-response.dto";

@Injectable()
export class CreateOnboardingTemplateUseCase {
  constructor(
    private readonly repo: OnboardingTemplateRepository,
  ) {}

  async execute(dto: CreateOnboardingTemplateDto): Promise<OnboardingTemplateResponseDto> {
    return this.repo.create(dto);
  }
}
