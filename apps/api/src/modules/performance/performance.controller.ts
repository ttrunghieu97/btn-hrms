import { Body, Controller, Get, Param, Post, Request } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CheckPolicy } from "../../core/security/decorators/check-policy.decorator";
import { PerformancePolicies } from "../../core/security/policies/performance.policy";
import {
  CreateCycleUseCase, ListCyclesUseCase, GetCycleUseCase,
  OpenPlanningUseCase, StartSelfReviewUseCase, StartManagerReviewUseCase,
  StartCalibrationUseCase, SubmitForApprovalUseCase, ApproveCycleUseCase,
  PublishResultsUseCase, CloseCycleUseCase,
} from "./cycle/use-cases";
import {
  CreateGoalUseCase, AssignGoalUseCase, SubmitGoalUseCase, ApproveGoalUseCase, ListGoalsUseCase,
} from "./goal/use-cases";
import { AssignReviewerUseCase, SubmitReviewUseCase, ListReviewsUseCase } from "./review/use-cases";
import { PublishResultUseCase } from "./rating/use-cases";
import {
  CreateCycleDto, CreateGoalDto, AssignReviewerDto, SubmitReviewDto, PublishResultDto,
  CycleResponseDto, GoalResponseDto,
} from "./dto/performance.dto";

@ApiTags("Performance")
@ApiBearerAuth()
@Controller("performance")
@CheckPolicy(PerformancePolicies.access)
export class PerformanceController {
  constructor(
    // Cycle
    private readonly createCycle: CreateCycleUseCase,
    private readonly listCycles: ListCyclesUseCase,
    private readonly getCycle: GetCycleUseCase,
    private readonly openPlanning: OpenPlanningUseCase,
    private readonly startSelfReview: StartSelfReviewUseCase,
    private readonly startManagerReview: StartManagerReviewUseCase,
    private readonly startCalibration: StartCalibrationUseCase,
    private readonly submitForApproval: SubmitForApprovalUseCase,
    private readonly approveCycle: ApproveCycleUseCase,
    private readonly publishResults: PublishResultsUseCase,
    private readonly closeCycle: CloseCycleUseCase,
    // Goal
    private readonly createGoal: CreateGoalUseCase,
    private readonly assignGoal: AssignGoalUseCase,
    private readonly submitGoal: SubmitGoalUseCase,
    private readonly approveGoal: ApproveGoalUseCase,
    private readonly listGoals: ListGoalsUseCase,
    // Review
    private readonly assignReviewer: AssignReviewerUseCase,
    private readonly submitReview: SubmitReviewUseCase,
    private readonly listReviews: ListReviewsUseCase,
    // Result
    private readonly publishResult: PublishResultUseCase,
  ) {}

  // ── Cycles ──
  @Post("cycles")
  async createCycleEndpoint(@Body() dto: CreateCycleDto): Promise<CycleResponseDto> {
    return this.createCycle.execute(dto);
  }

  @Get("cycles")
  async listCyclesEndpoint(): Promise<CycleResponseDto[]> {
    return this.listCycles.execute();
  }

  @Get("cycles/:id")
  async getCycleEndpoint(@Param("id") id: string): Promise<CycleResponseDto> {
    return this.getCycle.execute(id);
  }

  @Post("cycles/:id/open-planning")
  async openPlanningEndpoint(@Param("id") id: string, @Request() req: any): Promise<void> {
    return this.openPlanning.execute(id, req.user?.userId);
  }

  @Post("cycles/:id/start-self-review")
  async startSelfReviewEndpoint(@Param("id") id: string, @Request() req: any): Promise<void> {
    return this.startSelfReview.execute(id, req.user?.userId);
  }

  @Post("cycles/:id/start-manager-review")
  async startManagerReviewEndpoint(@Param("id") id: string, @Request() req: any): Promise<void> {
    return this.startManagerReview.execute(id, req.user?.userId);
  }

  @Post("cycles/:id/start-calibration")
  async startCalibrationEndpoint(@Param("id") id: string, @Request() req: any): Promise<void> {
    return this.startCalibration.execute(id, req.user?.userId);
  }

  @Post("cycles/:id/submit-for-approval")
  async submitForApprovalEndpoint(@Param("id") id: string, @Request() req: any): Promise<void> {
    return this.submitForApproval.execute(id, req.user?.userId);
  }

  @Post("cycles/:id/approve")
  async approveCycleEndpoint(@Param("id") id: string, @Request() req: any): Promise<void> {
    return this.approveCycle.execute(id, req.user?.userId);
  }

  @Post("cycles/:id/publish")
  async publishCycleEndpoint(@Param("id") id: string, @Request() req: any): Promise<void> {
    return this.publishResults.execute(id, req.user?.userId);
  }

  @Post("cycles/:id/close")
  async closeCycleEndpoint(@Param("id") id: string, @Request() req: any): Promise<void> {
    return this.closeCycle.execute(id, req.user?.userId);
  }

  // ── Goals ──
  @Post("cycles/:cycleId/goals")
  async createGoalEndpoint(@Param("cycleId") cycleId: string, @Body() dto: CreateGoalDto): Promise<GoalResponseDto> {
    return this.createGoal.execute(cycleId, dto);
  }

  @Get("cycles/:cycleId/goals")
  async listGoalsEndpoint(@Param("cycleId") cycleId: string): Promise<GoalResponseDto[]> {
    return this.listGoals.execute(cycleId);
  }

  @Post("goals/:goalId/assign")
  async assignGoalEndpoint(@Param("goalId") goalId: string, @Body("employeeId") employeeId: string): Promise<void> {
    return this.assignGoal.execute(goalId, employeeId);
  }

  @Post("goals/:goalId/submit")
  async submitGoalEndpoint(@Param("goalId") goalId: string, @Request() req: any): Promise<void> {
    return this.submitGoal.execute(goalId, req.user?.userId);
  }

  @Post("goals/:goalId/approve")
  async approveGoalEndpoint(@Param("goalId") goalId: string, @Request() req: any): Promise<void> {
    return this.approveGoal.execute(goalId, req.user?.userId);
  }

  // ── Reviews ──
  @Post("review-assignments")
  async assignReviewerEndpoint(@Body() dto: AssignReviewerDto): Promise<void> {
    return this.assignReviewer.execute(dto);
  }

  @Post("review-assignments/:id/submit")
  async submitReviewEndpoint(@Param("id") id: string, @Request() req: any, @Body() dto: SubmitReviewDto): Promise<void> {
    return this.submitReview.execute(id, req.user?.userId, dto);
  }

  @Get("cycles/:cycleId/reviews/summary")
  async reviewSummaryEndpoint(@Param("cycleId") cycleId: string) {
    return this.listReviews.execute(cycleId);
  }

  // ── Results ──
  @Post("cycles/:cycleId/results")
  async publishResultEndpoint(@Param("cycleId") cycleId: string, @Body() dto: PublishResultDto, @Request() req: any): Promise<void> {
    return this.publishResult.execute(cycleId, dto, req.user?.userId);
  }
}
