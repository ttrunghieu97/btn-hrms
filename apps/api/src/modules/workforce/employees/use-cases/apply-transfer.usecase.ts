import { Inject, Injectable, Optional } from "@nestjs/common";
import { todayDateString } from "../../../../shared/utils/date-format";
import { throwNotFound, throwBadRequest } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { RequestContextService } from "../../../../shared/context/request-context.service";
import { EventOutboxService } from "../../../../core/events/event-outbox.service";
import { PlatformWorkflowEngineService } from "../../../platform-workflow-engine/platform-workflow-engine.service";
import { EmployeesRepository } from "../repositories/employees.repository";
import { EmployeeTransferAppliedEvent } from "../../../../core/events/events/employee-transfer-applied.event";
import { EmployeeLifecycleService } from "../services/employee-lifecycle.service";
import { assertLifecycleOperation } from "../services/employee-lifecycle-state-machine";
import { EmployeeHierarchyGuard } from "../domain/employee-hierarchy.guard";
import { employeeStatusHistory, orgAssignments } from "../../../../infrastructure/database/schema/workforce/tables";
import { eq } from "drizzle-orm";
import { CONTRACTS_TOKENS } from "../../../../contracts/contracts.tokens";
import { type PositionReaderPort } from "../../../../contracts/ports/position-reader.port";

@Injectable()
export class ApplyTransferUseCase {
  constructor(
    private readonly employeesRepo: EmployeesRepository,
    private readonly requestContext: RequestContextService,
    private readonly eventOutbox: EventOutboxService,
    private readonly workflowEngine: PlatformWorkflowEngineService,
    private readonly lifecycle: EmployeeLifecycleService,
    @Optional()
    @Inject(CONTRACTS_TOKENS.POSITION_READER_PORT)
    private readonly positionsReader?: PositionReaderPort,
  ) {}

  async execute(instanceId: string, skipFutureCheck = false, expectedEmployeeId?: string) {
    const instance = await this.workflowEngine.getInstance(instanceId);
    if (!instance) throwNotFound("Transfer request not found", ERROR_CODES.INVALID_REQUEST, { instanceId });
    if (expectedEmployeeId && instance.subjectId !== expectedEmployeeId) {
      throwBadRequest("Transfer request does not belong to this employee", ERROR_CODES.INVALID_REQUEST, {
        instanceId,
        employeeId: expectedEmployeeId,
      });
    }
    if (instance.currentState !== "approved" || (instance.status !== "active" && !skipFutureCheck)) {
      throwBadRequest("Transfer not approved yet or already applied", ERROR_CODES.INVALID_REQUEST, {
        currentState: instance.currentState,
        status: instance.status,
      });
    }

    const metadata = (instance.metadata ?? {});
    const employeeId = instance.subjectId;
    const effectiveDate = (metadata.effectiveDate as string) ?? "";
    const today = todayDateString();

    if (!skipFutureCheck && effectiveDate > today) {
      throwBadRequest("Cannot apply transfer before effective date", ERROR_CODES.INVALID_REQUEST, { effectiveDate });
    }

    const emp =
      (typeof (this.employeesRepo as any).findByIdentifier === "function"
        ? await (this.employeesRepo as any).findByIdentifier(employeeId)
        : null) ??
      (typeof (this.employeesRepo as any).findEmployeeById === "function"
        ? await (this.employeesRepo as any).findEmployeeById(employeeId)
        : null);
    if (!emp) {
      throwNotFound("Employee not found", ERROR_CODES.EMPLOYEE_NOT_FOUND, { employeeId });
    }
    if (typeof (this.lifecycle as any).assertLifecycleOperation === "function") {
      (this.lifecycle as any).assertLifecycleOperation("apply_transfer", emp);
    } else if (typeof (this.lifecycle as any).assertCanApplyTransfer === "function") {
      (this.lifecycle as any).assertCanApplyTransfer(emp);
    } else {
      assertLifecycleOperation("apply_transfer", emp);
    }

    const toDepartmentId = (metadata.toDepartmentId as string) ?? "";
    const toPositionId = (metadata.toPositionId as string | null) ?? undefined;
    const toManagerEmployeeId = (metadata.toManagerEmployeeId as string | null) ?? null;
    let toJobTitle = (metadata.toJobTitle as string | null) ?? null;

    if (!toJobTitle && toPositionId) {
      const pos = this.positionsReader
        ? typeof (this.positionsReader as any).findPositionById === "function"
          ? await (this.positionsReader as any).findPositionById(toPositionId)
          : await this.positionsReader.findById(toPositionId)
        : typeof (this.lifecycle as any).findPositionById === "function"
          ? await (this.lifecycle as any).findPositionById(toPositionId)
          : null;
      toJobTitle = (pos as any)?.title ?? pos?.name ?? null;
    }

    // Re-validate org references at apply time (refs may have changed since approval)
    await this.lifecycle.assertOrgRefsAreValid({
      departmentId: toDepartmentId,
      ...(toPositionId ? { positionId: toPositionId } : {}),
      managerEmployeeId: toManagerEmployeeId,
    });
    await EmployeeHierarchyGuard.validateNoCycles({
      employeeId,
      managerId: toManagerEmployeeId,
      employeesRepo: this.employeesRepo,
    });

    const currentUser = this.requestContext.get();
    const currentStatus =
      (emp?.status as "working" | "probation" | "leave" | "suspended" | "retired" | "terminated" | undefined) ??
      "working";

    await this.employeesRepo.transaction(async (tx) => {
      const currentAssignment = await tx.query.orgAssignments.findFirst({
        where: (t: any, { eq, and }: any) => and(eq(t.employeeId, employeeId), eq(t.isCurrent, true), eq(t.assignmentType, "primary")),
      });

      if (currentAssignment) {
        await tx
          .update(orgAssignments)
          .set({ isCurrent: false, effectiveTo: effectiveDate, updatedAt: new Date() })
          .where(eq(orgAssignments.id, currentAssignment.id));
      }

      const [newAssignment] = await tx
        .insert(orgAssignments)
        .values({
          employeeId,
          departmentId: toDepartmentId,
          managerEmployeeId: toManagerEmployeeId,
          jobTitle: toJobTitle,
          assignmentType: "primary",
          isCurrent: true,
          effectiveFrom: effectiveDate,
        })
        .returning();

      if (typeof (this.employeesRepo as any).updateEmployeeById === "function") {
        await (this.employeesRepo as any).updateEmployeeById(
          employeeId,
          {
            departmentId: toDepartmentId || null,
            ...(newAssignment?.id ? { currentOrgAssignmentId: newAssignment.id } : {}),
          },
          tx,
        );
      }

      await tx.insert(employeeStatusHistory).values({
        employeeId,
        status: currentStatus,
        notes: `Transfer applied on ${effectiveDate}.${metadata.reason ? ` Reason: ${metadata.reason}` : ""}`,
        changedBy: currentUser?.userId ?? null,
      });

      await this.workflowEngine.updateInstance(instanceId, {
        currentState: "approved",
        status: "completed",
        completedAt: new Date(),
      });

      await this.eventOutbox.stage(
        new EmployeeTransferAppliedEvent({
          employeeId,
          appliedByUserId: currentUser?.userId ?? null,
          workflowInstanceId: instanceId,
          effectiveDate,
          toDepartmentId,
          fromOrgAssignmentId: currentAssignment?.id ?? "",
          toOrgAssignmentId: newAssignment?.id ?? "",
        }),
        tx,
      );
    });

    return { success: true, employeeId, effectiveDate };
  }
}
