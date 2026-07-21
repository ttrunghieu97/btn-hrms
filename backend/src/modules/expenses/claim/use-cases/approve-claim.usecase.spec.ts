import { Test } from "@nestjs/testing";
import { ApproveClaimUseCase } from "./approve-claim.usecase";
import { ExpenseClaimRepository } from "../repositories/expense-claim.repository";
import { EventOutboxService } from "../../../../core/events/event-outbox.service";
describe(ApproveClaimUseCase.name, () => {
  let useCase: ApproveClaimUseCase;
  let repo: { findById: jest.Mock; update: jest.Mock };
  let outbox: { stage: jest.Mock };
  beforeAll(async () => {
    repo = { findById: jest.fn(), update: jest.fn() };
    outbox = { stage: jest.fn() };
    const m = await Test.createTestingModule({
      providers: [ApproveClaimUseCase,
        { provide: ExpenseClaimRepository, useValue: repo },
        { provide: EventOutboxService, useValue: outbox }],
    }).compile();
    useCase = m.get(ApproveClaimUseCase);
  });
  it("approves submitted claim and emits event", async () => {
    repo.findById.mockResolvedValue({ id: "c1", employeeId: "emp-1", status: "submitted" });
    await useCase.execute("c1", "user-1");
    expect(repo.update).toHaveBeenCalledWith("c1", expect.objectContaining({ status: "approved" }));
    expect(outbox.stage).toHaveBeenCalledWith(expect.objectContaining({ eventType: "expenses.claim.approved.v1" }));
  });
  it("rejects approve of draft claim", async () => {
    repo.findById.mockResolvedValue({ id: "c1", status: "draft" });
    await expect(useCase.execute("c1", "user-1")).rejects.toThrow();
  });
});