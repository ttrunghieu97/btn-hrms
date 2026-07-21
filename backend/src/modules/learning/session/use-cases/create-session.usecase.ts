import { Injectable } from "@nestjs/common";
import { SessionRepository } from "../repositories/session.repository";
import { CourseRepository } from "../../course/repositories/course.repository";
import { CreateSessionDto, SessionResponseDto } from "../../dto/learning.dto";
import { throwBadRequest, throwNotFound } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
@Injectable()
export class CreateSessionUseCase {
  constructor(private readonly sessionRepo: SessionRepository, private readonly courseRepo: CourseRepository) {}
  async execute(dto: CreateSessionDto): Promise<SessionResponseDto> {
    if (!dto.title?.trim()) throwBadRequest("Title is required", ERROR_CODES.INVALID_REQUEST);
    const course = await this.courseRepo.findCourseById(dto.courseId);
    if (!course) throwNotFound("Course not found", ERROR_CODES.NOT_FOUND);
    const r = await this.sessionRepo.insert({ courseId: dto.courseId, title: dto.title, status: "draft", scheduledAt: new Date(dto.scheduledAt), durationMinutes: dto.durationMinutes ?? 60, location: dto.location ?? null, meetingUrl: dto.meetingUrl ?? null, maxAttendees: dto.maxAttendees ?? null });
    return { id: r.id, courseId: r.courseId, title: r.title, status: r.status, scheduledAt: r.scheduledAt, durationMinutes: r.durationMinutes };
  }
}