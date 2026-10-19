import { Injectable, Inject, Optional } from "@nestjs/common";
import { EmployeesRepository } from "../repositories/employees.repository";
import { throwNotFound, throwBadRequest } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { RequestContextService } from "../../../../shared/context/request-context.service";
import { EventOutboxService } from "../../../../core/events/event-outbox.service";
import { CONTRACTS_TOKENS } from "../../../../contracts/contracts.tokens";
import { type IdentityAdminPort } from "../../../../contracts/ports/identity-admin.port";
import { type PositionReaderPort } from "../../../../contracts/ports/position-reader.port";
import { EmployeeLifecycleService } from "../services/employee-lifecycle.service";
import { EmployeeHierarchyGuard } from "../domain/employee-hierarchy.guard";
import { EmployeeRehiredEvent } from "../../../../core/events/events/employee-rehired.event";
import { RehireEmployeeDto } from "../dto/rehire-employee.dto";
import { StorageService } from "../../../../infrastructure/storage/storage.service";
import { ContextLogger } from "../../../../shared/logging/context-logger";

@Injectable()
export class RehireEmployeeUseCase {
  private readonly logger: ContextLogger;

  constructor(
    private readonly employeesRepo: EmployeesRepository,
    private readonly lifecycle: EmployeeLifecycleService,
    private readonly requestContext: RequestContextService,
    private readonly eventOutbox: EventOutboxService,
    @Inject(CONTRACTS_TOKENS.IDENTITY_ADMIN_PORT)
    private readonly identityAdmin: IdentityAdminPort,
    @Optional() private readonly storage?: StorageService,
    @Optional()
    @Inject(CONTRACTS_TOKENS.POSITION_READER_PORT)
    private readonly positionsReader?: PositionReaderPort,
  ) {
    this.logger = new ContextLogger(this.requestContext, RehireEmployeeUseCase.name);
  }

  async execute(employeeId: string, dto: RehireEmployeeDto) {
    const emp =
      (typeof this.employeesRepo.findEmployeeById === "function"
        ? await this.employeesRepo.findEmployeeById(employeeId)
        : null) ??
      (typeof this.employeesRepo.findDeletedEmployeeById === "function"
        ? await this.employeesRepo.findDeletedEmployeeById(employeeId)
        : null) ??
      (typeof this.employeesRepo.findByIdentifier === "function"
        ? await this.employeesRepo.findByIdentifier(employeeId)
        : null);
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

    let resolvedJobTitle = dto.jobTitle;
    if (!resolvedJobTitle && dto.positionId && this.positionsReader) {
      const pos =
        typeof (this.positionsReader as any).findPositionById === "function"
          ? await (this.positionsReader as any).findPositionById(dto.positionId)
          : await this.positionsReader.findById(dto.positionId);
      resolvedJobTitle = (pos as any)?.title ?? pos?.name ?? undefined;
    }

    const userId = emp.userId as string | undefined;
    const wasArchived = Boolean(emp.deletedAt);
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
          jobTitle: resolvedJobTitle,
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

    if (wasArchived && this.storage) {
      try {
        await this.storage.restoreOwnerFiles("employee", emp.id);
      } catch (err: any) {
        this.logger.error({
          event: "file.restore.rehire_fail",
          employeeId: emp.id,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return {
      success: true,
      employeeId,
      status: dto.status ?? "working",
      employmentRecordId: newEmploymentRecordId,
    };
  }
}
