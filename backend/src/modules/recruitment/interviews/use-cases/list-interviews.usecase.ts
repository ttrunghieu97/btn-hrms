import { Injectable } from "@nestjs/common";
import { InterviewRepository } from "../repositories/interview.repository";
import { InterviewResponseDto } from "../dto/interview.dto";

@Injectable()
export class ListInterviewsUseCase {
  constructor(private readonly repo: InterviewRepository) {}
  async execute(applicationId: string): Promise<InterviewResponseDto[]> {
    const rows = await this.repo.findByApplication(applicationId);
    return rows.map((r) => ({ id: r.id, applicationId: r.applicationId, title: r.title, interviewType: r.interviewType, status: r.status, scheduledAt: r.scheduledAt, durationMinutes: r.durationMinutes }));
  }
}
