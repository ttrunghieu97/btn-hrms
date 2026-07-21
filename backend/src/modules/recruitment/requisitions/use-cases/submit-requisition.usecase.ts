import { Injectable } from "@nestjs/common";
import { RequisitionMapper } from "../mappers/requisition.mapper";
import { RequisitionsRepository } from "../repositories/requisitions.repository";
import { throwConflict, throwNotFound } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { EventOutboxService } from "../../../../core/events/event-outbox.service";
import { RequestContextService } from "../../../../shared/context/request-context.service";
import { RequisitionApprovalRequestedEvent } from "../../../../core/events/events/requisition-approval-requested.event";

@Injectable()
export class SubmitRequisitionUseCase {
  constructor(
    private readonly requisitionsRepo: RequisitionsRepository,
    private readonly eventOutbox: EventOutboxService,
    private readonly requestContext: RequestContextService,
  ) {}

  async execute(id: string) {
    const existing = await this.requisitionsRepo.findById(id);
    if (!existing) {
      throwNotFound(
        "Requisition not found",
        ERROR_CODES.RECRUITMENT_REQUISITION_NOT_FOUND,
        { id },
      );
    }
    if (existing.status !== "draft") {
      throwConflict(
        "Only draft requisitions can be submitted",
        ERROR_CODES.RECRUITMENT_INVALID_STATUS,
        { id, status: existing.status },
      );
    }

    const actorUserId = this.requestContext.get()?.userId ?? null;
    const updated = await this.requisitionsRepo.transaction(async (tx) => {
      const row = await this.requisitionsRepo.updateStatus(
        id,
        "pending_approval",
        tx,
      );
      await this.eventOutbox.stage(
        new RequisitionApprovalRequestedEvent({
          idempotencyKey: `${id}:recruitment.requisition.approval.requested`,
          requisitionId: id,
          departmentId: existing.departmentId,
          requestedByUserId: actorUserId,
          requestedAt: new Date().toISOString(),
        }),
        tx,
      );
      return row;
    });

    return RequisitionMapper.toResponse(updated!);
  }
}
