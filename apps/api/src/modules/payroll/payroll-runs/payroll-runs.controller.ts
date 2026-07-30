import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Request,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import {
  PayrollRunEnvelopeDto,
  PayrollRunListEnvelopeDto,
} from "./dto/payroll-run-response.dto";
import { CheckPolicy } from "../../../core/security/decorators/check-policy.decorator";
import { PayrollPolicies } from "../../../core/security/policies/payroll.policy";
import { AuditLog } from "../../../shared/decorators/audit-log.decorator";
import { CreatePayrollRunDto } from "./dto/create-payroll-run.dto";
import { UpdatePayrollRunDto } from "./dto/update-payroll-run.dto";
import { PayrollRunQueryDto } from "./dto/payroll-run-query.dto";
import { Idempotent } from "../../../infrastructure/idempotency/idempotency.decorator";
import {
  ApprovePayrollRunUseCase,
  CreatePayrollRunUseCase,
  GeneratePayrollRunUseCase,
  GetPayrollRunUseCase,
  ListPayrollRunsUseCase,
  PostPayrollRunUseCase,
  RejectPayrollRunUseCase,
  RequestPayrollApprovalUseCase,
  UpdatePayrollRunUseCase,
} from "./use-cases/payroll-runs.usecases";

@ApiTags("Payroll Runs")
@ApiBearerAuth()
@Controller()
export class PayrollRunsController {
  constructor(
    private readonly listRuns: ListPayrollRunsUseCase,
    private readonly getRun: GetPayrollRunUseCase,
    private readonly createRun: CreatePayrollRunUseCase,
    private readonly updateRun: UpdatePayrollRunUseCase,
    private readonly generateRun: GeneratePayrollRunUseCase,
    private readonly approveRun: ApprovePayrollRunUseCase,
    private readonly rejectRun: RejectPayrollRunUseCase,
    private readonly requestApprovalRun: RequestPayrollApprovalUseCase,
    private readonly postRun: PostPayrollRunUseCase,
  ) {}

  @Get()
  @CheckPolicy(PayrollPolicies.view)
  @ApiOperation({ summary: "List payroll runs" })
  @ApiOkResponse({ type: PayrollRunListEnvelopeDto })
  list(@Query() query: PayrollRunQueryDto) {
    return this.listRuns.execute(query);
  }

  @Get(":id")
  @CheckPolicy(PayrollPolicies.view)
  @ApiOperation({ summary: "Get payroll run" })
  @ApiOkResponse({ type: PayrollRunEnvelopeDto })
  get(@Param("id", new ParseUUIDPipe()) id: string) {
    return this.getRun.execute(id);
  }

  @Post()
  @Idempotent("POST:/payroll-runs")
  @CheckPolicy(PayrollPolicies.managePeriods)
  @AuditLog({ action: "payroll_run_create", entity: "payroll_run" })
  @ApiOperation({ summary: "Create payroll run" })
  @ApiOkResponse({ type: PayrollRunEnvelopeDto })
  create(@Body() dto: CreatePayrollRunDto) {
    return this.createRun.execute(dto);
  }

  @Patch(":id")
  @CheckPolicy(PayrollPolicies.managePeriods)
  @AuditLog({ action: "payroll_run_update", entity: "payroll_run" })
  @ApiOperation({ summary: "Update payroll run" })
  @ApiOkResponse({ type: PayrollRunEnvelopeDto })
  update(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: UpdatePayrollRunDto,
  ) {
    return this.updateRun.execute(id, dto);
  }

  @Post(":id/generate")
  @Idempotent("POST:/payroll-runs/:id/generate")
  @CheckPolicy(PayrollPolicies.managePeriods)
  @AuditLog({ action: "payroll_run_generate", entity: "payroll_run" })
  @ApiOperation({
    summary: "Generate payslips and payroll records for payroll run",
  })
  @ApiOkResponse({ type: PayrollRunEnvelopeDto })
  generate(@Param("id", new ParseUUIDPipe()) id: string) {
    return this.generateRun.execute(id);
  }

  @Post(":id/request-approval")
  @CheckPolicy(PayrollPolicies.managePeriods)
  @AuditLog({ action: "payroll_run_request_approval", entity: "payroll_run" })
  @ApiOperation({ summary: "Submit payroll run for approval" })
  @ApiOkResponse({ type: PayrollRunEnvelopeDto })
  requestApproval(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Request() req: any,
  ) {
    return this.requestApprovalRun.execute(id, req.user?.id ?? "system");
  }

  @Post(":id/approve")
  @CheckPolicy(PayrollPolicies.managePeriods)
  @AuditLog({ action: "payroll_run_approve", entity: "payroll_run" })
  @ApiOperation({ summary: "Approve payroll run" })
  @ApiOkResponse({ type: PayrollRunEnvelopeDto })
  approve(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Request() req: any,
  ) {
    return this.approveRun.execute(id, req.user?.id ?? "system");
  }

  @Post(":id/reject")
  @CheckPolicy(PayrollPolicies.managePeriods)
  @AuditLog({ action: "payroll_run_reject", entity: "payroll_run" })
  @ApiOperation({ summary: "Reject payroll run (returns to draft)" })
  @ApiOkResponse({ type: PayrollRunEnvelopeDto })
  reject(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Request() req: any,
    @Body() body: { reason: string },
  ) {
    return this.rejectRun.execute(id, req.user?.id ?? "system", body.reason);
  }

  @Post(":id/post")
  @CheckPolicy(PayrollPolicies.managePeriods)
  @AuditLog({ action: "payroll_run_post", entity: "payroll_run" })
  @ApiOperation({ summary: "Post payroll run (final, immutable)" })
  @ApiOkResponse({ type: PayrollRunEnvelopeDto })
  post(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Request() req: any,
  ) {
    return this.postRun.execute(id, req.user?.id ?? "system");
  }
}



