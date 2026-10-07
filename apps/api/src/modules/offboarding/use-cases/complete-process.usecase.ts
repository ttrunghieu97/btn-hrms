import { Injectable, Inject } from "@nestjs/common";
import { BOARDING_PROCESS_READER_PORT, type IBoardingProcessReader } from "../../../contracts/ports/boarding-process-reader.port";
import { OffboardingRepository } from "../repositories/offboarding.repository";
import { EventOutboxService } from "../../../core/events/event-outbox.service";
import { throwNotFound, throwBadRequest } from "../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../shared/constants/error-codes";

@Injectable()
export class CompleteProcessUseCase {
  constructor(
    @Inject(BOARDING_PROCESS_READER_PORT)
    private readonly processReader: IBoardingProcessReader,
    private readonly offboardingRepo: OffboardingRepository,
    private readonly outbox: EventOutboxService,
  ) {}

  async execute(
    processId: string,
  ): Promise<{ id: string; status: string; outstandingClearances: string[] }> {
    const process = await this.processReader.findByIdWithItems(processId);
    if (process?.type !== "offboarding") {
      throwNotFound(
        "Offboarding process not found",
        ERROR_CODES.OFFBOARDING_PROCESS_NOT_FOUND,
        { processId },
      );
    }

    // Check completion gate: all clearances approved
    const outstanding = await this.offboardingRepo.getOutstandingClearances(processId);
    if (outstanding.length > 0) {
      throwBadRequest(
        "Process cannot complete: outstanding clearances",
        ERROR_CODES.OFFBOARDING_COMPLETION_BLOCKED,
        {
          processId,
          outstandingClearances: outstanding.map((c) => c.department),
        },
      );
    }

    // Check all mandatory checklist items are done
    const mandatoryIncomplete = process.checklistItems.filter(
      (ci) => ci.mandatory && ci.status !== "completed",
    );
    if (mandatoryIncomplete.length > 0) {
      throwBadRequest(
        "Process cannot complete: mandatory checklist items incomplete",
        ERROR_CODES.OFFBOARDING_COMPLETION_BLOCKED,
        {
          processId,
          incompleteItems: mandatoryIncomplete.map((i) => i.id),
        },
      );
    }

    // Complete process + create settlement link + stage event (all in one tx)
    await this.offboardingRepo.completeProcessWithSettlement(
      processId,
      process.employeeId,
      this.outbox,
    );

    return {
      id: processId,
      status: "completed",
      outstandingClearances: [],
    };
  }
}
