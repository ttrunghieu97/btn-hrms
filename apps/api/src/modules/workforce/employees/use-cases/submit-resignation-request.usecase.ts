import { Injectable } from "@nestjs/common";
import { EmployeesRepository } from "../repositories/employees.repository";
import { SubmitResignationDto } from "../dto/submit-resignation.dto";
import { ScheduleTerminationUseCase } from "./schedule-termination.usecase";
import { PlatformWorkflowEngineService } from "../../../platform-workflow-engine/platform-workflow-engine.service";
import { todayDateString } from "../../../../shared/utils/date-format";
import {
  throwBadRequest,
  throwConflict,
  throwNotFound,
} from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { ERROR_REASONS } from "../../../../shared/constants/error-reasons";
import { ContextLogger } from "../../../../shared/logging/context-logger";
import { RequestContextService } from "../../../../shared/context/request-context.service";

@Injectable()
export class SubmitResignationRequestUseCase {
  private readonly logger: ContextLogger;

  constructor(
    private readonly employeesRepo: EmployeesRepository,
    private readonly scheduleTermination: ScheduleTerminationUseCase,
    private readonly workflowEngine: PlatformWorkflowEngineService,
    private readonly requestContext: RequestContextService,
  ) {
    this.logger = new ContextLogger(
      this.requestContext,
      SubmitResignationRequestUseCase.name,
    );
  }

  async execute(userId: string, dto: SubmitResignationDto) {
    const emp = await this.employeesRepo.findEmployeeByUserId(userId);
    if (!emp) {
      throwNotFound("Employee profile not found", ERROR_CODES.EMPLOYEE_NOT_FOUND, {
        userId,
      });
    }

    const today = todayDateString();
    if (dto.requestedLastWorkingDate < today) {
      throwBadRequest(
        "Requested last working date cannot be in the past",
        ERROR_CODES.INVALID_REQUEST,
        {
          reason: ERROR_REASONS.INVALID_STATE,
          requestedLastWorkingDate: dto.requestedLastWorkingDate,
        },
      );
    }

    const existingInstance =
      await this.workflowEngine.findActiveInstanceByKeyAndSubject(
        "employee_termination",
        "employee",
        emp.id,
      );
    if (existingInstance) {
      throwConflict(
        "An active resignation or scheduled termination already exists",
        ERROR_CODES.CONFLICT,
        {
          reason: ERROR_REASONS.INVALID_STATE,
          workflowInstanceId: existingInstance.id,
        },
      );
    }

    const formattedReason = `[Đơn xin thôi việc]: ${dto.reason.trim()}`;
    const result = await this.scheduleTermination.execute(emp.id, {
      effectiveDate: dto.requestedLastWorkingDate,
      lastWorkingDate: dto.requestedLastWorkingDate,
      reason: formattedReason,
    });

    this.logger.log({
      event: "employee.resignation_submitted",
      employeeId: emp.id,
      userId,
      requestedLastWorkingDate: dto.requestedLastWorkingDate,
      workflowInstanceId: result.workflowInstanceId,
    });

    return {
      ...result,
      requestedLastWorkingDate: dto.requestedLastWorkingDate,
    };
  }
}
