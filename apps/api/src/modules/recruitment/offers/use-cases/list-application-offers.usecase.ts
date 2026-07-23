import { Injectable } from "@nestjs/common";
import { OfferMapper } from "../mappers/offer.mapper";
import { OffersRepository } from "../repositories/offers.repository";

@Injectable()
export class ListApplicationOffersUseCase {
  constructor(private readonly offersRepo: OffersRepository) {}

  async execute(applicationId: string) {
    const rows = await this.offersRepo.listByApplication(applicationId);
    return { rows: OfferMapper.toResponseList(rows) };
  }
}
