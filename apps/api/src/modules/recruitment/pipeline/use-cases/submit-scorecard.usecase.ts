import { Injectable } from "@nestjs/common";
import { SubmitScorecardDto } from "../dto/submit-scorecard.dto";
import { CandidateMapper } from "../../candidates/mappers/candidate.mapper";
import { ApplicationsRepository } from "../../candidates/repositories/applications.repository";
import { throwConflict, throwNotFound } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { RequestContextService } from "../../../../shared/context/request-context.service";

@Injectable()
export class SubmitScorecardUseCase {
  constructor(
    private readonly applicationsRepo: ApplicationsRepository,
    private readonly requestContext: RequestContextService,
  ) {}

  async execute(id: string, dto: SubmitScorecardDto) {
    const existing = await this.applicationsRepo.findApplicationById(id);
    if (!existing) {
      throwNotFound(
        "Application not found",
        ERROR_CODES.RECRUITMENT_APPLICATION_NOT_FOUND,
        { id },
      );
    }
    if (existing.currentStage !== "interview") {
      throwConflict(
        "Scorecards can only be submitted while the application is in the interview stage",
        ERROR_CODES.RECRUITMENT_SCORECARD_STAGE_INVALID,
        { id, currentStage: existing.currentStage },
      );
    }

    const interviewerUserId = this.requestContext.get()?.userId ?? null;

    // One scorecard per (application, interviewer) is enforced by a unique
    // constraint. We create a new scorecard here; a repeat submission by the
    // same interviewer will surface as a unique-violation conflict. Upsert can
    // be layered later if editing an existing scorecard becomes a requirement.
    const created = await this.applicationsRepo.createScorecard({
      applicationId: id,
      interviewerUserId: interviewerUserId!,
      rating: dto.rating,
      ...(dto.feedback !== undefined ? { feedback: dto.feedback } : {}),
    });

    return CandidateMapper.toScorecardResponse(created!);
  }
}
