import { Injectable } from "@nestjs/common";
import { InterviewRepository } from "../repositories/interview.repository";
import { ApplicationsRepository } from "../../candidates/repositories/applications.repository";
import { ScheduleInterviewDto, InterviewResponseDto } from "../dto/interview.dto";
import { throwBadRequest, throwNotFound } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";

@Injectable()
export class ScheduleInterviewUseCase {
  constructor(
    private readonly interviewRepo: InterviewRepository,
    private readonly applicationsRepo: ApplicationsRepository,
  ) {}

  async execute(dto: ScheduleInterviewDto, userId: string): Promise<InterviewResponseDto> {
    const app = await this.applicationsRepo.findApplicationById(dto.applicationId);
    if (!app) throwNotFound("Application not found", ERROR_CODES.NOT_FOUND);
    if (!dto.title?.trim()) throwBadRequest("Interview title is required", ERROR_CODES.INVALID_REQUEST);
    if (!dto.scheduledAt) throwBadRequest("Scheduled time is required", ERROR_CODES.INVALID_REQUEST);

    const row = await this.interviewRepo.insert({
      applicationId: dto.applicationId, title: dto.title,
      interviewType: dto.interviewType, status: "scheduled",
      scheduledAt: new Date(dto.scheduledAt),
      durationMinutes: dto.durationMinutes ?? 60,
      location: dto.location ?? null, meetingLink: dto.meetingLink ?? null,
      notes: dto.notes ?? null, createdByUserId: userId,
    });
    return { id: row.id, applicationId: row.applicationId, title: row.title, interviewType: row.interviewType, status: row.status, scheduledAt: row.scheduledAt, durationMinutes: row.durationMinutes };
  }
}
