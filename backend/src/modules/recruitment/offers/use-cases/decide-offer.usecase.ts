import { Injectable } from "@nestjs/common";
import { DecideOfferDto } from "../dto/decide-offer.dto";
import { OfferMapper } from "../mappers/offer.mapper";
import { OffersRepository } from "../repositories/offers.repository";
import { ApplicationsRepository } from "../../candidates/repositories/applications.repository";
import { throwConflict, throwNotFound } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { EventOutboxService } from "../../../../core/events/event-outbox.service";
import { RequestContextService } from "../../../../shared/context/request-context.service";
import { CandidateHiredEvent } from "../../../../core/events/events/candidate-hired.event";

@Injectable()
export class DecideOfferUseCase {
  constructor(
    private readonly offersRepo: OffersRepository,
    private readonly applicationsRepo: ApplicationsRepository,
    private readonly eventOutbox: EventOutboxService,
    private readonly requestContext: RequestContextService,
  ) {}

  async execute(id: string, dto: DecideOfferDto) {
    const offer = await this.offersRepo.findById(id);
    if (!offer) {
      throwNotFound(
        "Offer not found",
        ERROR_CODES.RECRUITMENT_OFFER_NOT_FOUND,
        { id },
      );
    }
    if (offer.status !== "approved") {
      throwConflict(
        "Only approved offers can be accepted or declined",
        ERROR_CODES.RECRUITMENT_INVALID_STATUS,
        { id, status: offer.status },
      );
    }

    const application = await this.applicationsRepo.findApplicationById(
      offer.applicationId,
    );
    if (!application) {
      throwNotFound(
        "Application not found",
        ERROR_CODES.RECRUITMENT_APPLICATION_NOT_FOUND,
        { applicationId: offer.applicationId },
      );
    }

    const actorUserId = this.requestContext.get()?.userId ?? null;
    const decidedAt = new Date();

    if (dto.decision === "accept") {
      const updated = await this.offersRepo.transaction(async (tx) => {
        const row = await this.offersRepo.updateStatus(
          id,
          "accepted",
          tx,
          decidedAt,
        );
        await this.applicationsRepo.updateApplicationStage(
          application.id,
          "hired",
          tx,
        );
        await this.applicationsRepo.appendStageEvent(
          {
            applicationId: application.id,
            fromStage: application.currentStage,
            toStage: "hired",
            actorUserId,
            note: "Offer accepted",
          },
          tx,
        );
        await this.eventOutbox.stage(
          new CandidateHiredEvent({
            idempotencyKey: `${id}:recruitment.candidate.hired`,
            offerId: id,
            applicationId: application.id,
            candidateId: application.candidate.id,
            postingId: application.postingId,
            candidateEmail: application.candidate.email,
            candidateName: application.candidate.fullName,
            startDate: offer.startDate,
            compensation: offer.compensation,
            hiredAt: decidedAt.toISOString(),
          }),
          tx,
        );
        return row;
      });
      return OfferMapper.toResponse(updated!);
    }

    // decline
    const updated = await this.offersRepo.transaction(async (tx) => {
      const row = await this.offersRepo.updateStatus(
        id,
        "declined",
        tx,
        decidedAt,
      );
      await this.applicationsRepo.updateApplicationStage(
        application.id,
        "rejected",
        tx,
      );
      await this.applicationsRepo.appendStageEvent(
        {
          applicationId: application.id,
          fromStage: application.currentStage,
          toStage: "rejected",
          actorUserId,
          note: "Offer declined",
        },
        tx,
      );
      return row;
    });
    return OfferMapper.toResponse(updated!);
  }
}
