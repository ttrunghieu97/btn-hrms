import { Test } from "@nestjs/testing";
import { ApproveCycleUseCase } from "./approve-cycle.usecase";
import { PerformanceCycleRepository } from "../repositories/performance-cycle.repository";
import { EventOutboxService } from "../../../../core/events/event-outbox.service";
describe(ApproveCycleUseCase.name, () => {
  let useCase: ApproveCycleUseCase;
  let repo: { findById: jest.Mock; update: jest.Mock };
  beforeAll(async () => {
    repo = { findById: jest.fn(), update: jest.fn() };
    const m = await Test.createTestingModule({
      providers: [ApproveCycleUseCase,
        { provide: PerformanceCycleRepository, useValue: repo },
        { provide: EventOutboxService, useValue: { stage: jest.fn() } }],
    }).compile();
    useCase = m.get(ApproveCycleUseCase);
  });
  it("transitions ready_for_approval → approved", async () => {
    repo.findById.mockResolvedValue({ id: "c1", status: "ready_for_approval" });
    await useCase.execute("c1", "user-1");
    expect(repo.update).toHaveBeenCalledWith("c1", { status: "approved" });
  });
  it("rejects transition from draft", async () => {
    repo.findById.mockResolvedValue({ id: "c1", status: "draft" });
    await expect(useCase.execute("c1", "user-1")).rejects.toThrow();
  });
});