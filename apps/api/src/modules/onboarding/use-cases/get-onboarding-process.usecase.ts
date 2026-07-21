import { Injectable, NotFoundException } from "@nestjs/common";
import { OnboardingProcessRepository } from "../repositories/onboarding-process.repository";

@Injectable()
export class GetOnboardingProcessUseCase {
  constructor(
    private readonly processRepo: OnboardingProcessRepository,
  ) {}

  async execute(id: string) {
    const process = await this.processRepo.findByIdWithItems(id);
    if (!process) {
      throw new NotFoundException("Không tìm thấy quy trình onboarding");
    }
    return process;
  }
}
