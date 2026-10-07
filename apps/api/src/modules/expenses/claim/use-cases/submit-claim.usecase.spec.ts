import { Test } from "@nestjs/testing";
import { SubmitClaimUseCase } from "./submit-claim.usecase";
import { ExpenseClaimRepository } from "../repositories/expense-claim.repository";
import { EventOutboxService } from "../../../../core/events/event-outbox.service";
describe(SubmitClaimUseCase.name, () => {
  let useCase: SubmitClaimUseCase;
  let repo: { findById: jest.Mock; findItems: jest.Mock; update: jest.Mock };
  let outbox: { stage: jest.Mock };
  beforeAll(async () => {
    repo = { findById: jest.fn(), findItems: jest.fn(), update: jest.fn() };
    outbox = { stage: jest.fn() };
    const m = await Test.createTestingModule({
      providers: [SubmitClaimUseCase,
        { provide: ExpenseClaimRepository, useValue: repo },
        { provide: EventOutboxService, useValue: outbox }],
    }).compile();
    useCase = m.get(SubmitClaimUseCase);
  });
  it("submits draft claim with items and emits event", async () => {
    repo.findById.mockResolvedValue({ id: "c1", employeeId: "emp-1", status: "draft" });
    repo.findItems.mockResolvedValue([{ amount: "100" }, { amount: "50" }]);
    await useCase.execute("c1");
    expect(repo.update).toHaveBeenCalledWith("c1", expect.objectContaining({ status: "submitted", totalAmount: "150.00" }));
    expect(outbox.stage).toHaveBeenCalledWith(expect.objectContaining({ eventType: "expenses.claim.submitted.v1" }));
  });
  it("rejects submit with no items", async () => {
    repo.findById.mockResolvedValue({ id: "c1", employeeId: "emp-1", status: "draft" });
    repo.findItems.mockResolvedValue([]);
    await expect(useCase.execute("c1")).rejects.toThrow();
  });
  it("rejects submit of non-draft claim", async () => {
    repo.findById.mockResolvedValue({ id: "c1", status: "approved" });
    await expect(useCase.execute("c1")).rejects.toThrow();
  });
});