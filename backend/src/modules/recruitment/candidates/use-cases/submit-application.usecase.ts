import { Injectable } from "@nestjs/common";
import { SubmitApplicationDto } from "../dto/submit-application.dto";
import { CandidateMapper } from "../mappers/candidate.mapper";
import { ApplicationsRepository } from "../repositories/applications.repository";
import { AttachCvUseCase } from "./attach-cv.usecase";
import { throwConflict, throwNotFound } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { RequestContextService } from "../../../../shared/context/request-context.service";

@Injectable()
export class SubmitApplicationUseCase {
  constructor(
    private readonly applicationsRepo: ApplicationsRepository,
    private readonly attachCv: AttachCvUseCase,
    private readonly requestContext: RequestContextService,
  ) {}

  async execute(dto: SubmitApplicationDto) {
    const posting = await this.applicationsRepo.findPostingById(dto.postingId);
    if (!posting) {
      throwNotFound(
        "Job posting not found",
        ERROR_CODES.RECRUITMENT_POSTING_NOT_FOUND,
        { postingId: dto.postingId },
      );
    }
    if (posting.status !== "open") {
      throwConflict(
        "Job posting is not open for applications",
        ERROR_CODES.RECRUITMENT_POSTING_NOT_OPEN,
        { postingId: dto.postingId, status: posting.status },
      );
    }

    // Email is already normalized by the DTO transform; normalize again
    // defensively for internal callers that bypass validation.
    const email = dto.email.trim().toLowerCase();
    const actorUserId = this.requestContext.get()?.userId ?? null;

    const created = await this.applicationsRepo.transaction(async (tx) => {
      // Find-or-create the candidate profile by normalized email so a repeat
      // applicant re-uses their existing profile (no duplicate candidates).
      let candidate = await this.applicationsRepo.findCandidateByEmail(
        email,
        tx,
      );
      if (!candidate) {
        candidate = await this.applicationsRepo.createCandidate(
          {
            email,
            fullName: dto.fullName,
            ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
          },
          tx,
        );
      }

      const activeApplication =
        await this.applicationsRepo.findActiveApplication(
          candidate!.id,
          dto.postingId,
          tx,
        );
      if (activeApplication) {
        throwConflict(
          "Candidate already has an active application for this posting",
          ERROR_CODES.RECRUITMENT_APPLICATION_DUPLICATE,
          { candidateId: candidate!.id, postingId: dto.postingId },
        );
      }

      const application = await this.applicationsRepo.createApplication(
        {
          candidateId: candidate!.id,
          postingId: dto.postingId,
          currentStage: "applied",
        },
        tx,
      );

      await this.applicationsRepo.appendStageEvent(
        {
          applicationId: application!.id,
          fromStage: null,
          toStage: "applied",
          actorUserId,
        },
        tx,
      );

      return { application: application!, candidate: candidate! };
    });

    // CV attach happens AFTER the transaction commits so finalizeUpload only
    // promotes the temp file once the application row is durable.
    if (dto.cvFileToken) {
      await this.attachCv.execute(created.application.id, dto.cvFileToken);
    }

    return {
      id: created.application.id,
      candidate: CandidateMapper.toCandidateResponse(created.candidate),
      application: CandidateMapper.toApplicationResponse(created.application),
    };
  }
}
