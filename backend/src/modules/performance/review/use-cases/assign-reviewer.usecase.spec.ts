import { Test } from "@nestjs/testing";
import { AssignReviewerUseCase } from "./assign-reviewer.usecase";
import { ReviewAssignmentRepository } from "../repositories/review-assignment.repository";
import { PerformanceCycleRepository } from "../../cycle/repositories/performance-cycle.repository";

describe(AssignReviewerUseCase.name, () => {
  it("assigns a reviewer", async () => {
    const cycleRepo = { findById: jest.fn().mockResolvedValue({ id: "c1", status: "self_review" }) } as any;
    const reviewRepo = { insert: jest.fn() } as any;
    const m = await Test.createTestingModule({
      providers: [AssignReviewerUseCase, { provide: ReviewAssignmentRepository, useValue: reviewRepo }, { provide: PerformanceCycleRepository, useValue: cycleRepo }],
    }).compile();
    await m.get(AssignReviewerUseCase).execute({ cycleId: "c1", employeeId: "emp-1", reviewerId: "mgr-1", reviewType: "manager" } as any);
    expect(reviewRepo.insert).toHaveBeenCalled();
  });
  it("rejects self-review with manager type", async () => {
    const cycleRepo = { findById: jest.fn().mockResolvedValue({ id: "c1", status: "self_review" }) } as any;
    const m = await Test.createTestingModule({
      providers: [AssignReviewerUseCase, { provide: ReviewAssignmentRepository, useValue: {} }, { provide: PerformanceCycleRepository, useValue: cycleRepo }],
    }).compile();
    await expect(m.get(AssignReviewerUseCase).execute({ cycleId: "c1", employeeId: "emp-1", reviewerId: "emp-1", reviewType: "manager" } as any)).rejects.toThrow("Employee cannot review themselves");
  });
});
