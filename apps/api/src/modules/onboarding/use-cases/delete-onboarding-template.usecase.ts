import { Injectable } from "@nestjs/common";
import { OnboardingTemplateRepository } from "../repositories/onboarding-template.repository";
import { throwNotFound } from "../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../shared/constants/error-codes";

@Injectable()
export class DeleteOnboardingTemplateUseCase {
  constructor(
    private readonly repo: OnboardingTemplateRepository,
  ) {}

  async execute(id: string): Promise<void> {
    const deleted = await this.repo.softDelete(id);
    if (!deleted) {
      throwNotFound("Onboarding template not found", ERROR_CODES.ONBOARDING_TEMPLATE_NOT_FOUND, { id });
    }
  }
}
