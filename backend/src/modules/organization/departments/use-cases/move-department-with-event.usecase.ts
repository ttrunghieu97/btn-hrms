import { Injectable } from "@nestjs/common";
import { throwNotFound } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { DepartmentsRepository } from "../repositories/departments.repository";
import { DepartmentMovedEvent } from "../../../workforce/domain/events/department-moved.event";
import { EventOutboxService } from "../../../../core/events/event-outbox.service";
import { ContextLogger } from "../../../../shared/logging/context-logger";
import { RequestContextService } from "../../../../shared/context/request-context.service";

@Injectable()
export class MoveDepartmentWithEventUseCase {
  private readonly logger: ContextLogger;
  constructor(
    private readonly departmentRepo: DepartmentsRepository,
    private readonly eventOutbox: EventOutboxService,
    private readonly requestContext: RequestContextService,
  ) {
    this.logger = new ContextLogger(this.requestContext, MoveDepartmentWithEventUseCase.name);
  }

  async execute(
    departmentId: string,
    newParentId: string,
    effectiveDate: Date = new Date(),
  ) {
    const currentDept = await this.departmentRepo.findById(departmentId);
    if (!currentDept) {
      throwNotFound("Department not found", ERROR_CODES.DEPARTMENT_NOT_FOUND, {
        departmentId,
      });
    }

    const oldParentId = currentDept.parentId;
    if (oldParentId === newParentId) {
      return;
    }

    await this.departmentRepo.transaction(async (tx) => {
      await this.departmentRepo.update(departmentId, { parentId: newParentId }, tx);

      const event = new DepartmentMovedEvent({
        departmentId,
        oldParentId: oldParentId || undefined,
        newParentId,
        effectiveDate: effectiveDate.toISOString(),
      });

      await this.eventOutbox.stage(event, tx);
    });
  }
}
