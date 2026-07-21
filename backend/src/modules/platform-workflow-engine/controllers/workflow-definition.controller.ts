import { Controller, Get, Param, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CheckPolicy } from "../../../core/security/decorators/check-policy.decorator";
import { WorkflowPolicies } from "../policies/workflow.policy";
import { ListWorkflowDefinitionsUseCase } from "../use-cases/list-workflow-definitions.usecase";
import { GetWorkflowDefinitionUseCase } from "../use-cases/get-workflow-definition.usecase";
@ApiTags("Workflow Engine")
@ApiBearerAuth()
@Controller("workflow-definitions")
export class WorkflowDefinitionController {
  constructor(
    private readonly listDefinitions: ListWorkflowDefinitionsUseCase,
    private readonly getDefinition: GetWorkflowDefinitionUseCase,
  ) {}

  @Get()
  @CheckPolicy(WorkflowPolicies.viewDefinitions)
  @ApiOperation({ summary: "List all workflow definitions" })
  async list(@Query("page") page?: string, @Query("limit") limit?: string) {
    return this.listDefinitions.execute({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get(":key")
  @CheckPolicy(WorkflowPolicies.viewDefinitions)
  @ApiOperation({ summary: "Get workflow definition by key" })
  async get(@Param("key") key: string) {
    return this.getDefinition.execute(key);
  }
}
