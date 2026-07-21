import { Module } from "@nestjs/common";
import { CandidatesModule } from "../candidates/candidates.module";
import { OffersController } from "./offers.controller";
import { OffersRepository } from "./repositories/offers.repository";
import { DraftOfferUseCase } from "./use-cases/draft-offer.usecase";
import { SubmitOfferUseCase } from "./use-cases/submit-offer.usecase";
import { DecideOfferUseCase } from "./use-cases/decide-offer.usecase";
import { GetOfferUseCase } from "./use-cases/get-offer.usecase";
import { ListApplicationOffersUseCase } from "./use-cases/list-application-offers.usecase";

@Module({
  // CandidatesModule exports ApplicationsRepository (shared applications repo).
  imports: [CandidatesModule],
  controllers: [OffersController],
  providers: [
    OffersRepository,
    DraftOfferUseCase,
    SubmitOfferUseCase,
    DecideOfferUseCase,
    GetOfferUseCase,
    ListApplicationOffersUseCase,
  ],
  exports: [OffersRepository],
})
export class OffersModule {}
