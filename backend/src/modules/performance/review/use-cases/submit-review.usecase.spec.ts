import { Test } from "@nestjs/testing";
import { SubmitReviewUseCase } from "./submit-review.usecase";
import { ReviewAssignmentRepository } from "../repositories/review-assignment.repository";
import { EventOutboxService } from "../../../../core/events/event-outbox.service";

describe(SubmitReviewUseCase.name, () => {
  it("submits a review with ratings", async () => {
    const repo = {
      findById: jest.fn().mockResolvedValue({ id: "r1", cycleId: "c1", employeeId: "emp-1", reviewerId: "mgr-1", status: "pending", reviewType: "manager" }),
      insertRating: jest.fn(),
      update: jest.fn(),
    } as any;
    const outbox = { stage: jest.fn().mockResolvedValue({ id: "out-1" }) } as any;
    const m = await Test.createTestingModule({
      providers: [SubmitReviewUseCase, { provide: ReviewAssignmentRepository, useValue: repo }, { provide: EventOutboxService, useValue: outbox }],
    }).compile();
    await m.get(SubmitReviewUseCase).execute("r1", "mgr-1", { ratings: [{ competencyId: "comp-1", score: 4 }], overallComment: "Good" });
    expect(repo.update).toHaveBeenCalledWith("r1", expect.objectContaining({ status: "submitted" }));
    expect(outbox.stage).toHaveBeenCalledWith(expect.objectContaining({ eventType: "performance.review.submitted.v1" }));
  });
  it("rejects submit by wrong reviewer", async () => {
    const repo = { findById: jest.fn().mockResolvedValue({ id: "r1", reviewerId: "mgr-1" }) } as any;
    const m = await Test.createTestingModule({
      providers: [SubmitReviewUseCase, { provide: ReviewAssignmentRepository, useValue: repo }, { provide: EventOutboxService, useValue: {} }],
    }).compile();
    await expect(m.get(SubmitReviewUseCase).execute("r1", "other", {} as any)).rejects.toThrow("Only assigned reviewer can submit");
  });
  it("rejects already submitted review", async () => {
    const repo = { findById: jest.fn().mockResolvedValue({ id: "r1", reviewerId: "mgr-1", status: "submitted" }) } as any;
    const m = await Test.createTestingModule({
      providers: [SubmitReviewUseCase, { provide: ReviewAssignmentRepository, useValue: repo }, { provide: EventOutboxService, useValue: {} }],
    }).compile();
    await expect(m.get(SubmitReviewUseCase).execute("r1", "mgr-1", {} as any)).rejects.toThrow("Review already submitted");
  });
});
