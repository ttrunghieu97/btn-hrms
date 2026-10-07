import { Test } from "@nestjs/testing";
import { ApproveEnrollmentUseCase } from "./approve-enrollment.usecase";
import { BenefitEnrollmentRepository } from "../repositories/benefit-enrollment.repository";
import { EventOutboxService } from "../../../../core/events/event-outbox.service";
describe(ApproveEnrollmentUseCase.name, () => {
  let useCase: ApproveEnrollmentUseCase;
  let repo: { findById: jest.Mock; update: jest.Mock };
  let outbox: { stage: jest.Mock };
  beforeAll(async () => {
    repo = { findById: jest.fn(), update: jest.fn() };
    outbox = { stage: jest.fn() };
    const m = await Test.createTestingModule({
      providers: [ApproveEnrollmentUseCase,
        { provide: BenefitEnrollmentRepository, useValue: repo },
        { provide: EventOutboxService, useValue: outbox }],
    }).compile();
    useCase = m.get(ApproveEnrollmentUseCase);
  });
  it("approves pending enrollment and emits event", async () => {
    repo.findById.mockResolvedValue({ id: "e1", planId: "p1", employeeId: "emp-1", status: "pending", employerContribution: "100", employeeContribution: "50", effectiveFrom: "2026-01-01" });
    await useCase.execute("e1", "user-1");
    expect(repo.update).toHaveBeenCalledWith("e1", expect.objectContaining({ status: "active" }));
    expect(outbox.stage).toHaveBeenCalledWith(expect.objectContaining({ eventType: "benefits.enrollment.approved.v1" }));
  });
  it("rejects approve of already active enrollment", async () => {
    repo.findById.mockResolvedValue({ id: "e1", status: "active" });
    await expect(useCase.execute("e1", "user-1")).rejects.toThrow();
  });
});