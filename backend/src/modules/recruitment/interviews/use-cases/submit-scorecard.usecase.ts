import { Injectable } from "@nestjs/common";
import { InterviewRepository } from "../repositories/interview.repository";
import { SubmitScorecardDto } from "../dto/interview.dto";
import { throwBadRequest, throwNotFound } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";

@Injectable()
export class SubmitScorecardUseCase {
  constructor(private readonly interviewRepo: InterviewRepository) {}

  async execute(interviewId: string, interviewerUserId: string, dto: SubmitScorecardDto): Promise<void> {
    const interview = await this.interviewRepo.findById(interviewId);
    if (!interview) throwNotFound("Interview not found", ERROR_CODES.NOT_FOUND);
    if (interview.status !== "completed") throwBadRequest("Interview must be completed before scoring", ERROR_CODES.INVALID_REQUEST);
    await this.interviewRepo.insertScorecard(interview.applicationId, interviewerUserId, dto);
  }
}
