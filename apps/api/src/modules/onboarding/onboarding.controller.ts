import {
  Body, Controller, Delete, Get, Param, Patch, Post, Query,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CheckPolicy } from "../../core/security/decorators/check-policy.decorator";
import { EmployeePolicies } from "../../core/security/policies/employee.policy";
import { AuditLog } from "../../shared/decorators/audit-log.decorator";
import { ListOnboardingTemplatesUseCase } from "./use-cases/list-onboarding-templates.usecase";
import { GetOnboardingTemplateUseCase } from "./use-cases/get-onboarding-template.usecase";
import { CreateOnboardingTemplateUseCase } from "./use-cases/create-onboarding-template.usecase";
import { UpdateOnboardingTemplateUseCase } from "./use-cases/update-onboarding-template.usecase";
import { DeleteOnboardingTemplateUseCase } from "./use-cases/delete-onboarding-template.usecase";
import {
  ListOnboardingTemplatesQueryDto,
  CreateOnboardingTemplateDto,
  UpdateOnboardingTemplateDto,
} from "./dto/onboarding-template.dto";
import { OnboardingTemplateResponseDto } from "./dto/onboarding-template-response.dto";

@ApiTags("Onboarding")
@ApiBearerAuth()
@Controller("onboarding/templates")
export class OnboardingController {
  constructor(
    private readonly list: ListOnboardingTemplatesUseCase,
    private readonly get: GetOnboardingTemplateUseCase,
    private readonly create: CreateOnboardingTemplateUseCase,
    private readonly update: UpdateOnboardingTemplateUseCase,
    private readonly deleteTemplate: DeleteOnboardingTemplateUseCase,
  ) {}

  @Get()
  @CheckPolicy(EmployeePolicies.view)
  @ApiOperation({ summary: "List onboarding templates" })
  async findAll(@Query() query: ListOnboardingTemplatesQueryDto) {
    const result = await this.list.execute(query);
    return {
      data: result.rows,
      meta: {
        pagination: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          hasNext: result.page * result.limit < result.total,
        },
        requestId: "",
        timestamp: new Date().toISOString(),
      },
      error: null,
    };
  }

  @Get(":id")
  @CheckPolicy(EmployeePolicies.view)
  @ApiOperation({ summary: "Get onboarding template with items" })
  @ApiOkResponse({ type: OnboardingTemplateResponseDto })
  async findOne(@Param("id") id: string) {
    const template = await this.get.execute(id);
    return {
      data: template,
      meta: { requestId: "", timestamp: new Date().toISOString() },
      error: null,
    };
  }

  @Post()
  @CheckPolicy(EmployeePolicies.edit)
  @AuditLog({ action: "onboarding_template_create", entity: "employee" })
  @ApiOperation({ summary: "Create an onboarding template with checklist items" })
  async createOne(@Body() dto: CreateOnboardingTemplateDto) {
    const template = await this.create.execute(dto);
    return {
      data: template,
      meta: { requestId: "", timestamp: new Date().toISOString() },
      error: null,
    };
  }

  @Patch(":id")
  @CheckPolicy(EmployeePolicies.edit)
  @AuditLog({ action: "onboarding_template_update", entity: "employee" })
  @ApiOperation({ summary: "Update template. Omit items to keep existing, send [] to clear all" })
  async updateOne(@Param("id") id: string, @Body() dto: UpdateOnboardingTemplateDto) {
    const template = await this.update.execute(id, dto);
    return {
      data: template,
      meta: { requestId: "", timestamp: new Date().toISOString() },
      error: null,
    };
  }

  @Delete(":id")
  @CheckPolicy(EmployeePolicies.edit)
  @AuditLog({ action: "onboarding_template_delete", entity: "employee" })
  @ApiOperation({ summary: "Soft delete an onboarding template" })
  async deleteOne(@Param("id") id: string) {
    await this.deleteTemplate.execute(id);
    return {
      data: { success: true },
      meta: { requestId: "", timestamp: new Date().toISOString() },
      error: null,
    };
  }
}
