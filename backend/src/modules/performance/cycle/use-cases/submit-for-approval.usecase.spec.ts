import { Test } from "@nestjs/testing";
import { SubmitForApprovalUseCase } from "./submit-for-approval.usecase";
import { PerformanceCycleRepository } from "../repositories/performance-cycle.repository";
import { EventOutboxService } from "../../../../core/events/event-outbox.service";
describe(SubmitForApprovalUseCase.name, () => {
  let useCase: SubmitForApprovalUseCase;
  let repo: { findById: jest.Mock; update: jest.Mock };
  let outbox: { stage: jest.Mock };
  beforeAll(async () => {
    repo = { findById: jest.fn(), update: jest.fn() };
    outbox = { stage: jest.fn() };
    const m = await Test.createTestingModule({
      providers: [SubmitForApprovalUseCase,
        { provide: PerformanceCycleRepository, useValue: repo },
        { provide: EventOutboxService, useValue: outbox }],
    }).compile();
    useCase = m.get(SubmitForApprovalUseCase);
  });
  it("transitions calibration → ready_for_approval", async () => {
    repo.findById.mockResolvedValue({ id: "c1", status: "calibration" });
    await useCase.execute("c1", "user-1");
    expect(repo.update).toHaveBeenCalledWith("c1", { status: "ready_for_approval" });
  });
  it("rejects transition from draft", async () => {
    repo.findById.mockResolvedValue({ id: "c1", status: "draft" });
    await expect(useCase.execute("c1", "user-1")).rejects.toThrow();
  });
});