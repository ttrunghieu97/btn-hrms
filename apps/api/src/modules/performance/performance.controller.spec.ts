import { PerformanceController } from "./performance.controller";
import { ListGoalsUseCase } from "./goal/use-cases/list-goals.usecase";
import { ListReviewsUseCase } from "./review/use-cases/list-reviews.usecase";
import { Permissions } from "../../core/security/permissions/permissions.registry";

describe("PerformanceController & UseCases — Self-Scope Isolation", () => {
  const goalRepo = {
    findGoalsByCycle: jest.fn(),
    findAssignmentsByGoal: jest.fn(),
  };

  const reviewRepo = {
    countByCycle: jest.fn(),
    findByEmployee: jest.fn(),
    findPendingByReviewer: jest.fn(),
  };

  const listGoalsUseCase = new ListGoalsUseCase(goalRepo as never);
  const listReviewsUseCase = new ListReviewsUseCase(reviewRepo as never);
  const submitGoalUseCase = { execute: jest.fn() };
  const submitReviewUseCase = { execute: jest.fn() };

  const noop = { execute: jest.fn() } as never;

  const controller = new PerformanceController(
    noop,
    noop,
    noop,
    noop,
    noop,
    noop,
    noop,
    noop,
    noop,
    noop,
    noop,
    noop,
    noop,
    submitGoalUseCase as never,
    noop,
    listGoalsUseCase,
    noop,
    submitReviewUseCase as never,
    listReviewsUseCase,
    noop,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    goalRepo.findGoalsByCycle.mockResolvedValue([
      { id: "goal-emp-1", title: "Deliver API Hardening", status: "submitted" },
      { id: "goal-emp-2", title: "Reduce Cloud Spend", status: "draft" },
    ]);
    goalRepo.findAssignmentsByGoal.mockImplementation(async (goalId: string) => {
      if (goalId === "goal-emp-1") {
        return [{ goalId: "goal-emp-1", employeeId: "emp-1" }];
      }
      return [{ goalId: "goal-emp-2", employeeId: "emp-2" }];
    });
    reviewRepo.countByCycle.mockResolvedValue({ total: 10, submitted: 7 });
    reviewRepo.findByEmployee.mockResolvedValue([
      { id: "rev-1", employeeId: "emp-1", reviewerId: "emp-mgr", status: "submitted" },
      { id: "rev-2", employeeId: "emp-1", reviewerId: "emp-1", status: "pending" },
    ]);
  });

  describe("listGoalsEndpoint", () => {
    it("returns all cycle goals for HR/Manager with performance:manage", async () => {
      const goals = await controller.listGoalsEndpoint("cycle-1", {
        user: {
          id: "u-mgr",
          employeeId: "emp-mgr",
          permissions: [Permissions.PERFORMANCE_MANAGE],
        } as never,
      });

      expect(goals).toHaveLength(2);
    });

    it("filters cycle goals to only those assigned to caller's employeeId when caller only holds performance:view", async () => {
      const goals = await controller.listGoalsEndpoint("cycle-1", {
        user: {
          id: "u-emp-1",
          employeeId: "emp-1",
          permissions: [Permissions.PERFORMANCE_VIEW],
        } as never,
      });

      expect(goals).toEqual([
        { id: "goal-emp-1", title: "Deliver API Hardening", status: "submitted" },
      ]);
    });

    it("fails closed with 403 Forbidden when self-scoped caller has no linked employeeId", async () => {
      await expect(
        controller.listGoalsEndpoint("cycle-1", {
          user: {
            id: "u-unlinked",
            employeeId: undefined,
            permissions: [Permissions.PERFORMANCE_VIEW],
          } as never,
        }),
      ).rejects.toThrow(/Employee profile|Forbidden/i);
    });
  });

  describe("reviewSummaryEndpoint", () => {
    it("returns full cycle review counts for HR/Manager with performance:manage", async () => {
      const summary = await controller.reviewSummaryEndpoint("cycle-1", {
        user: {
          id: "u-mgr",
          employeeId: "emp-mgr",
          permissions: [Permissions.PERFORMANCE_MANAGE],
        } as never,
      });

      expect(summary).toEqual({ total: 10, submitted: 7 });
    });

    it("scopes review summary counts to caller's own employee reviews when caller only holds performance:view", async () => {
      const summary = await controller.reviewSummaryEndpoint("cycle-1", {
        user: {
          id: "u-emp-1",
          employeeId: "emp-1",
          permissions: [Permissions.PERFORMANCE_VIEW],
        } as never,
      });

      expect(summary).toEqual({ total: 2, submitted: 1 });
      expect(reviewRepo.countByCycle).not.toHaveBeenCalled();
    });

    it("fails closed with 403 Forbidden when self-scoped caller has no linked employeeId", async () => {
      await expect(
        controller.reviewSummaryEndpoint("cycle-1", {
          user: {
            id: "u-unlinked",
            employeeId: undefined,
            permissions: [Permissions.PERFORMANCE_VIEW],
          } as never,
        }),
      ).rejects.toThrow(/Employee profile|Forbidden/i);
    });
  });

  describe("submitGoalEndpoint & submitReviewEndpoint", () => {
    it("fails closed with 403 Forbidden when caller has no linked employeeId", async () => {
      await expect(
        controller.submitGoalEndpoint("goal-emp-1", {
          user: {
            id: "u-unlinked",
            employeeId: undefined,
            permissions: [Permissions.PERFORMANCE_VIEW],
          } as never,
        }),
      ).rejects.toThrow(/Employee profile|Forbidden/i);

      await expect(
        controller.submitReviewEndpoint(
          "rev-1",
          {
            user: {
              id: "u-unlinked",
              employeeId: undefined,
              permissions: [Permissions.PERFORMANCE_VIEW],
            } as never,
          },
          { overallComment: "Attempted submission" },
        ),
      ).rejects.toThrow(/Employee profile|Forbidden/i);
    });
  });
});
