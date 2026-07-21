import { Test } from "@nestjs/testing";
import { SubmitScorecardUseCase } from "./submit-scorecard.usecase";
import { InterviewRepository } from "../repositories/interview.repository";
describe(SubmitScorecardUseCase.name, () => {
  let useCase: SubmitScorecardUseCase;
  let repo: { findById: jest.Mock; insertScorecard: jest.Mock };
  beforeAll(async () => {
    repo = { findById: jest.fn(), insertScorecard: jest.fn() };
    const m = await Test.createTestingModule({
      providers: [SubmitScorecardUseCase,
        { provide: InterviewRepository, useValue: repo }],
    }).compile();
    useCase = m.get(SubmitScorecardUseCase);
  });
  it("submits scorecard for completed interview", async () => {
    repo.findById.mockResolvedValue({ id: "i1", status: "completed", applicationId: "a1" });
    await useCase.execute("i1", "user-1", { rating: 4, feedback: "Strong candidate", rubric: [{ category: "Technical", score: 5 }] });
    expect(repo.insertScorecard).toHaveBeenCalled();
  });
  it("rejects scorecard for interview not completed", async () => {
    repo.findById.mockResolvedValue({ id: "i1", status: "scheduled" });
    await expect(useCase.execute("i1", "user-1", { rating: 4 })).rejects.toThrow();
  });
});