import { Body, Controller, Get, Param, Post, Patch, Request } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CheckPolicy } from "../../core/security/decorators/check-policy.decorator";
import { BenefitsPolicies } from "../../core/security/policies/benefits.policy";
import { CreatePlanUseCase, ListPlansUseCase, GetPlanUseCase, PublishPlanUseCase } from "./plan/use-cases";
import { EnrollEmployeeUseCase, ApproveEnrollmentUseCase, CancelEnrollmentUseCase, ListEnrollmentsUseCase } from "./enrollment/use-cases";
import { AddDependentUseCase } from "./dependents/use-cases";
import { CreatePlanDto, EnrollEmployeeDto, AddDependentDto, PlanResponseDto, EnrollmentResponseDto } from "./dto/benefit.dto";

@ApiTags("Benefits")
@ApiBearerAuth()
@Controller("benefits")
@CheckPolicy(BenefitsPolicies.access)
export class BenefitsController {
  constructor(
    private readonly createPlan: CreatePlanUseCase,
    private readonly listPlans: ListPlansUseCase,
    private readonly getPlan: GetPlanUseCase,
    private readonly publishPlan: PublishPlanUseCase,
    private readonly enrollEmployee: EnrollEmployeeUseCase,
    private readonly approveEnrollment: ApproveEnrollmentUseCase,
    private readonly cancelEnrollment: CancelEnrollmentUseCase,
    private readonly listEnrollments: ListEnrollmentsUseCase,
    private readonly addDependent: AddDependentUseCase,
  ) {}

  @Post("plans") createPlanEndpoint(@Body() d: CreatePlanDto) { return this.createPlan.execute(d); }
  @Get("plans") listPlansEndpoint() { return this.listPlans.execute(); }
  @Get("plans/:id") getPlanEndpoint(@Param("id") id: string) { return this.getPlan.execute(id); }
  @Post("plans/:id/publish") publishPlanEndpoint(@Param("id") id: string) { return this.publishPlan.execute(id); }

  @Post("enrollments") enrollEndpoint(@Body() d: EnrollEmployeeDto) { return this.enrollEmployee.execute(d); }
  @Post("enrollments/:id/approve") approveEndpoint(@Param("id") id: string, @Request() r: any) { return this.approveEnrollment.execute(id, r.user?.userId); }
  @Post("enrollments/:id/cancel") cancelEndpoint(@Param("id") id: string) { return this.cancelEnrollment.execute(id); }
  @Get("enrollments") listEnrollmentsEndpoint(@Request() r: any) { return this.listEnrollments.execute(r.user?.userId); }

  @Post("dependents") addDependentEndpoint(@Body() d: AddDependentDto) { return this.addDependent.execute(d); }
}
