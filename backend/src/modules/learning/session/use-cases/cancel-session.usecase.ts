import { Injectable } from "@nestjs/common";
import { SessionRepository } from "../repositories/session.repository";
import { throwBadRequest, throwNotFound } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { EventOutboxService } from "../../../../core/events/event-outbox.service";
import { SessionCancelledEvent } from "../../../../core/events/events/session-cancelled.event";
@Injectable()
export class CancelSessionUseCase {
  constructor(private readonly repo: SessionRepository, private readonly eventOutbox: EventOutboxService) {}
  async execute(id: string): Promise<void> {
    const session = await this.repo.findById(id);
    if (!session) throwNotFound("Session not found", ERROR_CODES.NOT_FOUND);
    if (session.status === "cancelled") throwBadRequest("Already cancelled", ERROR_CODES.INVALID_REQUEST);
    await this.repo.update(id, { status: "cancelled" });
    await this.eventOutbox.stage(new SessionCancelledEvent({ sessionId: id, courseId: session.courseId }));
  }
}