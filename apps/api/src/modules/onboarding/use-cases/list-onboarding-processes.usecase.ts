import { Injectable } from "@nestjs/common";
import { OnboardingProcessRepository } from "../repositories/onboarding-process.repository";

@Injectable()
export class ListOnboardingProcessesUseCase {
  constructor(
    private readonly processRepo: OnboardingProcessRepository,
  ) {}

  async execute(page = 1, limit = 20) {
    return this.processRepo.findByType("onboarding", page, limit);
  }
}
