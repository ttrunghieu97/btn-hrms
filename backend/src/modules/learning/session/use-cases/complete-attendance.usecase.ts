import { Injectable } from "@nestjs/common";
import { SessionRepository } from "../repositories/session.repository";
import { throwBadRequest, throwNotFound } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { EventOutboxService } from "../../../../core/events/event-outbox.service";
import { LearningAttendanceMarkedEvent } from "../../../../core/events/events/learning-attendance-marked.event";
@Injectable()
export class MarkCompletedUseCase {
  constructor(private readonly repo: SessionRepository, private readonly eventOutbox: EventOutboxService) {}
  async execute(sessionId: string, employeeId: string): Promise<void> {
    const attendee = await this.repo.findAttendee(sessionId, employeeId);
    if (!attendee) throwNotFound("Not registered", ERROR_CODES.NOT_FOUND);
    const session = await this.repo.findById(sessionId);
    await this.repo.updateAttendee(attendee.id, { status: "completed", completedAt: new Date() });
    await this.eventOutbox.stage(new LearningAttendanceMarkedEvent({ sessionId, courseId: session!.courseId, employeeId, status: "completed" }));
  }
}