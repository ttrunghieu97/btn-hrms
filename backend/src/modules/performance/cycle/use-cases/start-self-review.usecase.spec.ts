import { Test } from "@nestjs/testing";
import { StartSelfReviewUseCase } from "./start-self-review.usecase";
import { PerformanceCycleRepository } from "../repositories/performance-cycle.repository";
import { EventOutboxService } from "../../../../core/events/event-outbox.service";

describe(StartSelfReviewUseCase.name, () => {
  it("transitions from planning to self_review", async () => {
    const repo = { findById: jest.fn().mockResolvedValue({ id: "c1", status: "planning" }), update: jest.fn() } as any;
    const m = await Test.createTestingModule({ providers: [StartSelfReviewUseCase, { provide: PerformanceCycleRepository, useValue: repo }, { provide: EventOutboxService, useValue: {} }] }).compile();
    await m.get(StartSelfReviewUseCase).execute("c1", "user-1");
    expect(repo.update).toHaveBeenCalledWith("c1", { status: "self_review" });
  });
  it("rejects transition from wrong status", async () => {
    const repo = { findById: jest.fn().mockResolvedValue({ id: "c1", status: "draft" }) } as any;
    const m2 = await Test.createTestingModule({ providers: [StartSelfReviewUseCase, { provide: PerformanceCycleRepository, useValue: repo }, { provide: EventOutboxService, useValue: {} }] }).compile();
    await expect(m2.get(StartSelfReviewUseCase).execute("c1", "user-1")).rejects.toThrow('Cycle must be in "planning" status');
  });
});
