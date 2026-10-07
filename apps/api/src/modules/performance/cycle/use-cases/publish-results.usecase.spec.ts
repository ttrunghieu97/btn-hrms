import { Test } from "@nestjs/testing";
import { PublishResultsUseCase } from "./publish-results.usecase";
import { PerformanceCycleRepository } from "../repositories/performance-cycle.repository";
import { EventOutboxService } from "../../../../core/events/event-outbox.service";

describe(PublishResultsUseCase.name, () => {
  it("transitions from approved to published", async () => {
    const repo = { findById: jest.fn().mockResolvedValue({ id: "c1", status: "approved" }), update: jest.fn() } as any;
    const m = await Test.createTestingModule({ providers: [PublishResultsUseCase, { provide: PerformanceCycleRepository, useValue: repo }, { provide: EventOutboxService, useValue: {} }] }).compile();
    await m.get(PublishResultsUseCase).execute("c1", "user-1");
    expect(repo.update).toHaveBeenCalledWith("c1", { status: "published" });
  });
});
