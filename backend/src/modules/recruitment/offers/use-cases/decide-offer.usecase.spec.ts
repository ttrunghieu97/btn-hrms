import { Test } from "@nestjs/testing";
import { DecideOfferUseCase } from "./decide-offer.usecase";
import { OffersRepository } from "../repositories/offers.repository";
import { ApplicationsRepository } from "../../candidates/repositories/applications.repository";
import { EventOutboxService } from "../../../../core/events/event-outbox.service";
import { RequestContextService } from "../../../../shared/context/request-context.service";

describe(DecideOfferUseCase.name, () => {
  let useCase: DecideOfferUseCase;
  let offersRepo: { findById: jest.Mock; transaction: jest.Mock; updateStatus: jest.Mock };
  let appsRepo: { findApplicationById: jest.Mock; updateApplicationStage: jest.Mock; appendStageEvent: jest.Mock };
  let outbox: { stage: jest.Mock };

  beforeAll(async () => {
    offersRepo = { findById: jest.fn(), transaction: jest.fn(), updateStatus: jest.fn() };
    appsRepo = { findApplicationById: jest.fn(), updateApplicationStage: jest.fn(), appendStageEvent: jest.fn() };
    outbox = { stage: jest.fn() };
    const mockCtx = { get: () => ({ userId: "user-1" }) };

    const m = await Test.createTestingModule({
      providers: [
        DecideOfferUseCase,
        { provide: OffersRepository, useValue: offersRepo },
        { provide: ApplicationsRepository, useValue: appsRepo },
        { provide: EventOutboxService, useValue: outbox },
        { provide: RequestContextService, useValue: mockCtx },
      ],
    }).compile();
    useCase = m.get(DecideOfferUseCase);
  });

  it("accepts offer and emits CandidateHiredEvent", async () => {
    offersRepo.findById.mockResolvedValue({ id: "o1", applicationId: "a1", status: "approved", startDate: "2026-08-01", compensation: "50000" });
    appsRepo.findApplicationById.mockResolvedValue({ id: "a1", currentStage: "offer", candidate: { id: "c1", fullName: "John", email: "john@test.com" }, postingId: "p1" });
    offersRepo.transaction.mockImplementation(async (fn: any) => fn({}));
    offersRepo.updateStatus.mockResolvedValue({ id: "o1", status: "accepted" });
    await useCase.execute("o1", { decision: "accept" });
    expect(outbox.stage).toHaveBeenCalled();
  });
});
