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
import { CreateRequisitionDto } from "./dto/create-requisition.dto";
import { UpdateRequisitionDto } from "./dto/update-requisition.dto";
import { RequisitionQueryDto } from "./dto/requisition-query.dto";
import { CreateRequisitionUseCase } from "./use-cases/create-requisition.usecase";
import { UpdateRequisitionUseCase } from "./use-cases/update-requisition.usecase";
import { SubmitRequisitionUseCase } from "./use-cases/submit-requisition.usecase";
import { CloseRequisitionUseCase } from "./use-cases/close-requisition.usecase";
import { GetRequisitionUseCase } from "./use-cases/get-requisition.usecase";
import { ListRequisitionsUseCase } from "./use-cases/list-requisitions.usecase";

@ApiTags("Recruitment Requisitions")
@ApiBearerAuth()
@Controller()
export class RequisitionsController {
  constructor(
    private readonly createRequisition: CreateRequisitionUseCase,
    private readonly updateRequisition: UpdateRequisitionUseCase,
    private readonly submitRequisition: SubmitRequisitionUseCase,
    private readonly closeRequisition: CloseRequisitionUseCase,
    private readonly getRequisition: GetRequisitionUseCase,
    private readonly listRequisitions: ListRequisitionsUseCase,
  ) {}

  @Get()
  @CheckPolicy(RecruitmentPolicies.view)
  @ApiOperation({ summary: "List job requisitions" })
  list(@Query() query: RequisitionQueryDto) {
    return this.listRequisitions.execute(query);
  }

  @Get(":id")
  @CheckPolicy(RecruitmentPolicies.view)
  @ApiOperation({ summary: "Get a job requisition" })
  get(@Param("id", new ParseUUIDPipe()) id: string) {
    return this.getRequisition.execute(id);
  }

  @Post()
  @CheckPolicy(RecruitmentPolicies.manageRequisition)
  @AuditLog({ action: "requisition_create", entity: "job_requisition" })
  @ApiOperation({ summary: "Create a job requisition" })
  create(@Body() dto: CreateRequisitionDto) {
    return this.createRequisition.execute(dto);
  }

  @Patch(":id")
  @CheckPolicy(RecruitmentPolicies.manageRequisition)
  @AuditLog({ action: "requisition_update", entity: "job_requisition" })
  @ApiOperation({ summary: "Update a draft requisition" })
  update(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateRequisitionDto,
  ) {
    return this.updateRequisition.execute(id, dto);
  }

  @Post(":id/submit")
  @CheckPolicy(RecruitmentPolicies.manageRequisition)
  @AuditLog({ action: "requisition_submit", entity: "job_requisition" })
  @ApiOperation({ summary: "Submit a requisition for approval" })
  submit(@Param("id", new ParseUUIDPipe()) id: string) {
    return this.submitRequisition.execute(id);
  }

  @Post(":id/close")
  @CheckPolicy(RecruitmentPolicies.manageRequisition)
  @AuditLog({ action: "requisition_close", entity: "job_requisition" })
  @ApiOperation({ summary: "Close a requisition" })
  close(@Param("id", new ParseUUIDPipe()) id: string) {
    return this.closeRequisition.execute(id);
  }
}
