import { Test } from "@nestjs/testing";
import { ListReviewsUseCase } from "./list-reviews.usecase";
import { ReviewAssignmentRepository } from "../repositories/review-assignment.repository";

describe(ListReviewsUseCase.name, () => {
  it("returns review counts by cycle", async () => {
    const repo = { countByCycle: jest.fn().mockResolvedValue({ total: 8, submitted: 5 }) } as any;
    const m = await Test.createTestingModule({
      providers: [ListReviewsUseCase, { provide: ReviewAssignmentRepository, useValue: repo }],
    }).compile();
    const r = await m.get(ListReviewsUseCase).execute("c1");
    expect(r.total).toBe(8);
  });
});
