import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CheckPolicy } from "../../../core/security/decorators/check-policy.decorator";
import { RecruitmentPolicies } from "../../../core/security/policies/recruitment.policy";
import { AuditLog } from "../../../shared/decorators/audit-log.decorator";
import type { AuthUser } from "../../../core/security/types/auth-user.interface";
import {
  ScheduleInterviewDto,
  CompleteInterviewDto,
  SubmitScorecardDto,
} from "./dto/interview.dto";
import {
  ScheduleInterviewUseCase,
  CompleteInterviewUseCase,
  SubmitScorecardUseCase,
  ListInterviewsUseCase,
} from "./use-cases";

@ApiTags("Recruitment Interviews")
@ApiBearerAuth()
@Controller()
export class InterviewsController {
  constructor(
    private readonly listInterviews: ListInterviewsUseCase,
    private readonly scheduleInterview: ScheduleInterviewUseCase,
    private readonly completeInterview: CompleteInterviewUseCase,
    private readonly submitScorecard: SubmitScorecardUseCase,
  ) {}

  @Get()
  @CheckPolicy(RecruitmentPolicies.view)
  @ApiOperation({ summary: "List interviews for an application" })
  list(@Query("applicationId", new ParseUUIDPipe()) applicationId: string) {
    return this.listInterviews.execute(applicationId);
  }

  @Post()
  @CheckPolicy(RecruitmentPolicies.managePipeline)
  @AuditLog({ action: "interview_schedule", entity: "interview" })
  @ApiOperation({ summary: "Schedule an interview for a candidate application" })
  schedule(
    @Body() dto: ScheduleInterviewDto,
    @Req() req: { user: AuthUser },
  ) {
    return this.scheduleInterview.execute(dto, req.user.id);
  }

  @Post(":id/complete")
  @CheckPolicy(RecruitmentPolicies.managePipeline)
  @AuditLog({ action: "interview_complete", entity: "interview" })
  @ApiOperation({ summary: "Mark a scheduled interview as completed" })
  complete(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: CompleteInterviewDto,
  ) {
    return this.completeInterview.execute(id, dto);
  }

  @Post(":id/scorecard")
  @CheckPolicy(RecruitmentPolicies.managePipeline)
  @AuditLog({ action: "interview_scorecard_submit", entity: "interview" })
  @ApiOperation({ summary: "Submit a scorecard for a completed interview" })
  scorecard(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: SubmitScorecardDto,
    @Req() req: { user: AuthUser },
  ) {
    return this.submitScorecard.execute(id, req.user.id, dto);
  }
}
