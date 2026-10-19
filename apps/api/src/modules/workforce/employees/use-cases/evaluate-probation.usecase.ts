import { Injectable } from "@nestjs/common";
import { EmployeesRepository } from "../repositories/employees.repository";
import { EvaluateProbationDto } from "../dto/evaluate-probation.dto";
import { EmployeeLifecycleService } from "../services/employee-lifecycle.service";
import { ScheduleTerminationUseCase } from "./schedule-termination.usecase";
import { TerminateEmployeeUseCase } from "../../application/use-cases/terminate-employee.usecase";
import { todayDateString } from "../../../../shared/utils/date-format";
import { throwBadRequest, throwNotFound } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { ERROR_REASONS } from "../../../../shared/constants/error-reasons";
import { RequestContextService } from "../../../../shared/context/request-context.service";
import { ContextLogger } from "../../../../shared/logging/context-logger";

@Injectable()
export class EvaluateProbationUseCase {
  private readonly logger: ContextLogger;

  constructor(
    private readonly employeesRepo: EmployeesRepository,
    private readonly lifecycle: EmployeeLifecycleService,
    private readonly scheduleTermination: ScheduleTerminationUseCase,
    private readonly terminateEmployee: TerminateEmployeeUseCase,
    private readonly requestContext: RequestContextService,
  ) {
    this.logger = new ContextLogger(this.requestContext, EvaluateProbationUseCase.name);
  }

  async execute(employeeId: string, dto: EvaluateProbationDto) {
    const emp = await this.employeesRepo.findByIdentifier(employeeId);
    if (!emp) {
      throwNotFound("Employee not found", ERROR_CODES.EMPLOYEE_NOT_FOUND, {
        employeeId,
      });
    }

    if (emp.deletedAt || emp.status !== "probation") {
      throwBadRequest(
        "Only employees currently in probation can be evaluated",
        ERROR_CODES.INVALID_REQUEST,
        {
          reason: ERROR_REASONS.INVALID_STATE,
          employeeId,
          currentStatus: emp.status ?? null,
        },
      );
    }

    const today = todayDateString();
    const effectiveDate = dto.effectiveDate ?? today;
    const currentUser = this.requestContext.get();

    if (dto.decision === "confirm") {
      await this.lifecycle.changeStatus(employeeId, {
        status: "working",
        effectiveDate,
        reason:
          dto.notes?.trim() ||
          `Đạt thử việc — chuyển chính thức từ ngày ${effectiveDate}`,
      });

      this.logger.log({
        event: "employee.probation_confirmed",
        employeeId,
        effectiveDate,
      });

      return {
        success: true,
        decision: "confirm" as const,
        status: "working",
        effectiveDate,
      };
    }

    if (dto.decision === "extend") {
      if (!dto.newProbationEndDate) {
        throwBadRequest(
          "newProbationEndDate is required when extending probation",
          ERROR_CODES.INVALID_REQUEST,
          {
            reason: ERROR_REASONS.INVALID_STATE,
            employeeId,
          },
        );
      }

      if (emp.probationEndDate && dto.newProbationEndDate <= emp.probationEndDate) {
        throwBadRequest(
          "New probation end date must be after current probation end date",
          ERROR_CODES.INVALID_REQUEST,
          {
            reason: ERROR_REASONS.INVALID_STATE,
            currentProbationEndDate: emp.probationEndDate,
            newProbationEndDate: dto.newProbationEndDate,
          },
        );
      }

      await this.employeesRepo.transaction(async (tx) => {
        await this.employeesRepo.updateEmployeeById(
          employeeId,
          {
            probationEndDate: dto.newProbationEndDate,
            endDate: dto.newProbationEndDate,
            updatedAt: new Date(),
          },
          tx,
        );

        await this.employeesRepo.insertStatusHistory(
          {
            employeeId,
            status: "probation",
            notes:
              dto.notes?.trim() ||
              `Gia hạn thử việc đến ngày ${dto.newProbationEndDate}`,
            changedBy: currentUser?.userId ?? null,
          },
          tx,
        );
      });

      this.logger.log({
        event: "employee.probation_extended",
        employeeId,
        newProbationEndDate: dto.newProbationEndDate,
      });

      return {
        success: true,
        decision: "extend" as const,
        status: "probation",
        probationEndDate: dto.newProbationEndDate,
      };
    }

    const reason =
      dto.notes?.trim() || `Không đạt thử việc (ngày hiệu lực: ${effectiveDate})`;
    if (effectiveDate > today) {
      await this.scheduleTermination.execute(employeeId, {
        effectiveDate,
        reason,
        lastWorkingDate: effectiveDate,
      });
    } else {
      await this.terminateEmployee.execute(employeeId, {
        effectiveDate,
        reason,
        lastWorkingDate: effectiveDate,
      });
    }

    this.logger.log({
      event: "employee.probation_failed",
      employeeId,
      effectiveDate,
    });

    return {
      success: true,
      decision: "fail" as const,
      status: effectiveDate > today ? "probation" : "terminated",
      effectiveDate,
    };
  }
}
