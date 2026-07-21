import { Injectable, Inject } from "@nestjs/common";
import { BOARDING_PROCESS_READER_PORT, type IBoardingProcessReader } from "../../../contracts/ports/boarding-process-reader.port";
import { OffboardingRepository } from "../repositories/offboarding.repository";
import { throwNotFound, throwBadRequest } from "../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../shared/constants/error-codes";

@Injectable()
export class CompleteChecklistItemUseCase {
  constructor(
    @Inject(BOARDING_PROCESS_READER_PORT)
    private readonly processReader: IBoardingProcessReader,
    private readonly offboardingRepo: OffboardingRepository,
  ) {}

  async execute(
    processId: string,
    checklistItemId: string,
    userId: string,
    skip = false,
  ): Promise<{ id: string; status: string }> {
    const process = await this.processReader.findByIdWithItems(processId);
    if (process?.type !== "offboarding") {
      throwNotFound(
        "Offboarding process not found",
        ERROR_CODES.OFFBOARDING_PROCESS_NOT_FOUND,
        { processId },
      );
    }

    const item = process.checklistItems.find((i) => i.id === checklistItemId);
    if (!item) {
      throwNotFound(
        "Checklist item not found",
        "CHECKLIST_ITEM_NOT_FOUND",
        { checklistItemId },
      );
    }

    if (skip && item.mandatory) {
      throwBadRequest(
        "Cannot skip a mandatory checklist item",
        "MANDATORY_CHECKLIST_ITEM_SKIP_REJECTED",
        { checklistItemId },
      );
    }

    const newStatus = skip ? "skipped" : "completed";
    await this.offboardingRepo.updateChecklistItemStatus(
      checklistItemId,
      newStatus,
      skip ? undefined : userId,
    );

    // If process is pending and this is first completion, advance to in_progress
    if (process.status === "pending") {
      await this.offboardingRepo.updateProcessStatus(processId, "in_progress");
    }

    return { id: checklistItemId, status: newStatus };
  }
}
