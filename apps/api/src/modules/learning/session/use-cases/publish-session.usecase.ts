import { Injectable } from "@nestjs/common";
import { SessionRepository } from "../repositories/session.repository";
import { throwBadRequest, throwNotFound } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { EventOutboxService } from "../../../../core/events/event-outbox.service";
import { SessionScheduledEvent } from "../../../../core/events/events/session-scheduled.event";
@Injectable()
export class PublishSessionUseCase {
  constructor(private readonly repo: SessionRepository, private readonly eventOutbox: EventOutboxService) {}
  async execute(id: string): Promise<void> {
    const session = await this.repo.findById(id);
    if (!session) throwNotFound("Session not found", ERROR_CODES.NOT_FOUND);
    if (session.status !== "draft") throwBadRequest("Only draft sessions can be published", ERROR_CODES.INVALID_REQUEST);
    await this.repo.update(id, { status: "published" });
    await this.eventOutbox.stage(new SessionScheduledEvent({ sessionId: id, courseId: session.courseId, scheduledAt: session.scheduledAt.toISOString() }));
  }
}