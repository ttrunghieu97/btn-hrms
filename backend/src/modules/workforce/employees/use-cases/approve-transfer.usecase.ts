import { Injectable } from "@nestjs/common";
import { todayDateString } from "../../../../shared/utils/date-format";
import { throwNotFound, throwBadRequest } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { RequestContextService } from "../../../../shared/context/request-context.service";
import { EventOutboxService } from "../../../../core/events/event-outbox.service";
import { PlatformWorkflowEngineService } from "../../../platform-workflow-engine/platform-workflow-engine.service";
import { ApplyTransferUseCase } from "./apply-transfer.usecase";
import { EmployeeTransferApprovedEvent } from "../../../../core/events/events/employee-transfer-approved.event";

@Injectable()
export class ApproveTransferUseCase {
  constructor(
    private readonly requestContext: RequestContextService,
    private readonly eventOutbox: EventOutboxService,
    private readonly workflowEngine: PlatformWorkflowEngineService,
    private readonly applyTransfer: ApplyTransferUseCase,
  ) {}

  async execute(employeeId: string, instanceId: string, role: "manager" | "hr") {
    const instance = await this.workflowEngine.getInstance(instanceId);
    if (!instance) throwNotFound("Transfer request not found", ERROR_CODES.INVALID_REQUEST, { instanceId });
    if (instance.subjectId !== employeeId)
      throwBadRequest("Transfer request does not belong to this employee", ERROR_CODES.INVALID_REQUEST, { instanceId });
    if (instance.status !== "active")
      throwBadRequest("Transfer request is not active", ERROR_CODES.INVALID_REQUEST, { instanceId });

    const transition = role === "hr" ? "hr_approve" as const : "manager_approve" as const;
    if (role === "manager" && instance.currentState !== "manager_approval")
      throwBadRequest("Transfer not awaiting manager approval", ERROR_CODES.INVALID_REQUEST, { currentState: instance.currentState });
    if (role === "hr" && instance.currentState !== "hr_approval")
      throwBadRequest("Transfer not awaiting HR approval", ERROR_CODES.INVALID_REQUEST, { currentState: instance.currentState });

    const currentUser = this.requestContext.get();

    await this.workflowEngine.recordTransition({
      instanceId,
      fromState: instance.currentState,
      toState: transition === "manager_approve" ? "hr_approval" : "approved",
      transition,
      actorUserId: currentUser?.userId ?? null,
      payload: { approvedByUserId: currentUser?.userId ?? null },
    });

    await this.workflowEngine.updateInstance(instanceId, {
      currentState: transition === "manager_approve" ? "hr_approval" : "approved",
      ...(transition === "hr_approve" ? { status: "completed", completedAt: new Date() } : {}),
    });

    if (transition === "hr_approve") {
      const metadata = (instance.metadata ?? {});
      const effectiveDate = (metadata.effectiveDate as string) ?? "";
      const today = todayDateString();

      await this.applyTransfer.execute(instanceId, effectiveDate <= today);
    }

    return { success: true, role, newState: transition === "manager_approve" ? "hr_approval" : "approved" };
  }
}
