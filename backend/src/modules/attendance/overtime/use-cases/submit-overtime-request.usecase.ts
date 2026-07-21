import { Injectable } from "@nestjs/common";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { throwBadRequest } from "../../../../shared/utils/http-error";
import { AttendanceSummariesRepository } from "../../attendance-summaries/repositories/attendance-summaries.repository";
import { OvertimeMapper } from "../mappers/overtime.mapper";
import { SubmitOvertimeRequestDto } from "../dto/overtime.dto";
import { OvertimeCalculationService } from "../services/overtime-calculation.service";
import { OvertimeWorkflowService } from "../services/overtime-workflow.service";
import { ContextLogger } from "../../../../shared/logging/context-logger";
import { RequestContextService } from "../../../../shared/context/request-context.service";

@Injectable()
export class SubmitOvertimeRequestUseCase {
  private readonly logger: ContextLogger;
  constructor(
    private readonly workflow: OvertimeWorkflowService,
    private readonly calc: OvertimeCalculationService,
    private readonly summariesRepo: AttendanceSummariesRepository,
    private readonly requestContext: RequestContextService,
  ) {
    this.logger = new ContextLogger(this.requestContext, SubmitOvertimeRequestUseCase.name);
  }

  async execute(employeeId: string | null | undefined, dto: SubmitOvertimeRequestDto) {
    if (!employeeId) {
      throwBadRequest(
        "Employee profile required",
        ERROR_CODES.EMPLOYEE_PROFILE_REQUIRED,
      );
    }

    const summary = await this.summariesRepo.findByEmployeeAndDate(
      employeeId,
      dto.workDate,
    );
    const candidateMinutes = summary
      ? this.calc.calculateCandidateMinutes(summary)
      : 0;

    if (candidateMinutes <= 0) {
      throwBadRequest(
        "No candidate overtime available for this date",
        ERROR_CODES.INVALID_REQUEST,
      );
    }

    const result = await this.workflow.submitRequest({
      employeeId,
      workDate: dto.workDate,
      requestedMinutes: dto.requestedMinutes,
      candidateMinutes,
      requestNote: dto.requestNote,
    });

    return OvertimeMapper.toDto(result);
  }
}



