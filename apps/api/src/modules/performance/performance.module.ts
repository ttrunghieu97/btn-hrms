import { Module } from "@nestjs/common";
import { PerformanceController } from "./performance.controller";

// Repositories
import { PerformanceCycleRepository } from "./cycle/repositories/performance-cycle.repository";
import { EmployeeGoalRepository } from "./goal/repositories/employee-goal.repository";
import { ReviewAssignmentRepository } from "./review/repositories/review-assignment.repository";
import { PerformanceResultRepository } from "./rating/repositories/performance-result.repository";

// Cycle use cases
import {
  CreateCycleUseCase, ListCyclesUseCase, GetCycleUseCase,
  OpenPlanningUseCase, StartSelfReviewUseCase, StartManagerReviewUseCase,
  StartCalibrationUseCase, SubmitForApprovalUseCase, ApproveCycleUseCase,
  PublishResultsUseCase, CloseCycleUseCase,
} from "./cycle/use-cases";

// Goal use cases
import {
  CreateGoalUseCase, AssignGoalUseCase, SubmitGoalUseCase, ApproveGoalUseCase, ListGoalsUseCase,
} from "./goal/use-cases";

// Review use cases
import { AssignReviewerUseCase, SubmitReviewUseCase, ListReviewsUseCase } from "./review/use-cases";

// Result use cases
import { PublishResultUseCase } from "./rating/use-cases";

@Module({
  controllers: [PerformanceController],
  providers: [
    // Repositories
    PerformanceCycleRepository,
    EmployeeGoalRepository,
    ReviewAssignmentRepository,
    PerformanceResultRepository,
    // Cycle
    CreateCycleUseCase, ListCyclesUseCase, GetCycleUseCase,
    OpenPlanningUseCase, StartSelfReviewUseCase, StartManagerReviewUseCase,
    StartCalibrationUseCase, SubmitForApprovalUseCase, ApproveCycleUseCase,
    PublishResultsUseCase, CloseCycleUseCase,
    // Goal
    CreateGoalUseCase, AssignGoalUseCase, SubmitGoalUseCase, ApproveGoalUseCase, ListGoalsUseCase,
    // Review
    AssignReviewerUseCase, SubmitReviewUseCase, ListReviewsUseCase,
    // Result
    PublishResultUseCase,
  ],
  exports: [],
})
export class PerformanceDomainModule {}
