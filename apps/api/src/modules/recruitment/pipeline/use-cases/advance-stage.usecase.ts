import { Injectable } from "@nestjs/common";
import { AdvanceStageDto } from "../dto/advance-stage.dto";
import { CandidateMapper } from "../../candidates/mappers/candidate.mapper";
import { ApplicationsRepository } from "../../candidates/repositories/applications.repository";
import { isAllowedTransition } from "../domain/stage-transitions";
import { throwConflict, throwNotFound } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { RequestContextService } from "../../../../shared/context/request-context.service";

@Injectable()
export class AdvanceStageUseCase {
  constructor(
    private readonly applicationsRepo: ApplicationsRepository,
    private readonly requestContext: RequestContextService,
  ) {}

  async execute(id: string, dto: AdvanceStageDto) {
    const existing = await this.applicationsRepo.findApplicationById(id);
    if (!existing) {
      throwNotFound(
        "Application not found",
        ERROR_CODES.RECRUITMENT_APPLICATION_NOT_FOUND,
        { id },
      );
    }

    const fromStage = existing.currentStage;
    const toStage = dto.toStage;

    // Local transition guard is the source of truth. The platform workflow
    // engine can be layered here later for richer governance.
    if (!isAllowedTransition(fromStage, toStage)) {
      throwConflict(
        "Stage transition is not allowed",
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
          ...(dto.note !== undefined ? { note: dto.note } : {}),
        },
        tx,
      );
      return row;
    });

    return CandidateMapper.toApplicationResponse(updated!);
  }
}
