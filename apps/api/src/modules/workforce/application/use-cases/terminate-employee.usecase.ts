import { Inject, Injectable, Optional } from "@nestjs/common";
import { throwBadRequest, throwNotFound } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { EmployeesRepository } from "../../employees/repositories/employees.repository";
import { EmployeeContractsRepository } from "../../employee-contracts/repositories/employee-contracts.repository";
import { EmployeeTerminatedEvent } from "../../../../core/events/events/employee-terminated.event";
import { EventOutboxService } from "../../../../core/events/event-outbox.service";
import { RequestContextService } from "../../../../shared/context/request-context.service";
import { CONTRACTS_TOKENS } from "../../../../contracts/contracts.tokens";
import { type IdentityAdminPort } from "../../../../contracts/ports/identity-admin.port";
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
    @Optional()
    @Inject(CONTRACTS_TOKENS.IDENTITY_ADMIN_PORT)
    private readonly identityAdmin?: IdentityAdminPort,
  ) {}

  async execute(employeeId: string, dto: TerminateEmployeeDto) {
    const emp = await this.employeeRepo.findById(employeeId);
    if (!emp)
      throwNotFound("Employee not found", ERROR_CODES.EMPLOYEE_NOT_FOUND, {
        employeeId,
      });

    if (typeof this.lifecycle.assertCanImmediateTerminate === "function") {
      this.lifecycle.assertCanImmediateTerminate(emp);
    } else if (emp.deletedAt) {
      throwBadRequest(
        "Cannot terminate deleted employee",
        ERROR_CODES.EMPLOYEE_ALREADY_TERMINATED,
        { employeeId },
      );
    } else if (emp.status === "terminated" || emp.status === "retired") {
      throwBadRequest(
        "Employee already terminated",
        ERROR_CODES.EMPLOYEE_ALREADY_TERMINATED,
        { employeeId },
      );
    }

    const termDateStr = dto.effectiveDate;
    const endDateStr = (emp.endDate as string | null | undefined) ?? null;
    if (endDateStr !== null && endDateStr < termDateStr) {
      throwBadRequest(
        "Employee already terminated",
        ERROR_CODES.EMPLOYEE_ALREADY_TERMINATED,
        { employeeId },
      );
    }

    if (dto.lastWorkingDate && dto.lastWorkingDate > dto.effectiveDate) {
      throwBadRequest(
        "Last working date cannot be after effective date",
        ERROR_CODES.VALIDATION_ERROR,
        {
          employeeId,
          lastWorkingDate: dto.lastWorkingDate,
          effectiveDate: dto.effectiveDate,
        },
      );
    }

    const userId = emp.userId as string | null | undefined;
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

      if (userId && this.identityAdmin) {
        if (typeof (this.identityAdmin as any).deactivateUserAndRevokeSessions === "function") {
          await (this.identityAdmin as any).deactivateUserAndRevokeSessions(userId, tx);
        } else {
          await this.identityAdmin.deactivateUser(userId, tx);
        }
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
