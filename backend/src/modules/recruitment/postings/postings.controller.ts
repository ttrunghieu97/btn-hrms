import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CheckPolicy } from "../../../core/security/decorators/check-policy.decorator";
import { RecruitmentPolicies } from "../../../core/security/policies/recruitment.policy";
import { AuditLog } from "../../../shared/decorators/audit-log.decorator";
import { CreatePostingDto } from "./dto/create-posting.dto";
import { UpdatePostingDto } from "./dto/update-posting.dto";
import { PostingQueryDto } from "./dto/posting-query.dto";
import { ChangePostingStatusDto } from "./dto/change-posting-status.dto";
import { PublishPostingUseCase } from "./use-cases/publish-posting.usecase";
import { UpdatePostingUseCase } from "./use-cases/update-posting.usecase";
import { ChangePostingStatusUseCase } from "./use-cases/change-posting-status.usecase";
import { GetPostingUseCase } from "./use-cases/get-posting.usecase";
import { ListPostingsUseCase } from "./use-cases/list-postings.usecase";

@ApiTags("Recruitment Postings")
@ApiBearerAuth()
@Controller()
export class PostingsController {
  constructor(
    private readonly publishPosting: PublishPostingUseCase,
    private readonly updatePosting: UpdatePostingUseCase,
    private readonly changePostingStatus: ChangePostingStatusUseCase,
    private readonly getPosting: GetPostingUseCase,
    private readonly listPostings: ListPostingsUseCase,
  ) {}

  @Get()
  @CheckPolicy(RecruitmentPolicies.view)
  @ApiOperation({ summary: "List job postings" })
  list(@Query() query: PostingQueryDto) {
    return this.listPostings.execute(query);
  }

  @Get(":id")
  @CheckPolicy(RecruitmentPolicies.view)
  @ApiOperation({ summary: "Get a job posting" })
  get(@Param("id", new ParseUUIDPipe()) id: string) {
    return this.getPosting.execute(id);
  }

  @Post()
  @CheckPolicy(RecruitmentPolicies.managePosting)
  @AuditLog({ action: "posting_publish", entity: "job_posting" })
  @ApiOperation({ summary: "Publish a job posting" })
  publish(@Body() dto: CreatePostingDto) {
    return this.publishPosting.execute(dto);
  }

  @Patch(":id")
  @CheckPolicy(RecruitmentPolicies.managePosting)
  @AuditLog({ action: "posting_update", entity: "job_posting" })
  @ApiOperation({ summary: "Update a job posting" })
  update(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: UpdatePostingDto,
  ) {
    return this.updatePosting.execute(id, dto);
  }

  @Post(":id/status")
  @CheckPolicy(RecruitmentPolicies.managePosting)
  @AuditLog({ action: "posting_status_change", entity: "job_posting" })
  @ApiOperation({ summary: "Change a job posting status" })
  changeStatus(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: ChangePostingStatusDto,
  ) {
    return this.changePostingStatus.execute(id, dto.status);
  }
}
