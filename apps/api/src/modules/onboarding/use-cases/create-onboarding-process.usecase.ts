import { Injectable } from "@nestjs/common";
import { CreateBoardingProcessUseCase } from "./create-boarding-process.usecase";
import type { CreateOnboardingProcessDto } from "../dto/create-onboarding-process.dto";
import type { CreateOnboardingProcessResponseDto } from "../dto/onboarding-process-response.dto";

/**
 * Thin wrapper for onboarding-typed process creation.
 * Delegates to the generalized CreateBoardingProcessUseCase with type="onboarding".
 */
@Injectable()
export class CreateOnboardingProcessUseCase {
  constructor(
    private readonly boardingUseCase: CreateBoardingProcessUseCase,
  ) {}

  async execute(
    dto: CreateOnboardingProcessDto,
  ): Promise<CreateOnboardingProcessResponseDto> {
    return this.boardingUseCase.execute({
      employeeId: dto.employeeId,
      templateId: dto.templateId,
      type: "onboarding",
      joinDate: dto.joinDate,
    });
  }
}
