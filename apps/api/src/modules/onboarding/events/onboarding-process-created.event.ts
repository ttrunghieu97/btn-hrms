import type { CreateOnboardingProcessResponseDto } from "../dto/onboarding-process-response.dto";

export const ONBOARDING_PROCESS_CREATED_EVENT =
  "onboarding.process.created.v1";

export class OnboardingProcessCreatedEvent {
  readonly eventType = ONBOARDING_PROCESS_CREATED_EVENT;
  readonly eventVersion = 1;
  readonly producerContext = "onboarding";

  constructor(
    public readonly processId: string,
    public readonly employeeId: string,
    public readonly templateId: string | null,
    public readonly payload: CreateOnboardingProcessResponseDto,
  ) {}
}
