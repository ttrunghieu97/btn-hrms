import { Injectable } from "@nestjs/common";
import { CreateOfferDto } from "../dto/create-offer.dto";
import { OfferMapper } from "../mappers/offer.mapper";
import { OffersRepository } from "../repositories/offers.repository";
import { ApplicationsRepository } from "../../candidates/repositories/applications.repository";
import { throwConflict, throwNotFound } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { RequestContextService } from "../../../../shared/context/request-context.service";

@Injectable()
export class DraftOfferUseCase {
  constructor(
    private readonly offersRepo: OffersRepository,
    private readonly applicationsRepo: ApplicationsRepository,
    private readonly requestContext: RequestContextService,
  ) {}

  async execute(dto: CreateOfferDto) {
    const application = await this.applicationsRepo.findApplicationById(
      dto.applicationId,
    );
    if (!application) {
      throwNotFound(
        "Application not found",
        ERROR_CODES.RECRUITMENT_APPLICATION_NOT_FOUND,
        { applicationId: dto.applicationId },
      );
    }
    if (application.currentStage !== "offer") {
      throwConflict(
        "An offer can only be drafted while the application is in the offer stage",
        ERROR_CODES.RECRUITMENT_INVALID_STAGE,
        { applicationId: dto.applicationId, currentStage: application.currentStage },
      );
    }

    const actorUserId = this.requestContext.get()?.userId ?? null;
    const created = await this.offersRepo.create({
      applicationId: dto.applicationId,
      compensation: dto.compensation,
      startDate: dto.startDate,
      ...(dto.expiresAt !== undefined ? { expiresAt: dto.expiresAt } : {}),
      status: "draft",
      createdBy: actorUserId,
      updatedBy: actorUserId,
    });

    return OfferMapper.toResponse(created!);
  }
}
