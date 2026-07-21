import { Injectable } from "@nestjs/common";
import { AssetRequestMapper } from "../mappers/asset-request.mapper";
import { AssetRequestRepository } from "../repositories/asset-request.repository";
import { throwConflict, throwNotFound } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { EventOutboxService } from "../../../../core/events/event-outbox.service";
import { RequestContextService } from "../../../../shared/context/request-context.service";
import { AssetRequestApprovalRequestedEvent } from "../../../../core/events/events/asset-request-approval-requested.event";

@Injectable()
export class SubmitRequestUseCase {
  constructor(
    private readonly requestRepo: AssetRequestRepository,
    private readonly eventOutbox: EventOutboxService,
    private readonly requestContext: RequestContextService,
  ) {}

  async execute(id: string) {
    const existing = await this.requestRepo.findById(id);
    if (!existing) {
      throwNotFound(
        "Asset request not found",
        ERROR_CODES.ASSET_REQUEST_NOT_FOUND,
        { id },
      );
    }
    if (existing.status !== "draft") {
      throwConflict(
        "Only draft requests can be submitted for approval",
        ERROR_CODES.ASSET_REQUEST_INVALID_STATUS,
        { id, status: existing.status },
      );
    }

    const actorUserId = this.requestContext.get()?.userId ?? null;
    const submittedAt = new Date();

    const updated = await this.requestRepo.transaction(async (tx) => {
      await this.requestRepo.updateStatus(
        id,
        { status: "pending_approval", submittedAt, updatedBy: actorUserId },
        tx,
      );
      await this.eventOutbox.stage(
        new AssetRequestApprovalRequestedEvent({
          idempotencyKey: `${id}:asset.request.approval.requested`,
          requestId: id,
          requesterEmployeeId: existing.requesterEmployeeId,
          requestedByUserId: actorUserId,
          requestedAt: submittedAt.toISOString(),
        }),
        tx,
      );
      return this.requestRepo.findById(id, tx);
    });

    return AssetRequestMapper.toResponse(updated!);
  }
}
