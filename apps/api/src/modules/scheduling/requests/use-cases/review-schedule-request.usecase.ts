import { Injectable } from "@nestjs/common";
import { ScheduleRequestsRepository } from "../repositories/schedule-requests.repository";
import type { ScheduleRequestRecord, RequestStatus } from "../repositories/schedule-requests.repository.contract";
import { throwNotFound, throwBadRequest } from "../../../../shared/utils/http-error";
import { EventOutboxService } from "../../../../core/events/event-outbox.service";
import { ScheduleRequestApprovedEvent } from "../../../../core/events/events/schedule-request-approved.event";
import { ScheduleRequestDeniedEvent } from "../../../../core/events/events/schedule-request-denied.event";
import { ScheduleRequestAuthorizationService } from "../services/schedule-request-authorization.service";
import type { AuthUser } from "../../../../core/security/types/auth-user.interface";

@Injectable()
export class ReviewScheduleRequestUseCase {
  constructor(
    private readonly repo: ScheduleRequestsRepository,
    private readonly eventOutbox: EventOutboxService,
    private readonly authService: ScheduleRequestAuthorizationService
  ) {}

  async execute(
    id: string,
    action: RequestStatus,
    actor: AuthUser
  ): Promise<ScheduleRequestRecord> {
    const request = await this.repo.findById(id);
    if (!request) {
      throwNotFound(`Schedule request ${id} not found`, "REQUEST_NOT_FOUND");
    }

    await this.authService.canReview(actor, request);

    if (request.status !== "PENDING") {
      throwBadRequest(
        `Request ${id} is already ${request.status}`,
        "REQUEST_ALREADY_REVIEWED"
      );
    }

    return this.repo.transaction(async (tx) => {
      const updated = await this.repo.updateStatus(id, action, actor.id, tx);
      if (!updated) {
        throwNotFound(`Schedule request ${id} not found after update`, "REQUEST_NOT_FOUND");
      }

      if (action === "APPROVED") {
        await this.eventOutbox.stage(
          new ScheduleRequestApprovedEvent({
            requestId: updated.id,
            employeeId: updated.employeeId,
            reviewerId: actor.id,
            reviewedAt: updated.reviewedAt ?? new Date(),
          }),
          tx
        );
      } else if (action === "DENIED") {
        await this.eventOutbox.stage(
          new ScheduleRequestDeniedEvent({
            requestId: updated.id,
            employeeId: updated.employeeId,
            reviewerId: actor.id,
            reviewedAt: updated.reviewedAt ?? new Date(),
          }),
          tx
        );
      }

      return updated;
    });
  }
}

