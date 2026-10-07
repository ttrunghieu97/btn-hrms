import { Test } from "@nestjs/testing";
import { ReimburseClaimUseCase } from "./reimburse-claim.usecase";
import { ExpenseClaimRepository } from "../repositories/expense-claim.repository";
import { EventOutboxService } from "../../../../core/events/event-outbox.service";
describe(ReimburseClaimUseCase.name, () => {
  let useCase: ReimburseClaimUseCase;
  let repo: { findById: jest.Mock; update: jest.Mock };
  let outbox: { stage: jest.Mock };
  beforeAll(async () => {
    repo = { findById: jest.fn(), update: jest.fn() };
    outbox = { stage: jest.fn() };
    const m = await Test.createTestingModule({
      providers: [ReimburseClaimUseCase,
        { provide: ExpenseClaimRepository, useValue: repo },
        { provide: EventOutboxService, useValue: outbox }],
    }).compile();
    useCase = m.get(ReimburseClaimUseCase);
  });
  it("reimburses approved claim and emits event", async () => {
    repo.findById.mockResolvedValue({ id: "c1", employeeId: "emp-1", status: "approved", totalAmount: "150.00" });
    await useCase.execute("c1");
    expect(repo.update).toHaveBeenCalledWith("c1", expect.objectContaining({ status: "reimbursed" }));
    expect(outbox.stage).toHaveBeenCalledWith(expect.objectContaining({ eventType: "expenses.claim.reimbursed.v1" }));
  });
  it("rejects reimburse of non-approved claim", async () => {
    repo.findById.mockResolvedValue({ id: "c1", status: "draft" });
    await expect(useCase.execute("c1")).rejects.toThrow();
  });
});