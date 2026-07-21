import { Injectable } from "@nestjs/common";
import { AssetRequestMapper } from "../mappers/asset-request.mapper";
import { AssetRequestRepository } from "../repositories/asset-request.repository";
import { TransactionRunner } from "../../../../infrastructure/database/transaction-runner";
import { throwConflict, throwNotFound } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { RequestContextService } from "../../../../shared/context/request-context.service";

const CANCELLABLE_STATUSES = ["draft", "pending_approval"] as const;

@Injectable()
export class CancelRequestUseCase {
  constructor(
    private readonly requestRepo: AssetRequestRepository,
    private readonly requestContext: RequestContextService,
    private readonly tx: TransactionRunner,
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
    if (
      !CANCELLABLE_STATUSES.includes(
        existing.status as (typeof CANCELLABLE_STATUSES)[number],
      )
    ) {
      throwConflict(
        "Only draft or pending requests can be cancelled",
        ERROR_CODES.ASSET_REQUEST_INVALID_STATUS,
        { id, status: existing.status },
      );
    }

    const actorUserId = this.requestContext.get()?.userId ?? null;

    return this.tx.run(async (tx) => {
      await this.requestRepo.updateStatus(id, {
        status: "cancelled",
        updatedBy: actorUserId,
      }, tx);
      const updated = await this.requestRepo.findById(id, tx);
      return AssetRequestMapper.toResponse(updated!);
    });
  }
}
