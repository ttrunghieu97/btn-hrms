import { Test } from "@nestjs/testing";
import { PublishPlanUseCase } from "./publish-plan.usecase";
import { BenefitPlanRepository } from "../repositories/benefit-plan.repository";
describe(PublishPlanUseCase.name, () => {
  let useCase: PublishPlanUseCase;
  let repo: { findById: jest.Mock; update: jest.Mock };
  beforeAll(async () => {
    repo = { findById: jest.fn(), update: jest.fn() };
    const m = await Test.createTestingModule({
      providers: [PublishPlanUseCase, { provide: BenefitPlanRepository, useValue: repo }],
    }).compile();
    useCase = m.get(PublishPlanUseCase);
  });
  it("publishes draft plan", async () => {
    repo.findById.mockResolvedValue({ id: "p1", status: "draft" });
    await useCase.execute("p1");
    expect(repo.update).toHaveBeenCalledWith("p1", { status: "published" });
  });
  it("rejects publish of already published plan", async () => {
    repo.findById.mockResolvedValue({ id: "p1", status: "published" });
    await expect(useCase.execute("p1")).rejects.toThrow();
  });
  it("rejects publish of closed plan", async () => {
    repo.findById.mockResolvedValue({ id: "p1", status: "closed" });
    await expect(useCase.execute("p1")).rejects.toThrow();
  });
});