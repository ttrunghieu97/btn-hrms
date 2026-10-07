import { Inject, Injectable } from "@nestjs/common";
import { throwBadRequest, throwNotFound } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { EmployeesRepository } from "../../employees/repositories/employees.repository";
import { EmployeeContractsRepository } from "../../employee-contracts/repositories/employee-contracts.repository";
import { EmployeeTerminatedEvent } from "../../../../core/events/events/employee-terminated.event";
import { EventOutboxService } from "../../../../core/events/event-outbox.service";
import { RequestContextService } from "../../../../shared/context/request-context.service";

import { employeeStatusHistory } from "../../../../infrastructure/database/schema/workforce/tables";
import { EmployeeLifecycleService } from "../../employees/services/employee-lifecycle.service";

export interface TerminateEmployeeDto {
  reason: string;
  effectiveDate: string;
  lastWorkingDate?: string;
}

@Injectable()
export class TerminateEmployeeUseCase {
  constructor(
    private readonly employeeRepo: EmployeesRepository,
    private readonly contractRepo: EmployeeContractsRepository,
    private readonly lifecycle: EmployeeLifecycleService,
    private readonly eventOutbox: EventOutboxService,
    private readonly requestContext: RequestContextService,
  ) {}

  async execute(employeeId: string, dto: TerminateEmployeeDto) {
    const emp = await this.employeeRepo.findById(employeeId);
    if (!emp)
      throwNotFound("Employee not found", ERROR_CODES.EMPLOYEE_NOT_FOUND, {
        employeeId,
      });

    if (emp.deletedAt) {
      throwBadRequest(
        "Cannot terminate deleted employee",
        ERROR_CODES.EMPLOYEE_ALREADY_TERMINATED,
        { employeeId },
      );
    }

    const termDateStr = dto.effectiveDate;
    const endDateStr = (emp.endDate as string | null | undefined) ?? null;
    const isAlreadyTerminated =
      (endDateStr !== null && endDateStr < termDateStr) ||
      emp.status === "terminated";
    if (isAlreadyTerminated)
      throwBadRequest(
        "Employee already terminated",
        ERROR_CODES.EMPLOYEE_ALREADY_TERMINATED,
        { employeeId },
      );

    const userId = emp.userId as string | undefined;
    if (!userId) {
      throwNotFound(
        "Employee has no linked user account",
        ERROR_CODES.EMPLOYEE_NOT_FOUND,
        { employeeId },
      );
    }

    const currentUser = this.requestContext.get();

    await this.employeeRepo.transaction(async (tx) => {
      // Use lifecycle service for status mutation (handles status + history)
      await this.lifecycle.executeImmediateTermination(
        employeeId,
        dto,
        currentUser?.userId ?? null,
        tx,
      );

      // Close active contract
      const activeContract = await this.contractRepo.getCurrent(
        employeeId,
        tx,
      );
      if (activeContract) {
        await this.contractRepo.update(
          activeContract.id,
          {
            isCurrent: false,
            status: "terminated",
            effectiveTo: termDateStr,
          },
          tx,
        );
      }

      // Stage termination event (identity module handles deactivation via event)
      const event = new EmployeeTerminatedEvent({
        employeeId,
        terminatedByUserId: currentUser?.userId ?? null,
        effectiveDate: termDateStr,
        reason: dto.reason,
      });

      await this.eventOutbox.stage(event, tx);
    });
  }
}
