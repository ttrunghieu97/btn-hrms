import { Test } from "@nestjs/testing";
import { CreateRequisitionUseCase } from "../requisitions/use-cases/create-requisition.usecase";
import { SubmitRequisitionUseCase } from "../requisitions/use-cases/submit-requisition.usecase";
import { PublishPostingUseCase } from "../postings/use-cases/publish-posting.usecase";
import { SubmitApplicationUseCase } from "../candidates/use-cases/submit-application.usecase";
import { AttachCvUseCase } from "../candidates/use-cases/attach-cv.usecase";
import { AdvanceStageUseCase } from "../pipeline/use-cases/advance-stage.usecase";
import { DraftOfferUseCase } from "../offers/use-cases/draft-offer.usecase";
import { SubmitOfferUseCase } from "../offers/use-cases/submit-offer.usecase";
import { DecideOfferUseCase } from "../offers/use-cases/decide-offer.usecase";
import { RequisitionsRepository } from "../requisitions/repositories/requisitions.repository";
import { PostingsRepository } from "../postings/repositories/postings.repository";
import { ApplicationsRepository } from "../candidates/repositories/applications.repository";
import { OffersRepository } from "../offers/repositories/offers.repository";
import { EventOutboxService } from "../../../core/events/event-outbox.service";
import { RequestContextService } from "../../../shared/context/request-context.service";
import { RequisitionApprovalRequestedEvent } from "../../../core/events/events/requisition-approval-requested.event";
import { OfferApprovalRequestedEvent } from "../../../core/events/events/offer-approval-requested.event";
import { CandidateHiredEvent } from "../../../core/events/events/candidate-hired.event";

describe("Recruit-to-Hire Integration Acceptance (Journey 1)", () => {
  let createRequisition: CreateRequisitionUseCase;
  let submitRequisition: SubmitRequisitionUseCase;
  let publishPosting: PublishPostingUseCase;
  let submitApplication: SubmitApplicationUseCase;
  let advanceStage: AdvanceStageUseCase;
  let draftOffer: DraftOfferUseCase;
  let submitOffer: SubmitOfferUseCase;
  let decideOffer: DecideOfferUseCase;

  let requisitionsStore: Map<string, any>;
  let postingsStore: Map<string, any>;
  let candidatesStore: Map<string, any>;
  let applicationsStore: Map<string, any>;
  let stageEventsStore: any[];
  let offersStore: Map<string, any>;
  let stagedEvents: any[];

  beforeEach(async () => {
    requisitionsStore = new Map();
    postingsStore = new Map();
    candidatesStore = new Map();
    applicationsStore = new Map();
    stageEventsStore = [];
    offersStore = new Map();
    stagedEvents = [];

    const now = new Date("2026-04-15T10:00:00.000Z");

    const mockRequisitionsRepo = {
      create: jest.fn(async (data: any) => {
        const id = `req-${requisitionsStore.size + 1}`;
        const row = {
          id,
          positionId: null,
          budgetMin: null,
          budgetMax: null,
          justification: null,
          createdAt: now,
          updatedAt: now,
          ...data,
        };
        requisitionsStore.set(id, row);
        return row;
      }),
      findById: jest.fn(async (id: string) => requisitionsStore.get(id) ?? null),
      updateStatus: jest.fn(async (id: string, status: string) => {
        const existing = requisitionsStore.get(id);
        if (!existing) return null;
        const updated = { ...existing, status, updatedAt: new Date() };
        requisitionsStore.set(id, updated);
        return updated;
      }),
      transaction: jest.fn(async (fn: any) => fn({})),
    };

    const mockPostingsRepo = {
      findRequisitionById: jest.fn(async (id: string) => requisitionsStore.get(id) ?? null),
      create: jest.fn(async (data: any) => {
        const id = `post-${postingsStore.size + 1}`;
        const row = {
          id,
          description: null,
          requirements: null,
          openedAt: now,
          closesAt: null,
          createdAt: now,
          updatedAt: now,
          ...data,
        };
        postingsStore.set(id, row);
        return row;
      }),
    };

    const mockApplicationsRepo = {
      findPostingById: jest.fn(async (id: string) => postingsStore.get(id) ?? null),
      findCandidateByEmail: jest.fn(async (email: string) =>
        Array.from(candidatesStore.values()).find((c) => c.email === email) ?? null,
      ),
      createCandidate: jest.fn(async (data: any) => {
        const id = `cand-${candidatesStore.size + 1}`;
        const row = { id, phone: null, createdAt: now, updatedAt: now, ...data };
        candidatesStore.set(id, row);
        return row;
      }),
      findActiveApplication: jest.fn(async (candidateId: string, postingId: string) =>
        Array.from(applicationsStore.values()).find(
          (a) =>
            a.candidateId === candidateId &&
            a.postingId === postingId &&
            !["rejected", "withdrawn"].includes(a.currentStage),
        ) ?? null,
      ),
      createApplication: jest.fn(async (data: any) => {
        const id = `app-${applicationsStore.size + 1}`;
        const candidate = candidatesStore.get(data.candidateId);
        const row = {
          id,
          cvFileId: null,
          createdAt: now,
          updatedAt: now,
          ...data,
          candidate,
          stageEvents: [],
          scorecards: [],
        };
        applicationsStore.set(id, row);
        return row;
      }),
      findApplicationById: jest.fn(async (id: string) => applicationsStore.get(id) ?? null),
      updateApplicationStage: jest.fn(async (id: string, toStage: string) => {
        const existing = applicationsStore.get(id);
        if (!existing) return null;
        const updated = { ...existing, currentStage: toStage, updatedAt: new Date() };
        applicationsStore.set(id, updated);
        return updated;
      }),
      appendStageEvent: jest.fn(async (event: any) => {
        const row = {
          id: `evt-${stageEventsStore.length + 1}`,
          note: null,
          createdAt: new Date(),
          ...event,
        };
        stageEventsStore.push(row);
        const app = applicationsStore.get(event.applicationId);
        if (app) {
          app.stageEvents = [...(app.stageEvents ?? []), row];
        }
        return row;
      }),
      transaction: jest.fn(async (fn: any) => fn({})),
    };

    const mockOffersRepo = {
      create: jest.fn(async (data: any) => {
        const id = `offer-${offersStore.size + 1}`;
        const row = {
          id,
          expiresAt: null,
          decidedAt: null,
          createdAt: now,
          updatedAt: now,
          ...data,
        };
        offersStore.set(id, row);
        return row;
      }),
      findById: jest.fn(async (id: string) => offersStore.get(id) ?? null),
      updateStatus: jest.fn(async (id: string, status: string, _tx?: any, decidedAt?: Date) => {
        const existing = offersStore.get(id);
        if (!existing) return null;
        const updated = {
          ...existing,
          status,
          ...(decidedAt ? { decidedAt } : {}),
          updatedAt: new Date(),
        };
        offersStore.set(id, updated);
        return updated;
      }),
      transaction: jest.fn(async (fn: any) => fn({})),
    };

    const mockOutbox = {
      stage: jest.fn(async (event: any) => {
        stagedEvents.push(event);
      }),
    };

    const mockCtx = {
      get: () => ({ userId: "recruiter-1" }),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        CreateRequisitionUseCase,
        SubmitRequisitionUseCase,
        PublishPostingUseCase,
        SubmitApplicationUseCase,
        { provide: AttachCvUseCase, useValue: { execute: jest.fn() } },
        AdvanceStageUseCase,
        DraftOfferUseCase,
        SubmitOfferUseCase,
        DecideOfferUseCase,
        { provide: RequisitionsRepository, useValue: mockRequisitionsRepo },
        { provide: PostingsRepository, useValue: mockPostingsRepo },
        { provide: ApplicationsRepository, useValue: mockApplicationsRepo },
        { provide: OffersRepository, useValue: mockOffersRepo },
        { provide: EventOutboxService, useValue: mockOutbox },
        { provide: RequestContextService, useValue: mockCtx },
      ],
    }).compile();

    createRequisition = moduleRef.get(CreateRequisitionUseCase);
    submitRequisition = moduleRef.get(SubmitRequisitionUseCase);
    publishPosting = moduleRef.get(PublishPostingUseCase);
    submitApplication = moduleRef.get(SubmitApplicationUseCase);
    advanceStage = moduleRef.get(AdvanceStageUseCase);
    draftOffer = moduleRef.get(DraftOfferUseCase);
    submitOffer = moduleRef.get(SubmitOfferUseCase);
    decideOffer = moduleRef.get(DecideOfferUseCase);
  });

  it("requisition created → submitted → approved → posting published", async () => {
    const req = await createRequisition.execute({
      departmentId: "dept-eng",
      title: "Senior Backend Engineer",
      headcount: 2,
      budgetMin: "35000000",
      budgetMax: "55000000",
    });
    expect(req.status).toBe("draft");

    // Publishing a posting before requisition is approved must fail
    await expect(
      publishPosting.execute({
        requisitionId: req.id,
        title: "Senior Backend Engineer (Node.js)",
      }),
    ).rejects.toThrow("Requisition must be approved before publishing a posting");

    // Submit requisition for approval
    const submitted = await submitRequisition.execute(req.id);
    expect(submitted.status).toBe("pending_approval");
    expect(stagedEvents[0]).toBeInstanceOf(RequisitionApprovalRequestedEvent);

    // Simulate approval of requisition
    requisitionsStore.get(req.id).status = "approved";

    const posting = await publishPosting.execute({
      requisitionId: req.id,
      title: "Senior Backend Engineer (Node.js)",
      description: "Build core HRMS services",
    });
    expect(posting.status).toBe("open");
  });

  it("application received → pipeline advances to interview → offer → accepted → CandidateHiredEvent staged", async () => {
    // Prepare approved requisition & open posting
    const req = await createRequisition.execute({
      departmentId: "dept-eng",
      title: "Product Designer",
      headcount: 1,
    });
    requisitionsStore.get(req.id).status = "approved";
    const posting = await publishPosting.execute({
      requisitionId: req.id,
      title: "Product Designer",
    });

    // Submit candidate application
    const submission = await submitApplication.execute({
      postingId: posting.id,
      fullName: "Nguyen Minh Anh",
      email: "Minh.Anh@example.com",
      phone: "0901234567",
    });
    expect(submission.application.currentStage).toBe("applied");
    expect(submission.candidate.email).toBe("minh.anh@example.com");

    // Duplicate application on same posting must be rejected
    await expect(
      submitApplication.execute({
        postingId: posting.id,
        fullName: "Nguyen Minh Anh",
        email: "minh.anh@example.com",
      }),
    ).rejects.toThrow("Candidate already has an active application for this posting");

    // Drafting an offer before reaching 'offer' stage must fail
    await expect(
      draftOffer.execute({
        applicationId: submission.id,
        compensation: "42000000",
        startDate: "2026-06-01",
      }),
    ).rejects.toThrow("An offer can only be drafted while the application is in the offer stage");

    // Invalid stage skip (applied -> hired) must fail
    await expect(
      advanceStage.execute(submission.id, { toStage: "hired" as any }),
    ).rejects.toThrow("Stage transition is not allowed");

    // Advance applied -> screening -> interview -> offer
    const s1 = await advanceStage.execute(submission.id, { toStage: "screening" });
    expect(s1.currentStage).toBe("screening");
    const s2 = await advanceStage.execute(submission.id, { toStage: "interview" });
    expect(s2.currentStage).toBe("interview");
    const s3 = await advanceStage.execute(submission.id, { toStage: "offer" });
    expect(s3.currentStage).toBe("offer");

    // Draft offer
    const offer = await draftOffer.execute({
      applicationId: submission.id,
      compensation: "42000000",
      startDate: "2026-06-01",
    });
    expect(offer.status).toBe("draft");

    // Accepting an unapproved offer must fail
    await expect(
      decideOffer.execute(offer.id, { decision: "accept" }),
    ).rejects.toThrow("Only approved offers can be accepted or declined");

    // Submit offer for approval
    const pendingOffer = await submitOffer.execute(offer.id);
    expect(pendingOffer.status).toBe("pending_approval");
    expect(stagedEvents.some((e) => e instanceof OfferApprovalRequestedEvent)).toBe(true);

    // Approve offer and accept
    offersStore.get(offer.id).status = "approved";
    const acceptedOffer = await decideOffer.execute(offer.id, { decision: "accept" });
    expect(acceptedOffer.status).toBe("accepted");
    expect(applicationsStore.get(submission.id).currentStage).toBe("hired");

    const hiredEvent = stagedEvents.find((e) => e instanceof CandidateHiredEvent);
    expect(hiredEvent).toBeDefined();
    expect(hiredEvent!.data).toMatchObject({
      offerId: offer.id,
      applicationId: submission.id,
      candidateEmail: "minh.anh@example.com",
      candidateName: "Nguyen Minh Anh",
      startDate: "2026-06-01",
      compensation: "42000000",
    });
  });
});
