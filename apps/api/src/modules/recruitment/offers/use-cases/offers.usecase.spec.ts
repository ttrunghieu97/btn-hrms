import { Test, type TestingModule } from "@nestjs/testing";
import { DraftOfferUseCase } from "./draft-offer.usecase";
import { SubmitOfferUseCase } from "./submit-offer.usecase";
import { DecideOfferUseCase } from "./decide-offer.usecase";
import { OffersRepository } from "../repositories/offers.repository";
import { ApplicationsRepository } from "../../candidates/repositories/applications.repository";
import { EventOutboxService } from "../../../../core/events/event-outbox.service";
import { RequestContextService } from "../../../../shared/context/request-context.service";

describe("Offer use-cases", () => {
  let offersRepo: jest.Mocked<OffersRepository>;
  let applicationsRepo: jest.Mocked<ApplicationsRepository>;
  let eventOutbox: jest.Mocked<EventOutboxService>;
  let draft: DraftOfferUseCase;
  let submit: SubmitOfferUseCase;
  let decide: DecideOfferUseCase;

  beforeEach(async () => {
    offersRepo = {
      findById: jest.fn(),
      create: jest.fn(),
      updateStatus: jest.fn(),
      listByApplication: jest.fn(),
      transaction: jest.fn().mockImplementation(async (fn) => fn({})),
    } as any;
    applicationsRepo = {
      findApplicationById: jest.fn(),
      updateApplicationStage: jest.fn(),
      appendStageEvent: jest.fn(),
    } as any;
    eventOutbox = { stage: jest.fn().mockResolvedValue(undefined) } as any;
    const requestContext = {
      get: jest.fn().mockReturnValue({ userId: "user-1" }),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DraftOfferUseCase,
        SubmitOfferUseCase,
        DecideOfferUseCase,
        { provide: OffersRepository, useValue: offersRepo },
        { provide: ApplicationsRepository, useValue: applicationsRepo },
        { provide: EventOutboxService, useValue: eventOutbox },
        { provide: RequestContextService, useValue: requestContext },
      ],
    }).compile();

    draft = module.get(DraftOfferUseCase);
    submit = module.get(SubmitOfferUseCase);
    decide = module.get(DecideOfferUseCase);
  });

  it("blocks drafting an offer outside the offer stage", async () => {
    applicationsRepo.findApplicationById.mockResolvedValue({
      id: "app-1",
      currentStage: "interview",
    } as any);
    await expect(
      draft.execute({
        applicationId: "app-1",
        compensation: "2000.00",
        startDate: "2026-08-01",
      } as any),
    ).rejects.toThrow();
    expect(offersRepo.create).not.toHaveBeenCalled();
  });

  it("drafts an offer when the application is in the offer stage", async () => {
    applicationsRepo.findApplicationById.mockResolvedValue({
      id: "app-1",
      currentStage: "offer",
    } as any);
    offersRepo.create.mockResolvedValue({ id: "offer-1", status: "draft" } as any);
    await draft.execute({
      applicationId: "app-1",
      compensation: "2000.00",
      startDate: "2026-08-01",
    });
    expect(offersRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ status: "draft", applicationId: "app-1" }),
    );
  });

  it("submits a draft offer and stages the approval event", async () => {
    offersRepo.findById.mockResolvedValue({
      id: "offer-1",
      status: "draft",
      applicationId: "app-1",
    } as any);
    offersRepo.updateStatus.mockResolvedValue({
      id: "offer-1",
      status: "pending_approval",
    } as any);
    await submit.execute("offer-1");
    expect(eventOutbox.stage).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "recruitment.offer.approval.requested.v1",
      }),
      expect.any(Object),
    );
  });

  it("blocks deciding a non-approved offer", async () => {
    offersRepo.findById.mockResolvedValue({
      id: "offer-1",
      status: "draft",
      applicationId: "app-1",
    } as any);
    await expect(
      decide.execute("offer-1", { decision: "accept" } as any),
    ).rejects.toThrow();
  });

  it("accepts an approved offer: hires application + stages hire event", async () => {
    offersRepo.findById.mockResolvedValue({
      id: "offer-1",
      status: "approved",
      applicationId: "app-1",
      startDate: "2026-08-01",
      compensation: "2000.00",
    } as any);
    applicationsRepo.findApplicationById.mockResolvedValue({
      id: "app-1",
      currentStage: "offer",
      postingId: "posting-1",
      candidate: { id: "cand-1", email: "a@b.com", fullName: "A B" },
    } as any);
    offersRepo.updateStatus.mockResolvedValue({
      id: "offer-1",
      status: "accepted",
    } as any);

    await decide.execute("offer-1", { decision: "accept" } as any);

    expect(offersRepo.updateStatus).toHaveBeenCalledWith(
      "offer-1",
      "accepted",
      expect.any(Object),
      expect.any(Date),
    );
    expect(applicationsRepo.updateApplicationStage).toHaveBeenCalledWith(
      "app-1",
      "hired",
      expect.any(Object),
    );
    expect(eventOutbox.stage).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: "recruitment.candidate.hired.v1" }),
      expect.any(Object),
    );
  });

  it("declines an approved offer: rejects application, no hire event", async () => {
    offersRepo.findById.mockResolvedValue({
      id: "offer-1",
      status: "approved",
      applicationId: "app-1",
      startDate: "2026-08-01",
      compensation: "2000.00",
    } as any);
    applicationsRepo.findApplicationById.mockResolvedValue({
      id: "app-1",
      currentStage: "offer",
      postingId: "posting-1",
      candidate: { id: "cand-1", email: "a@b.com", fullName: "A B" },
    } as any);
    offersRepo.updateStatus.mockResolvedValue({
      id: "offer-1",
      status: "declined",
    } as any);

    await decide.execute("offer-1", { decision: "decline" } as any);

    expect(applicationsRepo.updateApplicationStage).toHaveBeenCalledWith(
      "app-1",
      "rejected",
      expect.any(Object),
    );
    expect(eventOutbox.stage).not.toHaveBeenCalled();
  });
});
