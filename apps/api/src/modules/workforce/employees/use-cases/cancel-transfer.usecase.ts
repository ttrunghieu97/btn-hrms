import { Injectable } from "@nestjs/common";
import { throwNotFound, throwBadRequest } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { RequestContextService } from "../../../../shared/context/request-context.service";
import { EventOutboxService } from "../../../../core/events/event-outbox.service";
import { PlatformWorkflowEngineService } from "../../../platform-workflow-engine/platform-workflow-engine.service";
import { EmployeeTransferCancelledEvent } from "../../../../core/events/events/employee-transfer-cancelled.event";

@Injectable()
export class CancelTransferUseCase {
  constructor(
    private readonly requestContext: RequestContextService,
    private readonly workflowEngine: PlatformWorkflowEngineService,
    private readonly eventOutbox: EventOutboxService,
  ) {}

  async execute(employeeId: string, instanceId: string, reason?: string) {
    const instance = await this.workflowEngine.getInstance(instanceId);
    if (!instance) throwNotFound("Transfer request not found", ERROR_CODES.INVALID_REQUEST, { instanceId });
    if (instance.subjectId !== employeeId)
      throwBadRequest("Transfer request does not belong to this employee", ERROR_CODES.INVALID_REQUEST, { instanceId });
    if (instance.status !== "active")
      throwBadRequest("Transfer request is not active", ERROR_CODES.INVALID_REQUEST, { instanceId, status: instance.status });

    const currentUser = this.requestContext.get();

    await this.workflowEngine.recordTransition({
      instanceId,
      fromState: instance.currentState,
      toState: "rejected",
      transition: "reject",
      actorUserId: currentUser?.userId ?? null,
      payload: { reason: reason ?? "Cancelled", cancelledByUserId: currentUser?.userId ?? null },
    });

    await this.workflowEngine.updateInstance(instanceId, {
      currentState: "rejected",
      status: "completed",
      completedAt: new Date(),
    });

    await this.eventOutbox.stage(
      new EmployeeTransferCancelledEvent({
        employeeId,
        cancelledByUserId: currentUser?.userId ?? null,
        workflowInstanceId: instanceId,
        reason: reason ?? "Cancelled",
      }),
    );

    return { success: true, status: "cancelled" };
  }
}
