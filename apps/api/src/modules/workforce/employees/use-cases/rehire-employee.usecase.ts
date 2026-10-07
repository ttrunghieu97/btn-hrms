import { Injectable, Inject } from "@nestjs/common";
import { EmployeesRepository } from "../repositories/employees.repository";
import { throwNotFound, throwBadRequest } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { RequestContextService } from "../../../../shared/context/request-context.service";
import { EventOutboxService } from "../../../../core/events/event-outbox.service";
import { CONTRACTS_TOKENS } from "../../../../contracts/contracts.tokens";
import { type IdentityAdminPort } from "../../../../contracts/ports/identity-admin.port";
import { EmployeeLifecycleService } from "../services/employee-lifecycle.service";
import { EmployeeHierarchyGuard } from "../domain/employee-hierarchy.guard";
import { EmployeeRehiredEvent } from "../../../../core/events/events/employee-rehired.event";
import { RehireEmployeeDto } from "../dto/rehire-employee.dto";

@Injectable()
export class RehireEmployeeUseCase {
  constructor(
    private readonly employeesRepo: EmployeesRepository,
    private readonly lifecycle: EmployeeLifecycleService,
    private readonly requestContext: RequestContextService,
    private readonly eventOutbox: EventOutboxService,
    @Inject(CONTRACTS_TOKENS.IDENTITY_ADMIN_PORT)
    private readonly identityAdmin: IdentityAdminPort,
  ) {}

  async execute(employeeId: string, dto: RehireEmployeeDto) {
    const emp = await this.employeesRepo.findByIdentifier(employeeId);
    if (!emp) {
      throwNotFound("Employee not found", ERROR_CODES.EMPLOYEE_NOT_FOUND, { employeeId });
    }

    // Validate org refs and manager hierarchy before rehire
    await this.lifecycle.assertOrgRefsAreValid({
      departmentId: dto.departmentId,
      positionId: dto.positionId,
      managerEmployeeId: dto.managerEmployeeId,
    });
    await EmployeeHierarchyGuard.validateNoCycles({
      employeeId,
      managerId: dto.managerEmployeeId,
      employeesRepo: this.employeesRepo,
    });

    if (emp.status !== "terminated") {
      throwBadRequest("Only terminated employees can be rehired", ERROR_CODES.INVALID_REQUEST, {
        employeeId,
        currentStatus: emp.status,
      });
    }

    const userId = emp.userId as string | undefined;
    const currentUser = this.requestContext.get();

    let newEmploymentRecordId = "";

    await this.employeesRepo.transaction(async (tx) => {
      const result = await this.lifecycle.rehire(
        employeeId,
        {
          hireDate: dto.hireDate,
          status: dto.status,
          departmentId: dto.departmentId,
          positionId: dto.positionId,
          managerEmployeeId: dto.managerEmployeeId,
          jobTitle: dto.jobTitle,
          contractType: dto.contractType,
          contractStatus: dto.contractStatus,
          reason: dto.reason,
        },
        currentUser?.userId ?? null,
        tx,
      );
      newEmploymentRecordId = result.employmentRecordId;

      // Reactivate identity if previously deactivated
      if (userId) {
        await this.identityAdmin.reactivateUser(userId, tx);
      }

      // Stage event
      await this.eventOutbox.stage(
        new EmployeeRehiredEvent({
          employeeId,
          rehiredByUserId: currentUser?.userId ?? null,
          hireDate: dto.hireDate,
          status: dto.status ?? "working",
          departmentId: dto.departmentId ?? null,
          positionId: dto.positionId ?? null,
          newEmploymentRecordId,
        }),
        tx,
      );
    });

    return {
      success: true,
      employeeId,
      status: dto.status ?? "working",
      employmentRecordId: newEmploymentRecordId,
    };
  }
}
