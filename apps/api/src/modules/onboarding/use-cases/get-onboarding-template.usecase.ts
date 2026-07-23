import { Injectable } from "@nestjs/common";
import { OnboardingTemplateRepository } from "../repositories/onboarding-template.repository";
import { throwNotFound } from "../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../shared/constants/error-codes";
import type { OnboardingTemplateResponseDto } from "../dto/onboarding-template-response.dto";

@Injectable()
export class GetOnboardingTemplateUseCase {
  constructor(
    private readonly repo: OnboardingTemplateRepository,
  ) {}

  async execute(id: string): Promise<OnboardingTemplateResponseDto> {
    const template = await this.repo.findByIdWithItems(id);
    if (!template) {
      throwNotFound("Onboarding template not found", ERROR_CODES.ONBOARDING_TEMPLATE_NOT_FOUND, { id });
    }
    return template;
  }
}
