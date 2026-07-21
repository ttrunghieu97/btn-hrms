import { Injectable } from "@nestjs/common";
import { SessionRepository } from "../repositories/session.repository";
import { SessionResponseDto } from "../../dto/learning.dto";
@Injectable()
export class ListSessionsUseCase {
  constructor(private readonly repo: SessionRepository) {}
  async execute(courseId: string): Promise<SessionResponseDto[]> {
    const rows = await this.repo.findByCourse(courseId);
    return rows.map((r) => ({ id: r.id, courseId: r.courseId, title: r.title, status: r.status, scheduledAt: r.scheduledAt, durationMinutes: r.durationMinutes }));
  }
}