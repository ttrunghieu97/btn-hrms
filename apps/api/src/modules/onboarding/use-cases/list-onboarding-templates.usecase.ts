import { Injectable } from "@nestjs/common";
import { OnboardingTemplateRepository } from "../repositories/onboarding-template.repository";
import type { ListOnboardingTemplatesQueryDto } from "../dto/onboarding-template.dto";
import type { PaginatedTemplates } from "../repositories/onboarding-template.repository";

@Injectable()
export class ListOnboardingTemplatesUseCase {
  constructor(
    private readonly repo: OnboardingTemplateRepository,
  ) {}

  async execute(query: ListOnboardingTemplatesQueryDto): Promise<PaginatedTemplates> {
    return this.repo.findPaginated(query);
  }
}
