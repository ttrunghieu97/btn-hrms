import { Injectable } from "@nestjs/common";
import { EmployeesRepository } from "../repositories/employees.repository";
import { throwNotFound, throwBadRequest } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { RequestContextService } from "../../../../shared/context/request-context.service";
import { EventOutboxService } from "../../../../core/events/event-outbox.service";
import { EmployeeTerminationCancelledEvent } from "../../../../core/events/events/employee-termination-cancelled.event";
import { PlatformWorkflowEngineService } from "../../../platform-workflow-engine/platform-workflow-engine.service";

@Injectable()
export class CancelScheduledTerminationUseCase {
  constructor(
    private readonly employeesRepo: EmployeesRepository,
    private readonly requestContext: RequestContextService,
    private readonly eventOutbox: EventOutboxService,
    private readonly workflowEngine: PlatformWorkflowEngineService,
  ) {}

  async execute(employeeId: string) {
    const emp = await this.employeesRepo.findByIdentifier(employeeId);
    if (!emp) {
      throwNotFound("Employee not found", ERROR_CODES.EMPLOYEE_NOT_FOUND, { employeeId });
    }

    const instance = await this.workflowEngine.findActiveInstanceByKeyAndSubject(
      "employee_termination",
      "employee",
      employeeId,
    );

    if (!instance) {
      throwBadRequest("No pending scheduled termination for employee", ERROR_CODES.INVALID_REQUEST, { employeeId });
    }

    const currentUser = this.requestContext.get();

    await this.employeesRepo.transaction(async (tx) => {
      await this.workflowEngine.cancelInstance(
        instance.id,
        currentUser?.userId ?? null,
        { cancelledByUserId: currentUser?.userId ?? null },
      );

      await this.eventOutbox.stage(
        new EmployeeTerminationCancelledEvent({
          employeeId,
          cancelledByUserId: currentUser?.userId ?? null,
          reason: "Scheduled termination cancelled by user",
          workflowInstanceId: instance.id,
        }),
        tx,
      );
    });

    return { success: true };
  }
}
