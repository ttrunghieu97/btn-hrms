import { Inject, Injectable } from "@nestjs/common";
import type { VerificationStep, StepResult } from "../verification-step.interface";
import type { AttendanceVerificationContext } from "../verification-context";
import { CONTRACTS_TOKENS, type WorkforceTimeManagementPort } from "../../../../../contracts";
import { AttendancePolicyService } from "../../services/attendance-policy.service";
import { throwBadRequest } from "../../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../../shared/constants/error-codes";

@Injectable()
export class EmployeeContextStep implements VerificationStep {
  readonly name = "employee_context";

  constructor(
    @Inject(CONTRACTS_TOKENS.WORKFORCE_TIME_MANAGEMENT_PORT)
    private readonly workforcePort: WorkforceTimeManagementPort,
    private readonly policy: AttendancePolicyService,
  ) {}

  async execute(ctx: AttendanceVerificationContext): Promise<StepResult> {
    const employeeContext = await this.workforcePort.getEmployeeContext(ctx.employeeId);
    if (employeeContext?.employmentStatus !== "eligible") {
      throwBadRequest("Employee is not eligible", ERROR_CODES.INVALID_REQUEST, {
        employeeId: ctx.employeeId,
      });
    }
    ctx.employeeContext = employeeContext;

    // Phase 1: allow check-in without shift (policy-controlled).
    // Phase 2: when schedule integration is complete, this check
    // gates on shift/roster assignment, not just currentSite.
    const hasSite = employeeContext.currentSite != null;
    if (!hasSite && !this.policy.allowCheckInWithoutShift) {
      throwBadRequest(
        "No shift assignment for today. Please contact your manager.",
        ERROR_CODES.NO_SHIFT_ASSIGNED,
        { employeeId: ctx.employeeId },
      );
    }

    return {};
  }
}
