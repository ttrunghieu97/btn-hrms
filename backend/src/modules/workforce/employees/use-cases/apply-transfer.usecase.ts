import { Injectable } from "@nestjs/common";
import { todayDateString } from "../../../../shared/utils/date-format";
import { throwNotFound, throwBadRequest } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { RequestContextService } from "../../../../shared/context/request-context.service";
import { EventOutboxService } from "../../../../core/events/event-outbox.service";
import { PlatformWorkflowEngineService } from "../../../platform-workflow-engine/platform-workflow-engine.service";
import { EmployeesRepository } from "../repositories/employees.repository";
import { EmployeeTransferAppliedEvent } from "../../../../core/events/events/employee-transfer-applied.event";
import { EmployeeStatusChangedEvent } from "../../../../core/events/events/employee-status-changed.event";
import { EmployeeLifecycleService } from "../services/employee-lifecycle.service";
import { EmployeeHierarchyGuard } from "../domain/employee-hierarchy.guard";
import { employeeStatusHistory, orgAssignments } from "../../../../infrastructure/database/schema/workforce/tables";
import { eq, and } from "drizzle-orm";

@Injectable()
export class ApplyTransferUseCase {
  constructor(
    private readonly employeesRepo: EmployeesRepository,
    private readonly requestContext: RequestContextService,
    private readonly eventOutbox: EventOutboxService,
    private readonly workflowEngine: PlatformWorkflowEngineService,
    private readonly lifecycle: EmployeeLifecycleService,
  ) {}

  async execute(instanceId: string, skipFutureCheck = false) {
    const instance = await this.workflowEngine.getInstance(instanceId);
    if (!instance) throwNotFound("Transfer request not found", ERROR_CODES.INVALID_REQUEST, { instanceId });
    if (instance.status !== "active" && instance.currentState !== "approved") {
      throwBadRequest("Transfer not approved yet", ERROR_CODES.INVALID_REQUEST, { currentState: instance.currentState });
    }

    const metadata = (instance.metadata ?? {});
    const employeeId = instance.subjectId;
    const effectiveDate = (metadata.effectiveDate as string) ?? "";
    const today = todayDateString();

    if (!skipFutureCheck && effectiveDate > today) {
      throwBadRequest("Cannot apply transfer before effective date", ERROR_CODES.INVALID_REQUEST, { effectiveDate });
    }

    const toDepartmentId = (metadata.toDepartmentId as string) ?? "";
    const toManagerEmployeeId = (metadata.toManagerEmployeeId as string | null) ?? null;
    const toJobTitle = (metadata.toJobTitle as string | null) ?? null;

    // Re-validate org references at apply time (refs may have changed since approval)
    await this.lifecycle.assertOrgRefsAreValid({
      departmentId: toDepartmentId,
      managerEmployeeId: toManagerEmployeeId,
    });
    await EmployeeHierarchyGuard.validateNoCycles({
      employeeId,
      managerId: toManagerEmployeeId,
      employeesRepo: this.employeesRepo,
    });

    const currentUser = this.requestContext.get();

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

      await tx.insert(employeeStatusHistory).values({
        employeeId,
        status: "working",
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
