import {
  Body,
  Controller,
  Param,
  ParseUUIDPipe,
  Post,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CheckPolicy } from "../../../core/security/decorators/check-policy.decorator";
import { RecruitmentPolicies } from "../../../core/security/policies/recruitment.policy";
import { AuditLog } from "../../../shared/decorators/audit-log.decorator";
import { AdvanceStageDto } from "./dto/advance-stage.dto";
import { RejectApplicationDto } from "./dto/reject-application.dto";
import { SubmitScorecardDto } from "./dto/submit-scorecard.dto";
import { AdvanceStageUseCase } from "./use-cases/advance-stage.usecase";
import { RejectApplicationUseCase } from "./use-cases/reject-application.usecase";
import { WithdrawApplicationUseCase } from "./use-cases/withdraw-application.usecase";
import { SubmitScorecardUseCase } from "./use-cases/submit-scorecard.usecase";

@ApiTags("Recruitment Pipeline")
@ApiBearerAuth()
@Controller()
export class PipelineController {
  constructor(
    private readonly advanceStage: AdvanceStageUseCase,
    private readonly rejectApplication: RejectApplicationUseCase,
    private readonly withdrawApplication: WithdrawApplicationUseCase,
    private readonly submitScorecard: SubmitScorecardUseCase,
  ) {}

  @Post("applications/:id/advance")
  @CheckPolicy(RecruitmentPolicies.managePipeline)
  @AuditLog({ action: "application_advance", entity: "application" })
  @ApiOperation({ summary: "Advance an application to the next stage" })
  advance(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: AdvanceStageDto,
  ) {
    return this.advanceStage.execute(id, dto);
  }

  @Post("applications/:id/reject")
  @CheckPolicy(RecruitmentPolicies.managePipeline)
  @AuditLog({ action: "application_reject", entity: "application" })
  @ApiOperation({ summary: "Reject an application" })
  reject(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: RejectApplicationDto,
  ) {
    return this.rejectApplication.execute(id, dto);
  }

  @Post("applications/:id/withdraw")
  @CheckPolicy(RecruitmentPolicies.managePipeline)
  @AuditLog({ action: "application_withdraw", entity: "application" })
  @ApiOperation({ summary: "Withdraw an application" })
  withdraw(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: RejectApplicationDto,
  ) {
    return this.withdrawApplication.execute(id, dto);
  }

  @Post("applications/:id/scorecards")
  @CheckPolicy(RecruitmentPolicies.managePipeline)
  @AuditLog({ action: "application_scorecard_submit", entity: "application" })
  @ApiOperation({ summary: "Submit an interview scorecard" })
  scorecard(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: SubmitScorecardDto,
  ) {
    return this.submitScorecard.execute(id, dto);
  }
}
