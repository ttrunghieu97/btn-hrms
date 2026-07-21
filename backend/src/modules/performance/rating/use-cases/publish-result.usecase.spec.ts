import { Test } from "@nestjs/testing";
import { PublishResultUseCase } from "./publish-result.usecase";
import { PerformanceResultRepository } from "../repositories/performance-result.repository";
import { PerformanceCycleRepository } from "../../cycle/repositories/performance-cycle.repository";
import { EventOutboxService } from "../../../../core/events/event-outbox.service";
describe(PublishResultUseCase.name, () => {
  let useCase: PublishResultUseCase;
  let resultRepo: { upsert: jest.Mock };
  let cycleRepo: { findById: jest.Mock };
  let outbox: { stage: jest.Mock };
  beforeAll(async () => {
    resultRepo = { upsert: jest.fn().mockResolvedValue({ id: "r1", finalScore: "4.5", ratingLabel: "Exceeds", publishedAt: new Date() }) };
    cycleRepo = { findById: jest.fn() };
    outbox = { stage: jest.fn() };
    const m = await Test.createTestingModule({
      providers: [PublishResultUseCase,
        { provide: PerformanceResultRepository, useValue: resultRepo },
        { provide: PerformanceCycleRepository, useValue: cycleRepo },
        { provide: EventOutboxService, useValue: outbox }],
    }).compile();
    useCase = m.get(PublishResultUseCase);
  });
  it("publishes result for approved cycle", async () => {
    cycleRepo.findById.mockResolvedValue({ id: "c1", status: "approved" });
    await useCase.execute("c1", { employeeId: "emp-1", finalScore: 4.5, ratingLabel: "Exceeds" }, "user-1");
    expect(resultRepo.upsert).toHaveBeenCalled();
    expect(outbox.stage).toHaveBeenCalledWith(expect.objectContaining({ eventType: "performance.result.published.v1" }));
  });
  it("rejects publish for non-approved cycle", async () => {
    cycleRepo.findById.mockResolvedValue({ id: "c1", status: "draft" });
    await expect(useCase.execute("c1", { employeeId: "emp-1" }, "user-1")).rejects.toThrow();
  });
});