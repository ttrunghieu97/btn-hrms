import { Injectable, Inject } from "@nestjs/common";
import { BOARDING_PROCESS_READER_PORT, type IBoardingProcessReader } from "../../../contracts/ports/boarding-process-reader.port";
import { OffboardingRepository, type ClearanceDepartment, type ClearanceDecision } from "../repositories/offboarding.repository";
import { throwNotFound, throwConflict, throwBadRequest } from "../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../shared/constants/error-codes";

export interface DecideClearanceInput {
  processId: string;
  department: ClearanceDepartment;
  decision: ClearanceDecision;
  decidedByUserId: string;
  note?: string;
}

@Injectable()
export class DecideClearanceUseCase {
  constructor(
    @Inject(BOARDING_PROCESS_READER_PORT)
    private readonly processReader: IBoardingProcessReader,
    private readonly offboardingRepo: OffboardingRepository,
  ) {}

  async execute(input: DecideClearanceInput): Promise<{ id: string; decision: string }> {
    const process = await this.processReader.findByIdWithItems(input.processId);
    if (process?.type !== "offboarding") {
      throwNotFound(
        "Offboarding process not found",
        ERROR_CODES.OFFBOARDING_PROCESS_NOT_FOUND,
        { processId: input.processId },
      );
    }

    const clearance = await this.offboardingRepo.findClearanceByProcessAndDepartment(
      input.processId,
      input.department,
    );

    if (!clearance) {
      throwNotFound(
        "Clearance record not found for this department",
        ERROR_CODES.OFFBOARDING_CLEARANCE_NOT_FOUND,
        { processId: input.processId, department: input.department },
      );
    }

    if (clearance.decision !== "pending") {
      throwConflict(
        "Clearance already decided",
        ERROR_CODES.OFFBOARDING_CLEARANCE_ALREADY_DECIDED,
        { clearanceId: clearance.id, currentDecision: clearance.decision },
      );
    }

    if (input.decision === "rejected" && !input.note) {
      throwBadRequest(
        "Rejection requires a note",
        ERROR_CODES.OFFBOARDING_REJECT_REQUIRES_NOTE,
        { clearanceId: clearance.id },
      );
    }

    const updated = await this.offboardingRepo.decideClearance(
      clearance.id,
      input.decision,
      input.decidedByUserId,
      input.note,
    );

    if (!updated) {
      throw new Error("Clearance update returned no row");
    }
    return { id: updated.id, decision: updated.decision }
  }
}
