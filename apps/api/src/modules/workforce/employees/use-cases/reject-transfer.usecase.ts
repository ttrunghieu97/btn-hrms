import { Injectable } from "@nestjs/common";
import { throwNotFound, throwBadRequest, throwForbidden } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { ERROR_REASONS } from "../../../../shared/constants/error-reasons";
import { RequestContextService } from "../../../../shared/context/request-context.service";
import { EmployeesRepository } from "../repositories/employees.repository";
import { PlatformWorkflowEngineService } from "../../../platform-workflow-engine/platform-workflow-engine.service";
import { EmployeeTransferCancelledEvent } from "../../../../core/events/events/employee-transfer-cancelled.event";
import { EventOutboxService } from "../../../../core/events/event-outbox.service";
import type { AuthUser } from "../../../../core/security/types/auth-user.interface";

@Injectable()
export class RejectTransferUseCase {
  constructor(
    private readonly requestContext: RequestContextService,
    private readonly employeesRepo: EmployeesRepository,
    private readonly workflowEngine: PlatformWorkflowEngineService,
    private readonly eventOutbox: EventOutboxService,
  ) {}

  async execute(employeeId: string, instanceId: string, note?: string, actor?: AuthUser) {
    const instance = await this.workflowEngine.getInstance(instanceId);
    if (!instance) throwNotFound("Transfer request not found", ERROR_CODES.INVALID_REQUEST, { instanceId });
    if (instance.subjectId !== employeeId)
      throwBadRequest("Transfer request does not belong to this employee", ERROR_CODES.INVALID_REQUEST, { instanceId });
    if (instance.status !== "active")
      throwBadRequest("Transfer request is not active", ERROR_CODES.INVALID_REQUEST, { instanceId });
    if (!["manager_approval", "hr_approval"].includes(instance.currentState)) {
      throwBadRequest(
        "Transfer request is not awaiting approval",
        ERROR_CODES.INVALID_REQUEST,
        { instanceId, currentState: instance.currentState },
      );
    }

    const currentUser = this.requestContext.get();
    const effectivePerms = actor?.permissions ?? currentUser?.permissions;
    const isSuperAdmin = actor?.isSuperAdmin === true || currentUser?.isSuperAdmin === true;

    if (instance.currentState === "hr_approval" && (effectivePerms !== undefined || actor !== undefined)) {
      const perms = effectivePerms ?? [];
      const canHrReject =
        isSuperAdmin ||
        perms.includes("sys:all") ||
        perms.includes("employee:manage") ||
        perms.includes("employees:manage");
      if (!canHrReject) {
        throwForbidden(
          "Only HR can reject a transfer at the HR approval stage",
          ERROR_CODES.PERMISSION_DENIED,
          {
            reason: ERROR_REASONS.MISSING_PERMISSION,
            instanceId,
            currentState: instance.currentState,
          },
        );
      }
    }

    await this.workflowEngine.recordTransition({
      instanceId,
      fromState: instance.currentState,
      toState: "rejected",
      transition: "reject",
      actorUserId: currentUser?.userId ?? null,
      payload: { note: note ?? null, rejectedByUserId: currentUser?.userId ?? null },
    });

    await this.workflowEngine.updateInstance(instanceId, {
      currentState: "rejected",
      status: "completed",
      completedAt: new Date(),
    });

    await this.employeesRepo.transaction(async (tx) => {
      await this.eventOutbox.stage(
        new EmployeeTransferCancelledEvent({
          employeeId,
          cancelledByUserId: currentUser?.userId ?? null,
          workflowInstanceId: instanceId,
          reason: note ?? "Transfer rejected",
        }),
        tx,
      );
    });

    return { success: true, status: "rejected" };
  }
}
