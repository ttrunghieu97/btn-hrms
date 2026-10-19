import { Test } from "@nestjs/testing";
import { CreateGoalUseCase } from "../goal/use-cases/create-goal.usecase";
import { SubmitGoalUseCase } from "../goal/use-cases/submit-goal.usecase";
import { ApproveGoalUseCase } from "../goal/use-cases/approve-goal.usecase";
import { SubmitReviewUseCase } from "../review/use-cases/submit-review.usecase";
import { PublishResultUseCase } from "../rating/use-cases/publish-result.usecase";
import { PerformanceCycleRepository } from "../cycle/repositories/performance-cycle.repository";
import { EmployeeGoalRepository } from "../goal/repositories/employee-goal.repository";
import { ReviewAssignmentRepository } from "../review/repositories/review-assignment.repository";
import { PerformanceResultRepository } from "../rating/repositories/performance-result.repository";
import { EventOutboxService } from "../../../core/events/event-outbox.service";
import { GoalSubmittedEvent } from "../../../core/events/events/goal-submitted.event";
import { GoalApprovedEvent } from "../../../core/events/events/goal-approved.event";
import { ReviewSubmittedEvent } from "../../../core/events/events/review-submitted.event";
import { PerformanceResultPublishedEvent } from "../../../core/events/events/performance-result-published.event";

describe("Performance Cycle Integration (e2e)", () => {
  let createGoal: CreateGoalUseCase;
  let submitGoal: SubmitGoalUseCase;
  let approveGoal: ApproveGoalUseCase;
  let submitReview: SubmitReviewUseCase;
  let publishResult: PublishResultUseCase;

  let cyclesStore: Map<string, any>;
  let goalsStore: Map<string, any>;
  let goalAssignmentsStore: Map<string, any[]>;
  let reviewsStore: Map<string, any>;
  let resultsStore: Map<string, any>;
  let stagedEvents: any[];

  beforeEach(async () => {
    cyclesStore = new Map();
    goalsStore = new Map();
    goalAssignmentsStore = new Map();
    reviewsStore = new Map();
    resultsStore = new Map();
    stagedEvents = [];

    cyclesStore.set("cycle-2026-h1", {
      id: "cycle-2026-h1",
      name: "H1 2026 Performance Review",
      status: "planning",
    });

    reviewsStore.set("rev-1", {
      id: "rev-1",
      cycleId: "cycle-2026-h1",
      employeeId: "emp-101",
      reviewerId: "emp-manager-1",
      reviewType: "manager",
      status: "pending",
    });

    const mockCycleRepo = {
      findById: jest.fn(async (id: string) => cyclesStore.get(id) ?? null),
    };

    const mockGoalRepo = {
      insertGoal: jest.fn(async (data: any) => {
        const id = `goal-${goalsStore.size + 1}`;
        const row = { id, ...data };
        goalsStore.set(id, row);
        goalAssignmentsStore.set(id, []);
        return row;
      }),
      insertAssignment: jest.fn(async (data: any) => {
        const list = goalAssignmentsStore.get(data.goalId) ?? [];
        list.push(data);
        goalAssignmentsStore.set(data.goalId, list);
      }),
      findGoalById: jest.fn(async (id: string) => goalsStore.get(id) ?? null),
      findAssignmentsByGoal: jest.fn(async (goalId: string) => goalAssignmentsStore.get(goalId) ?? []),
      updateGoal: jest.fn(async (id: string, patch: any) => {
        const existing = goalsStore.get(id);
        if (!existing) return null;
        const updated = { ...existing, ...patch };
        goalsStore.set(id, updated);
        return updated;
      }),
    };

    const mockReviewRepo = {
      findById: jest.fn(async (id: string) => reviewsStore.get(id) ?? null),
      insertRating: jest.fn(async () => undefined),
      update: jest.fn(async (id: string, patch: any) => {
        const existing = reviewsStore.get(id);
        if (!existing) return null;
        const updated = { ...existing, ...patch };
        reviewsStore.set(id, updated);
        return updated;
      }),
    };

    const mockResultRepo = {
      upsert: jest.fn(async (data: any) => {
        const key = `${data.cycleId}:${data.employeeId}`;
        resultsStore.set(key, data);
        return data;
      }),
    };

    const mockOutbox = {
      stage: jest.fn(async (event: any) => {
        stagedEvents.push(event);
      }),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        CreateGoalUseCase,
        SubmitGoalUseCase,
        ApproveGoalUseCase,
        SubmitReviewUseCase,
        PublishResultUseCase,
        { provide: PerformanceCycleRepository, useValue: mockCycleRepo },
        { provide: EmployeeGoalRepository, useValue: mockGoalRepo },
        { provide: ReviewAssignmentRepository, useValue: mockReviewRepo },
        { provide: PerformanceResultRepository, useValue: mockResultRepo },
        { provide: EventOutboxService, useValue: mockOutbox },
      ],
    }).compile();

    createGoal = moduleRef.get(CreateGoalUseCase);
    submitGoal = moduleRef.get(SubmitGoalUseCase);
    approveGoal = moduleRef.get(ApproveGoalUseCase);
    submitReview = moduleRef.get(SubmitReviewUseCase);
    publishResult = moduleRef.get(PublishResultUseCase);
  });

  it("goal created → submitted → approved → review completed → result published", async () => {
    const goal = await createGoal.execute("cycle-2026-h1", {
      title: "Deliver HRMS Contract-First Integration",
      employeeIds: ["emp-101"],
    });
    expect(goal.status).toBe("draft");

    // Unassigned employee cannot submit goal
    await expect(submitGoal.execute(goal.id, "emp-other")).rejects.toThrow(
      "Employee not assigned to this goal",
    );

    await submitGoal.execute(goal.id, "emp-101");
    expect(goalsStore.get(goal.id).status).toBe("submitted");
    expect(stagedEvents[0]).toBeInstanceOf(GoalSubmittedEvent);

    await approveGoal.execute(goal.id, "user-manager-1");
    expect(goalsStore.get(goal.id).status).toBe("approved");
    expect(stagedEvents[1]).toBeInstanceOf(GoalApprovedEvent);

    // Wrong reviewer cannot submit review
    await expect(
      submitReview.execute("rev-1", "emp-wrong-reviewer", {
        overallComment: "Unauthorized review",
      }),
    ).rejects.toThrow("Only assigned reviewer can submit");

    await submitReview.execute("rev-1", "emp-manager-1", {
      overallComment: "Exceeded all technical delivery milestones",
      ratings: [{ competencyId: "comp-1", score: 5, comment: "Strong ownership" }],
    });
    expect(reviewsStore.get("rev-1").status).toBe("submitted");
    expect(stagedEvents[2]).toBeInstanceOf(ReviewSubmittedEvent);

    // Publishing result before cycle is approved must fail
    await expect(
      publishResult.execute(
        "cycle-2026-h1",
        { employeeId: "emp-101", finalScore: 4.8, ratingLabel: "Exceeds Expectations" },
        "user-hr-1",
      ),
    ).rejects.toThrow("Cycle must be approved before publishing results");

    cyclesStore.get("cycle-2026-h1").status = "approved";
    await publishResult.execute(
      "cycle-2026-h1",
      { employeeId: "emp-101", finalScore: 4.8, ratingLabel: "Exceeds Expectations" },
      "user-hr-1",
    );
    expect(stagedEvents[3]).toBeInstanceOf(PerformanceResultPublishedEvent);
  });
});
