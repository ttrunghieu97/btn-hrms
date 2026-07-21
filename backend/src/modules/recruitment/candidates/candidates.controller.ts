import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CheckPolicy } from "../../../core/security/decorators/check-policy.decorator";
import { RecruitmentPolicies } from "../../../core/security/policies/recruitment.policy";
import { AuditLog } from "../../../shared/decorators/audit-log.decorator";
import { SubmitApplicationDto } from "./dto/submit-application.dto";
import { AttachCvDto } from "./dto/attach-cv.dto";
import { CandidateQueryDto } from "./dto/candidate-query.dto";
import { SubmitApplicationUseCase } from "./use-cases/submit-application.usecase";
import { AttachCvUseCase } from "./use-cases/attach-cv.usecase";
import { GetCandidateApplicationUseCase } from "./use-cases/get-candidate-application.usecase";
import { ListApplicationsUseCase } from "./use-cases/list-applications.usecase";

@ApiTags("Recruitment Candidates")
@ApiBearerAuth()
@Controller()
export class CandidatesController {
  constructor(
    private readonly submitApplication: SubmitApplicationUseCase,
    private readonly attachCv: AttachCvUseCase,
    private readonly getApplication: GetCandidateApplicationUseCase,
    private readonly listApplications: ListApplicationsUseCase,
  ) {}

  @Get("applications")
  @CheckPolicy(RecruitmentPolicies.view)
  @ApiOperation({ summary: "List applications" })
  list(@Query() query: CandidateQueryDto) {
    return this.listApplications.execute(query);
  }

  @Get("applications/:id")
  @CheckPolicy(RecruitmentPolicies.view)
  @ApiOperation({ summary: "Get an application" })
  get(@Param("id", new ParseUUIDPipe()) id: string) {
    return this.getApplication.execute(id);
  }

  @Post("applications")
  @CheckPolicy(RecruitmentPolicies.manageCandidate)
  @AuditLog({ action: "application_submit", entity: "application" })
  @ApiOperation({ summary: "Submit a candidate application" })
  submit(@Body() dto: SubmitApplicationDto) {
    return this.submitApplication.execute(dto);
  }

  @Post("applications/:id/cv")
  @CheckPolicy(RecruitmentPolicies.manageCandidate)
  @AuditLog({ action: "application_attach_cv", entity: "application" })
  @ApiOperation({ summary: "Attach a CV to an application" })
  attach(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: AttachCvDto,
  ) {
    return this.attachCv.execute(id, dto.fileToken);
  }
}
