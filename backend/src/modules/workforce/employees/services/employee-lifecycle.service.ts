import { Injectable, Inject } from "@nestjs/common";
import { todayDateString } from "../../../../shared/utils/date-format";
import { EmployeesRepository } from "../repositories/employees.repository";
import { ChangeEmployeeStatusDto } from "../dto/change-employee-status.dto";
import { throwNotFound, throwBadRequest } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { ERROR_REASONS } from "../../../../shared/constants/error-reasons";
import { RequestContextService } from "../../../../shared/context/request-context.service";
import { EventOutboxService } from "../../../../core/events/event-outbox.service";
import { EmployeeStatusChangedEvent } from "../../../../core/events/events/employee-status-changed.event";
import { employeeStatusHistory, employmentRecords, orgAssignments, employeeContracts } from "../../../../infrastructure/database/schema/workforce/tables";
import { assertLifecycleOperation } from "./employee-lifecycle-state-machine";
import { CONTRACTS_TOKENS } from "../../../../contracts/contracts.tokens";
import { type DepartmentReaderPort } from "../../../../contracts/ports/department-reader.port";
import { type PositionReaderPort } from "../../../../contracts/ports/position-reader.port";

export interface TerminateInternalDto {
  reason: string;
  effectiveDate: string;
  lastWorkingDate?: string;
}

@Injectable()
export class EmployeeLifecycleService {
  constructor(
    private readonly employeesRepo: EmployeesRepository,
    private readonly requestContext: RequestContextService,
    private readonly eventOutbox: EventOutboxService,
    @Inject(CONTRACTS_TOKENS.DEPARTMENT_READER_PORT)
    private readonly departmentsReader: DepartmentReaderPort,
    @Inject(CONTRACTS_TOKENS.POSITION_READER_PORT)
    private readonly positionsReader: PositionReaderPort,
  ) {}

  // ─── Org Reference Validation ──────────────────────────────────────
  async assertOrgRefsAreValid(refs: {
    departmentId?: string | null;
    positionId?: string | null;
    managerEmployeeId?: string | null;
  }): Promise<void> {
    if (refs.departmentId) {
      const dept = await this.departmentsReader.findById(refs.departmentId);
      if (!dept) {
        throwBadRequest("Department not found", ERROR_CODES.INVALID_REQUEST, {
          departmentId: refs.departmentId,
        });
      }
      if ((dept as any).deletedAt) {
        throwBadRequest("Department is inactive", ERROR_CODES.INVALID_REQUEST, {
          departmentId: refs.departmentId,
        });
      }
    }

    if (refs.positionId) {
      const pos = await this.positionsReader.findById(refs.positionId);
      if (!pos) {
        throwBadRequest("Position not found", ERROR_CODES.INVALID_REQUEST, {
          positionId: refs.positionId,
        });
      }
      if ((pos as any).isActive === false) {
        throwBadRequest("Position is inactive", ERROR_CODES.INVALID_REQUEST, {
          positionId: refs.positionId,
        });
      }
    }

    if (refs.managerEmployeeId) {
      const mgr = await this.employeesRepo.findByIdentifier(refs.managerEmployeeId);
      if (!mgr) {
        throwBadRequest("Manager not found", ERROR_CODES.INVALID_REQUEST, {
          managerEmployeeId: refs.managerEmployeeId,
        });
      }
      if (mgr.deletedAt) {
        throwBadRequest("Manager is archived", ERROR_CODES.INVALID_REQUEST, {
          managerEmployeeId: refs.managerEmployeeId,
        });
      }
      if (mgr.status === "terminated") {
        throwBadRequest("Manager is terminated", ERROR_CODES.INVALID_REQUEST, {
          managerEmployeeId: refs.managerEmployeeId,
        });
      }
    }
  }

  assertCanRequestTransfer(emp: { status?: string | null; deletedAt?: unknown }): void {
    if (emp.deletedAt) {
      throwBadRequest("Cannot transfer archived employee", ERROR_CODES.INVALID_REQUEST, { reason: ERROR_REASONS.INVALID_STATE });
    }
    if (emp.status === "terminated" || emp.status === "retired") {
      throwBadRequest("Cannot transfer terminal employee", ERROR_CODES.INVALID_REQUEST, { reason: ERROR_REASONS.INVALID_STATE, status: emp.status });
    }
  }

  assertCanScheduleTermination(emp: { status?: string | null; deletedAt?: unknown }): void {
    if (emp.deletedAt) {
      throwBadRequest("Cannot terminate archived employee", ERROR_CODES.EMPLOYEE_ALREADY_TERMINATED, {
        reason: ERROR_REASONS.INVALID_STATE,
      });
    }
    if (emp.status === "terminated") {
      throwBadRequest("Employee already terminated", ERROR_CODES.EMPLOYEE_ALREADY_TERMINATED, {
        reason: ERROR_REASONS.INVALID_STATE,
      });
    }
  }

  async changeStatus(employeeId: string, dto: ChangeEmployeeStatusDto) {
    const employee = await this.employeesRepo.findById(employeeId);
    if (!employee) {
      throwNotFound("Employee not found", ERROR_CODES.EMPLOYEE_NOT_FOUND, {
        employeeId,
      });
    }

    const fromStatus = String(employee.status ?? "");
    const toStatus = dto.status;
    assertLifecycleOperation("change_status", employee, { toStatus });

    const effectiveDate = dto.effectiveDate ?? todayDateString();
    const currentUser = this.requestContext.get();

    await this.employeesRepo.transaction(async (tx) => {
      await this.employeesRepo.updateEmployeeById(
        employeeId,
        {
          status: toStatus,
          ...(toStatus !== "probation" ? { probationEndDate: null } : {}),
        },
        tx,
      );

      await tx.insert(employeeStatusHistory).values({
        employeeId,
        status: toStatus as "working" | "probation" | "terminated" | "leave" | "suspended" | "retired",
        notes: dto.reason ?? null,
        changedBy: currentUser?.userId ?? null,
      });

      await this.eventOutbox.stage(
        new EmployeeStatusChangedEvent({
          employeeId,
          fromStatus,
          toStatus,
          changedByUserId: currentUser?.userId ?? null,
          effectiveDate,
          reason: dto.reason ?? null,
        }),
        tx,
      );
    });

    return { success: true, status: toStatus };
  }

  /**
   * Execute immediate termination within an existing transaction.
   * Called by TerminateEmployeeUseCase. Does not stage events; caller manages outbox.
   */
  async executeImmediateTermination(
    employeeId: string,
    dto: TerminateInternalDto,
    actorUserId: string | null,
    tx: any,
  ) {
    await this.employeesRepo.updateEmployeeById(
      employeeId,
      {
        status: "terminated",
        endDate: dto.effectiveDate,
        lastWorkingDate: dto.lastWorkingDate ?? null,
        updatedAt: new Date(),
      },
      tx,
    );

    await tx.insert(employeeStatusHistory).values({
      employeeId,
      status: "terminated",
      notes: dto.reason ?? null,
      changedBy: actorUserId,
    });
  }

  /**
   * Restore an archived employee (undo soft-delete only; no status change).
   * Precondition: employee has `deletedAt` set.
   */
  async restoreArchive(
    employeeId: string,
    actorUserId: string | null,
    tx: any,
  ) {
    const emp = await this.employeesRepo.findByIdentifier(employeeId);
    if (!emp) {
      throwNotFound("Employee not found", ERROR_CODES.EMPLOYEE_NOT_FOUND, { employeeId });
    }
    assertLifecycleOperation("restore_archive", emp);

    await this.employeesRepo.restoreEmployee(employeeId, tx);

    await tx.insert(employeeStatusHistory).values({
      employeeId,
      status: emp.status ?? "working",
      notes: "Restored from archive",
      changedBy: actorUserId,
    });
  }

  /**
   * Rehire a terminated employee — creates new employment records, contract, org assignment.
   * Precondition: employee status is "terminated".
   */
  async rehire(
    employeeId: string,
    input: {
      hireDate: string;
      status?: "working" | "probation";
      departmentId?: string;
      positionId?: string;
      managerEmployeeId?: string;
      jobTitle?: string;
      contractType: string;
      contractStatus: string;
      reason?: string;
    },
    actorUserId: string | null,
    tx: any,
  ) {
    const emp = await this.employeesRepo.findByIdentifier(employeeId);
    if (!emp) {
      throwNotFound("Employee not found", ERROR_CODES.EMPLOYEE_NOT_FOUND, { employeeId });
    }
    assertLifecycleOperation("rehire", emp);

    const newStatus = input.status ?? "working";
    const hireDate = input.hireDate;

    // Clear archive if present
    if (emp.deletedAt) {
      await this.employeesRepo.restoreEmployee(employeeId, tx);
    }

    // Update employee main record
    await this.employeesRepo.updateEmployeeById(
      employeeId,
      {
        status: newStatus,
        startDate: hireDate,
        endDate: null,
        lastWorkingDate: null,
        probationEndDate: newStatus === "probation" ? null : null,
        updatedAt: new Date(),
      },
      tx,
    );

    // Create new employment record
    const [newEmployment] = await tx
      .insert(employmentRecords)
      .values({
        employeeId,
        startDate: hireDate,
        isCurrent: true,
        note: input.reason ?? "Rehired",
      })
      .returning();
    const newEmploymentId = newEmployment?.id;

    // Create new org assignment
    await tx.insert(orgAssignments).values({
      employeeId,
      departmentId: input.departmentId ?? null,
      managerEmployeeId: input.managerEmployeeId ?? null,
      jobTitle: input.jobTitle ?? null,
      assignmentType: "primary",
      isCurrent: true,
      effectiveFrom: hireDate,
    });

    // Create new contract
    await tx.insert(employeeContracts).values({
      employeeId,
      contractType: input.contractType,
      status: input.contractStatus,
      employmentRecordId: newEmploymentId ?? null,
      isCurrent: true,
      effectiveFrom: hireDate,
      version: 1,
    });

    // Link employment record to employee
    await this.employeesRepo.updateEmployeeById(
      employeeId,
      { currentEmploymentRecordId: newEmploymentId ?? null },
      tx,
    );

    // Insert status history
    await tx.insert(employeeStatusHistory).values({
      employeeId,
      status: newStatus,
      notes: `Rehired on ${hireDate}. ${input.reason ?? ""}`.trim(),
      changedBy: actorUserId,
    });

    return { employmentRecordId: newEmploymentId ?? "" };
  }
}
