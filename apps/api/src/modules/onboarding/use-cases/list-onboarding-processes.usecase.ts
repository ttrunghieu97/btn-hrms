import { Injectable } from "@nestjs/common";
import { OnboardingProcessRepository } from "../repositories/onboarding-process.repository";

@Injectable()
export class ListOnboardingProcessesUseCase {
  constructor(
    private readonly processRepo: OnboardingProcessRepository,
  ) {}

  async execute(
    page = 1,
    limit = 20,
    filters?: { employeeId?: string; status?: string },
  ) {
    return filters
      ? this.processRepo.findByType("onboarding", page, limit, filters)
      : this.processRepo.findByType("onboarding", page, limit);
  }
}
