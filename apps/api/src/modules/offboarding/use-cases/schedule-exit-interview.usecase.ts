import { Injectable, Inject } from "@nestjs/common";
import { BOARDING_PROCESS_READER_PORT, type IBoardingProcessReader } from "../../../contracts/ports/boarding-process-reader.port";
import { OffboardingRepository } from "../repositories/offboarding.repository";
import { throwNotFound } from "../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../shared/constants/error-codes";

export interface ScheduleExitInterviewInput {
  processId: string;
  employeeId: string;
  interviewerUserId: string;
  scheduledAt: string;
}

@Injectable()
export class ScheduleExitInterviewUseCase {
  constructor(
    @Inject(BOARDING_PROCESS_READER_PORT)
    private readonly processReader: IBoardingProcessReader,
    private readonly offboardingRepo: OffboardingRepository,
  ) {}

  async execute(input: ScheduleExitInterviewInput): Promise<{ id: string }> {
    const process = await this.processReader.findByIdWithItems(input.processId);
    if (process?.type !== "offboarding") {
      throwNotFound(
        "Offboarding process not found",
        ERROR_CODES.OFFBOARDING_PROCESS_NOT_FOUND,
        { processId: input.processId },
      );
    }

    // Check for existing unconducted interview
    const existing = await this.offboardingRepo.findScheduledExitInterview(input.processId);
    if (existing) {
      // Reschedule: update the existing record
      await this.offboardingRepo.updateExitInterview(
        existing.id,
        input.interviewerUserId,
        input.scheduledAt,
      );
      return { id: existing.id };
    }

    return this.offboardingRepo.createExitInterview(
      input.processId,
      input.employeeId,
      input.interviewerUserId,
      input.scheduledAt,
    );
  }
}
