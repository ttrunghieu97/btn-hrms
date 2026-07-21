import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Put, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CheckPolicy } from "../../../core/security/decorators/check-policy.decorator";
import { ApprovalPolicies } from "../policies/approval.policy";
import { AuditLog } from "../../../shared/decorators/audit-log.decorator";
import { CreateApprovalPolicyUseCase } from "../use-cases/create-approval-policy.usecase";
import { ListApprovalPoliciesUseCase } from "../use-cases/list-approval-policies.usecase";
import { GetApprovalPolicyUseCase } from "../use-cases/get-approval-policy.usecase";
import { UpdateApprovalPolicyUseCase } from "../use-cases/update-approval-policy.usecase";
import { DeactivateApprovalPolicyUseCase } from "../use-cases/deactivate-approval-policy.usecase";
import { CreateApprovalPolicyDto } from "../dto/create-approval-policy.dto";
import { UpdateApprovalPolicyDto } from "../dto/update-approval-policy.dto";

@ApiTags("Approval Engine")
@ApiBearerAuth()
@Controller("approval-policies")
export class ApprovalPolicyController {
  constructor(
    private readonly createPolicy: CreateApprovalPolicyUseCase,
    private readonly listPolicies: ListApprovalPoliciesUseCase,
    private readonly getPolicy: GetApprovalPolicyUseCase,
    private readonly updatePolicy: UpdateApprovalPolicyUseCase,
    private readonly deactivatePolicy: DeactivateApprovalPolicyUseCase,
  ) {}

  @Post()
  @CheckPolicy(ApprovalPolicies.createPolicy)
  @AuditLog({ action: "approval_policy_create", entity: "approval_policy" })
  @ApiOperation({ summary: "Create approval policy" })
  async create(@Body() dto: CreateApprovalPolicyDto) {
    return this.createPolicy.execute(dto);
  }

  @Get()
  @CheckPolicy(ApprovalPolicies.viewPolicies)
  @ApiOperation({ summary: "List approval policies" })
  async list(
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("key") key?: string,
    @Query("isActive") isActive?: string,
  ) {
    return this.listPolicies.execute({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      key,
      isActive: isActive !== undefined ? isActive === "true" : undefined,
    });
  }

  @Get(":id")
  @CheckPolicy(ApprovalPolicies.viewPolicies)
  @ApiOperation({ summary: "Get approval policy by ID" })
  async get(@Param("id", new ParseUUIDPipe()) id: string) {
    return this.getPolicy.execute(id);
  }

  @Put(":id")
  @CheckPolicy(ApprovalPolicies.updatePolicy)
  @AuditLog({ action: "approval_policy_update", entity: "approval_policy" })
  @ApiOperation({ summary: "Update approval policy" })
  async update(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateApprovalPolicyDto,
  ) {
    return this.updatePolicy.execute(id, dto);
  }

  @Delete(":id")
  @CheckPolicy(ApprovalPolicies.deletePolicy)
  @AuditLog({ action: "approval_policy_deactivate", entity: "approval_policy" })
  @ApiOperation({ summary: "Deactivate approval policy" })
  async remove(@Param("id", new ParseUUIDPipe()) id: string) {
    return this.deactivatePolicy.execute(id);
  }
}
