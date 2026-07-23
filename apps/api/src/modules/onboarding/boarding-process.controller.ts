import { Controller, Get, Param, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CheckPolicy } from "../../core/security/decorators/check-policy.decorator";
import { EmployeePolicies } from "../../core/security/policies/employee.policy";
import { ListOnboardingProcessesUseCase } from "./use-cases/list-onboarding-processes.usecase";
import { GetOnboardingProcessUseCase } from "./use-cases/get-onboarding-process.usecase";

@ApiTags("Onboarding Processes")
@ApiBearerAuth()
@Controller("onboarding/processes")
export class BoardingProcessController {
  constructor(
    private readonly list: ListOnboardingProcessesUseCase,
    private readonly get: GetOnboardingProcessUseCase,
  ) {}

  @Get()
  @CheckPolicy(EmployeePolicies.view)
  @ApiOperation({ summary: "List onboarding processes" })
  async findAll(@Query("page") page?: number, @Query("limit") limit?: number) {
    const result = await this.list.execute(page ?? 1, limit ?? 20);
    return {
      data: result.rows,
      meta: {
        pagination: {
          total: result.total,
          page: page ?? 1,
          limit: limit ?? 20,
          hasNext: (page ?? 1) * (limit ?? 20) < result.total,
        },
        requestId: "",
        timestamp: new Date().toISOString(),
      },
      error: null,
    };
  }

  @Get(":id")
  @CheckPolicy(EmployeePolicies.view)
  @ApiOperation({ summary: "Get onboarding process detail" })
  async findOne(@Param("id") id: string) {
    const process = await this.get.execute(id);
    return {
      data: process,
      meta: { requestId: "", timestamp: new Date().toISOString() },
      error: null,
    };
  }
}
