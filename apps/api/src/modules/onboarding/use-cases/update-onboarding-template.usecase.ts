import { Injectable } from "@nestjs/common";
import { OnboardingTemplateRepository } from "../repositories/onboarding-template.repository";
import { throwNotFound } from "../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../shared/constants/error-codes";
import type { UpdateOnboardingTemplateDto } from "../dto/onboarding-template.dto";
import type { OnboardingTemplateResponseDto } from "../dto/onboarding-template-response.dto";

@Injectable()
export class UpdateOnboardingTemplateUseCase {
  constructor(
    private readonly repo: OnboardingTemplateRepository,
  ) {}

  async execute(id: string, dto: UpdateOnboardingTemplateDto): Promise<OnboardingTemplateResponseDto> {
    // Check existence first
    const existing = await this.repo.findByIdWithItems(id);
    if (!existing) {
      throwNotFound("Onboarding template not found", ERROR_CODES.ONBOARDING_TEMPLATE_NOT_FOUND, { id });
    }

    const updated = await this.repo.update(id, dto);
    if (!updated) {
      throwNotFound("Onboarding template not found", ERROR_CODES.ONBOARDING_TEMPLATE_NOT_FOUND, { id });
    }
    return updated;
  }
}
