import { Injectable } from "@nestjs/common";
import { OfferMapper } from "../mappers/offer.mapper";
import { OffersRepository } from "../repositories/offers.repository";
import { throwNotFound } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";

@Injectable()
export class GetOfferUseCase {
  constructor(private readonly offersRepo: OffersRepository) {}

  async execute(id: string) {
    const row = await this.offersRepo.findById(id);
    if (!row) {
      throwNotFound("Offer not found", ERROR_CODES.RECRUITMENT_OFFER_NOT_FOUND, {
        id,
      });
    }
    return OfferMapper.toResponse(row);
  }
}
