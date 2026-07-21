import { Injectable } from "@nestjs/common";
import { OfferMapper } from "../mappers/offer.mapper";
import { OffersRepository } from "../repositories/offers.repository";
import { throwConflict, throwNotFound } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { EventOutboxService } from "../../../../core/events/event-outbox.service";
import { RequestContextService } from "../../../../shared/context/request-context.service";
import { OfferApprovalRequestedEvent } from "../../../../core/events/events/offer-approval-requested.event";

@Injectable()
export class SubmitOfferUseCase {
  constructor(
    private readonly offersRepo: OffersRepository,
    private readonly eventOutbox: EventOutboxService,
    private readonly requestContext: RequestContextService,
  ) {}

  async execute(id: string) {
    const existing = await this.offersRepo.findById(id);
    if (!existing) {
      throwNotFound(
        "Offer not found",
        ERROR_CODES.RECRUITMENT_OFFER_NOT_FOUND,
        { id },
      );
    }
    if (existing.status !== "draft") {
      throwConflict(
        "Only draft offers can be submitted for approval",
        ERROR_CODES.RECRUITMENT_INVALID_STATUS,
        { id, status: existing.status },
      );
    }

    const actorUserId = this.requestContext.get()?.userId ?? null;
    const updated = await this.offersRepo.transaction(async (tx) => {
      const row = await this.offersRepo.updateStatus(
        id,
        "pending_approval",
        tx,
      );
      await this.eventOutbox.stage(
        new OfferApprovalRequestedEvent({
          idempotencyKey: `${id}:recruitment.offer.approval.requested`,
          offerId: id,
          applicationId: existing.applicationId,
          requestedByUserId: actorUserId,
          requestedAt: new Date().toISOString(),
        }),
        tx,
      );
      return row;
    });

    return OfferMapper.toResponse(updated!);
  }
}
