import { Test } from "@nestjs/testing";
import { OpenPlanningUseCase } from "./open-planning.usecase";
import { PerformanceCycleRepository } from "../repositories/performance-cycle.repository";
import { EventOutboxService } from "../../../../core/events/event-outbox.service";

describe(OpenPlanningUseCase.name, () => {
  let useCase: OpenPlanningUseCase;
  let repo: { findById: jest.Mock; update: jest.Mock };
  let outbox: { stage: jest.Mock };

  beforeAll(async () => {
    repo = { findById: jest.fn(), update: jest.fn() };
    outbox = { stage: jest.fn() };
    const m = await Test.createTestingModule({
      providers: [OpenPlanningUseCase,
        { provide: PerformanceCycleRepository, useValue: repo },
        { provide: EventOutboxService, useValue: outbox }],
    }).compile();
    useCase = m.get(OpenPlanningUseCase);
  });

  it("transitions draft → planning and emits event", async () => {
    repo.findById.mockResolvedValue({ id: "c1", status: "draft" });
    await useCase.execute("c1", "user-1");
    expect(repo.update).toHaveBeenCalledWith("c1", { status: "planning" });
    expect(outbox.stage).toHaveBeenCalledWith(expect.objectContaining({ eventType: "performance.cycle.opened.v1" }));
  });
  it("rejects transition from non-draft status", async () => {
    repo.findById.mockResolvedValue({ id: "c1", status: "closed" });
    await expect(useCase.execute("c1", "user-1")).rejects.toThrow();
  });
  it("rejects unknown cycle", async () => {
    repo.findById.mockResolvedValue(null);
    await expect(useCase.execute("c1", "user-1")).rejects.toThrow();
  });
});