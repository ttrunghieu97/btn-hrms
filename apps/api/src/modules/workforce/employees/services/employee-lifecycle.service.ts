import { Injectable, Inject } from "@nestjs/common";
import { and, desc, eq } from "drizzle-orm";
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

  assertCanImmediateTerminate(emp: { status?: string | null; deletedAt?: unknown }): void {
    if (emp.deletedAt) {
      throwBadRequest("Cannot terminate deleted employee", ERROR_CODES.EMPLOYEE_ALREADY_TERMINATED, {
        reason: ERROR_REASONS.INVALID_STATE,
      });
    }
    if (emp.status === "terminated" || emp.status === "retired") {
      throwBadRequest("Employee already terminated", ERROR_CODES.EMPLOYEE_ALREADY_TERMINATED, {
        reason: ERROR_REASONS.INVALID_STATE,
        status: emp.status,
      });
    }
  }

  assertLifecycleOperation(
    operation: Parameters<typeof assertLifecycleOperation>[0],
    emp: Parameters<typeof assertLifecycleOperation>[1],
    opts?: Parameters<typeof assertLifecycleOperation>[2],
  ): void {
    assertLifecycleOperation(operation, emp, opts);
  }

  async findPositionById(positionId: string) {
    if (!this.positionsReader) return null;
    if (typeof (this.positionsReader as any).findPositionById === "function") {
      return (this.positionsReader as any).findPositionById(positionId);
    }
    if (typeof this.positionsReader.findById === "function") {
      return this.positionsReader.findById(positionId);
    }
    return null;
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
   * Called by TerminateEmployeeUseCase and ExecuteScheduledTerminationsUseCase.
   * Closes current employment_records and org_assignments so subsequent rehire will not hit unique constraints.
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
        currentEmploymentRecordId: null,
        currentOrgAssignmentId: null,
        updatedAt: new Date(),
      },
      tx,
    );

    if (typeof tx?.update === "function") {
      await tx
        .update(employmentRecords)
        .set({
          isCurrent: false,
          endDate: dto.effectiveDate,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(employmentRecords.employeeId, employeeId),
            eq(employmentRecords.isCurrent, true),
          ),
        );

      await tx
        .update(orgAssignments)
        .set({
          isCurrent: false,
          effectiveTo: dto.effectiveDate,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(orgAssignments.employeeId, employeeId),
            eq(orgAssignments.isCurrent, true),
          ),
        );
    }

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
    assertLifecycleOperation("rehire", emp);

    const newStatus = input.status ?? "working";
    const hireDate = input.hireDate;

    let resolvedJobTitle = input.jobTitle ?? null;
    if (!resolvedJobTitle && input.positionId) {
      const pos = await this.findPositionById(input.positionId);
      resolvedJobTitle = (pos as any)?.title ?? pos?.name ?? null;
    }

    // Clear archive if present
    if (emp.deletedAt) {
      await this.employeesRepo.restoreEmployee(employeeId, tx);
    }

    // Defensively close any lingering isCurrent=true records/assignments/contracts
    let nextContractVersion = 1;
    if (typeof tx?.update === "function") {
      await tx
        .update(employmentRecords)
        .set({ isCurrent: false, endDate: hireDate, updatedAt: new Date() })
        .where(
          and(
            eq(employmentRecords.employeeId, employeeId),
            eq(employmentRecords.isCurrent, true),
          ),
        );

      await tx
        .update(orgAssignments)
        .set({ isCurrent: false, effectiveTo: hireDate, updatedAt: new Date() })
        .where(
          and(
            eq(orgAssignments.employeeId, employeeId),
            eq(orgAssignments.isCurrent, true),
          ),
        );

      await tx
        .update(employeeContracts)
        .set({ isCurrent: false, updatedAt: new Date() })
        .where(
          and(
            eq(employeeContracts.employeeId, employeeId),
            eq(employeeContracts.isCurrent, true),
          ),
        );
    }

    if (typeof tx?.select === "function") {
      const existingContracts = await tx
        .select({ version: employeeContracts.version })
        .from(employeeContracts)
        .where(eq(employeeContracts.employeeId, employeeId))
        .orderBy(desc(employeeContracts.version))
        .limit(1);
      const maxVersion = existingContracts?.[0]?.version ?? 0;
      nextContractVersion = maxVersion + 1;
    }

    // Update employee main record
    await this.employeesRepo.updateEmployeeById(
      employeeId,
      {
        status: newStatus,
        ...(input.departmentId !== undefined ? { departmentId: input.departmentId ?? null } : {}),
        startDate: hireDate,
        endDate: null,
        lastWorkingDate: null,
        probationEndDate: null,
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
    const orgInsertQuery = tx.insert(orgAssignments).values({
      employeeId,
      departmentId: input.departmentId ?? null,
      managerEmployeeId: input.managerEmployeeId ?? null,
      jobTitle: resolvedJobTitle,
      assignmentType: "primary",
      isCurrent: true,
      effectiveFrom: hireDate,
    });
    const newOrgRows =
      typeof orgInsertQuery?.returning === "function"
        ? await orgInsertQuery.returning()
        : await orgInsertQuery;
    const newOrgAssignmentId = Array.isArray(newOrgRows) ? newOrgRows[0]?.id : undefined;

    // Create new contract with incremented version
    await tx.insert(employeeContracts).values({
      employeeId,
      contractType: input.contractType,
      status: input.contractStatus,
      employmentRecordId: newEmploymentId ?? null,
      isCurrent: true,
      effectiveFrom: hireDate,
      version: nextContractVersion,
    });

    // Link employment record & org assignment to employee
    await this.employeesRepo.updateEmployeeById(
      employeeId,
      {
        currentEmploymentRecordId: newEmploymentId ?? null,
        ...(newOrgAssignmentId ? { currentOrgAssignmentId: newOrgAssignmentId } : {}),
      },
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
