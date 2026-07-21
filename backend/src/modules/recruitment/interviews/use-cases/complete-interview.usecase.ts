import { Injectable } from "@nestjs/common";
import { InterviewRepository } from "../repositories/interview.repository";
import { CompleteInterviewDto } from "../dto/interview.dto";
import { throwBadRequest, throwNotFound } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";

@Injectable()
export class CompleteInterviewUseCase {
  constructor(private readonly interviewRepo: InterviewRepository) {}

  async execute(id: string, dto: CompleteInterviewDto): Promise<void> {
    const interview = await this.interviewRepo.findById(id);
    if (!interview) throwNotFound("Interview not found", ERROR_CODES.NOT_FOUND);
    if (interview.status !== "scheduled" && interview.status !== "rescheduled") throwBadRequest("Interview must be scheduled to complete", ERROR_CODES.INVALID_REQUEST);
    await this.interviewRepo.update(id, { status: "completed", notes: dto.notes ?? interview.notes });
  }
}
