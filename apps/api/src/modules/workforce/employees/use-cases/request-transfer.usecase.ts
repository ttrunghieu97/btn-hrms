import { Injectable } from "@nestjs/common";
import { EmployeesRepository } from "../repositories/employees.repository";
import { throwNotFound, throwBadRequest } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { RequestContextService } from "../../../../shared/context/request-context.service";
import { EventOutboxService } from "../../../../core/events/event-outbox.service";
import { EmployeeLifecycleService } from "../services/employee-lifecycle.service";
import { EmployeeHierarchyGuard } from "../domain/employee-hierarchy.guard";
import { PlatformWorkflowEngineService } from "../../../platform-workflow-engine/platform-workflow-engine.service";
import { RequestTransferDto } from "../dto/request-transfer.dto";
import { EmployeeTransferRequestedEvent } from "../../../../core/events/events/employee-transfer-requested.event";

@Injectable()
export class RequestTransferUseCase {
  constructor(
    private readonly employeesRepo: EmployeesRepository,
    private readonly lifecycle: EmployeeLifecycleService,
    private readonly requestContext: RequestContextService,
    private readonly eventOutbox: EventOutboxService,
    private readonly workflowEngine: PlatformWorkflowEngineService,
  ) {}

  async execute(employeeId: string, dto: RequestTransferDto) {
    const emp = await this.employeesRepo.findByIdentifier(employeeId);
    if (!emp) throwNotFound("Employee not found", ERROR_CODES.EMPLOYEE_NOT_FOUND, { employeeId });
    if (emp.deletedAt || emp.status === "terminated")
      throwBadRequest("Cannot transfer terminated/archived employee", ERROR_CODES.INVALID_REQUEST, { employeeId });

    // Lifecycle guard: request_transfer operation
    this.lifecycle.assertCanRequestTransfer(emp);

    // Validate org refs and manager hierarchy before starting workflow
    await this.lifecycle.assertOrgRefsAreValid({
      departmentId: dto.toDepartmentId,
      positionId: dto.toPositionId,
    });
    await EmployeeHierarchyGuard.validateNoCycles({
      employeeId,
      managerId: dto.toManagerEmployeeId,
      employeesRepo: this.employeesRepo,
    });

    const currentUser = this.requestContext.get();

    const instance = await this.workflowEngine.startWorkflow({
      key: "transfer",
      subjectType: "employee_transfer",
      subjectId: employeeId,
      actorUserId: currentUser?.userId ?? null,
      metadata: {
        employeeId,
        toDepartmentId: dto.toDepartmentId,
        toPositionId: dto.toPositionId ?? null,
        toManagerEmployeeId: dto.toManagerEmployeeId ?? null,
        toJobTitle: dto.toJobTitle ?? null,
        effectiveDate: dto.effectiveDate,
        reason: dto.reason ?? null,
        requestedByUserId: currentUser?.userId ?? null,
      },
    });

    // Transition initiated -> manager_approval
    await this.workflowEngine.transition(instance.id, "submit", currentUser?.userId ?? null);

    await this.employeesRepo.transaction(async (tx) => {
      await this.eventOutbox.stage(
        new EmployeeTransferRequestedEvent({
          employeeId,
          requestedByUserId: currentUser?.userId ?? null,
          effectiveDate: dto.effectiveDate,
          toDepartmentId: dto.toDepartmentId,
          toPositionId: dto.toPositionId ?? null,
          toManagerEmployeeId: dto.toManagerEmployeeId ?? null,
          reason: dto.reason ?? null,
          workflowInstanceId: instance.id,
        }),
        tx,
      );
    });

    return {
      success: true,
      workflowInstanceId: instance.id,
      status: "pending_approval",
    };
  }
}
