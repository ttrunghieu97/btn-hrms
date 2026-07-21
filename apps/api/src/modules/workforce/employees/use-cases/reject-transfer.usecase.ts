import { Injectable } from "@nestjs/common";
import { throwNotFound, throwBadRequest } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { RequestContextService } from "../../../../shared/context/request-context.service";
import { EmployeesRepository } from "../repositories/employees.repository";
import { PlatformWorkflowEngineService } from "../../../platform-workflow-engine/platform-workflow-engine.service";
import { EmployeeTransferCancelledEvent } from "../../../../core/events/events/employee-transfer-cancelled.event";
import { EventOutboxService } from "../../../../core/events/event-outbox.service";

@Injectable()
export class RejectTransferUseCase {
  constructor(
    private readonly requestContext: RequestContextService,
    private readonly employeesRepo: EmployeesRepository,
    private readonly workflowEngine: PlatformWorkflowEngineService,
    private readonly eventOutbox: EventOutboxService,
  ) {}

  async execute(employeeId: string, instanceId: string, note?: string) {
    const instance = await this.workflowEngine.getInstance(instanceId);
    if (!instance) throwNotFound("Transfer request not found", ERROR_CODES.INVALID_REQUEST, { instanceId });
    if (instance.subjectId !== employeeId)
      throwBadRequest("Transfer request does not belong to this employee", ERROR_CODES.INVALID_REQUEST, { instanceId });
    if (instance.status !== "active")
      throwBadRequest("Transfer request is not active", ERROR_CODES.INVALID_REQUEST, { instanceId });

    const currentUser = this.requestContext.get();

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
