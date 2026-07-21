import { Injectable, Inject } from "@nestjs/common";
import { BOARDING_PROCESS_READER_PORT, type IBoardingProcessReader } from "../../../contracts/ports/boarding-process-reader.port";
import { OffboardingRepository } from "../repositories/offboarding.repository";
import { throwNotFound } from "../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../shared/constants/error-codes";

export interface RecordExitInterviewInput {
  processId: string;
  responses?: Record<string, unknown>;
  notes?: string;
}

@Injectable()
export class RecordExitInterviewUseCase {
  constructor(
    @Inject(BOARDING_PROCESS_READER_PORT)
    private readonly processReader: IBoardingProcessReader,
    private readonly offboardingRepo: OffboardingRepository,
  ) {}

  async execute(input: RecordExitInterviewInput): Promise<{ id: string; conductedAt: string }> {
    const process = await this.processReader.findByIdWithItems(input.processId);
    if (process?.type !== "offboarding") {
      throwNotFound(
        "Offboarding process not found",
        ERROR_CODES.OFFBOARDING_PROCESS_NOT_FOUND,
        { processId: input.processId },
      );
    }

    const interview = await this.offboardingRepo.findExitInterviewByProcessId(input.processId);
    if (!interview) {
      throwNotFound(
        "No exit interview scheduled for this process",
        "EXIT_INTERVIEW_NOT_FOUND",
        { processId: input.processId },
      );
    }

    return this.offboardingRepo.recordExitInterview(
      interview.id,
      input.responses ?? null,
      input.notes ?? null,
    );
  }
}
