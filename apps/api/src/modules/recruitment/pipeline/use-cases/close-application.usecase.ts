import { Injectable } from "@nestjs/common";
import { CandidateMapper } from "../../candidates/mappers/candidate.mapper";
import { ApplicationsRepository } from "../../candidates/repositories/applications.repository";
import {
  isActiveStage,
  type ApplicationStage,
} from "../domain/stage-transitions";
import { throwConflict, throwNotFound } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { RequestContextService } from "../../../../shared/context/request-context.service";

type CloseStage = Extract<ApplicationStage, "rejected" | "withdrawn">;

/**
 * Shared logic for the two "exit from any active stage" transitions:
 * reject and withdraw. Kept as one internal helper so both public use-cases
 * (RejectApplicationUseCase / WithdrawApplicationUseCase) stay consistent.
 */
@Injectable()
export class CloseApplicationUseCase {
  constructor(
    private readonly applicationsRepo: ApplicationsRepository,
    private readonly requestContext: RequestContextService,
  ) {}

  async execute(id: string, toStage: CloseStage, note?: string) {
    const existing = await this.applicationsRepo.findApplicationById(id);
    if (!existing) {
      throwNotFound(
        "Application not found",
        ERROR_CODES.RECRUITMENT_APPLICATION_NOT_FOUND,
        { id },
      );
    }

    const fromStage = existing.currentStage;
    if (!isActiveStage(fromStage)) {
      throwConflict(
        "Application is already in a terminal stage",
        ERROR_CODES.RECRUITMENT_INVALID_STAGE_TRANSITION,
        { id, fromStage, toStage },
      );
    }

    const actorUserId = this.requestContext.get()?.userId ?? null;
    const updated = await this.applicationsRepo.transaction(async (tx) => {
      const row = await this.applicationsRepo.updateApplicationStage(
        id,
        toStage,
        tx,
      );
      await this.applicationsRepo.appendStageEvent(
        {
          applicationId: id,
          fromStage,
          toStage,
          actorUserId,
          ...(note !== undefined ? { note } : {}),
        },
        tx,
      );
      return row;
    });

    return CandidateMapper.toApplicationResponse(updated!);
  }
}
