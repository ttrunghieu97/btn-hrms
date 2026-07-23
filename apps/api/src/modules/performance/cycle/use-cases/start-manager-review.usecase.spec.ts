import { Test } from "@nestjs/testing";
import { StartManagerReviewUseCase } from "./start-manager-review.usecase";
import { PerformanceCycleRepository } from "../repositories/performance-cycle.repository";
import { EventOutboxService } from "../../../../core/events/event-outbox.service";

describe(StartManagerReviewUseCase.name, () => {
  it("transitions from self_review to manager_review", async () => {
    const repo = { findById: jest.fn().mockResolvedValue({ id: "c1", status: "self_review" }), update: jest.fn() } as any;
    const m = await Test.createTestingModule({ providers: [StartManagerReviewUseCase, { provide: PerformanceCycleRepository, useValue: repo }, { provide: EventOutboxService, useValue: {} }] }).compile();
    await m.get(StartManagerReviewUseCase).execute("c1", "user-1");
    expect(repo.update).toHaveBeenCalledWith("c1", { status: "manager_review" });
  });
  it("rejects transition from wrong status", async () => {
    const repo = { findById: jest.fn().mockResolvedValue({ id: "c1", status: "planning" }) } as any;
    const m2 = await Test.createTestingModule({ providers: [StartManagerReviewUseCase, { provide: PerformanceCycleRepository, useValue: repo }, { provide: EventOutboxService, useValue: {} }] }).compile();
    await expect(m2.get(StartManagerReviewUseCase).execute("c1", "user-1")).rejects.toThrow('Cycle must be in "self_review" status');
  });
});
