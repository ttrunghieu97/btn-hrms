import { Injectable } from "@nestjs/common";
import { EmployeesRepository } from "../repositories/employees.repository";
import { throwNotFound, throwBadRequest } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { RequestContextService } from "../../../../shared/context/request-context.service";
import { EventOutboxService } from "../../../../core/events/event-outbox.service";
import { EmployeeTerminationScheduledEvent } from "../../../../core/events/events/employee-termination-scheduled.event";
import { PlatformWorkflowEngineService } from "../../../platform-workflow-engine/platform-workflow-engine.service";
import { EmployeeLifecycleService } from "../services/employee-lifecycle.service";

export interface ScheduleTerminationInput {
  effectiveDate: string;
  reason: string;
  lastWorkingDate?: string;
}

@Injectable()
export class ScheduleTerminationUseCase {
  constructor(
    private readonly employeesRepo: EmployeesRepository,
    private readonly lifecycle: EmployeeLifecycleService,
    private readonly requestContext: RequestContextService,
    private readonly eventOutbox: EventOutboxService,
    private readonly workflowEngine: PlatformWorkflowEngineService,
  ) {}

  async execute(employeeId: string, input: ScheduleTerminationInput) {
    const emp = await this.employeesRepo.findByIdentifier(employeeId);
    if (!emp) {
      throwNotFound("Employee not found", ERROR_CODES.EMPLOYEE_NOT_FOUND, { employeeId });
    }

    if (emp.deletedAt) {
      throwBadRequest("Cannot schedule termination for deleted employee", ERROR_CODES.INVALID_REQUEST, { employeeId });
    }

    // Lifecycle service validates employee is in a terminable state
    this.lifecycle.assertCanScheduleTermination(emp);

    const currentUser = this.requestContext.get();

    // Start workflow instance
    const instance = await this.workflowEngine.startWorkflow({
      key: "employee_termination",
      subjectType: "employee",
      subjectId: employeeId,
      actorUserId: currentUser?.userId ?? null,
      metadata: {
        effectiveDate: input.effectiveDate,
        reason: input.reason,
        lastWorkingDate: input.lastWorkingDate ?? null,
        scheduledByUserId: currentUser?.userId ?? null,
      },
    });

    await this.employeesRepo.transaction(async (tx) => {
      await this.eventOutbox.stage(
        new EmployeeTerminationScheduledEvent({
          employeeId,
          scheduledByUserId: currentUser?.userId ?? null,
          effectiveDate: input.effectiveDate,
          reason: input.reason,
          lastWorkingDate: input.lastWorkingDate ?? null,
          workflowInstanceId: instance.id,
        }),
        tx,
      );
    });

    return {
      success: true,
      workflowInstanceId: instance.id,
      effectiveDate: input.effectiveDate,
    };
  }
}
