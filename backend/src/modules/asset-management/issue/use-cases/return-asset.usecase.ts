import { Injectable } from "@nestjs/common";
import { ReturnAssetDto } from "../dto/return-asset.dto";
import { AssetIssueMapper } from "../mappers/asset-issue.mapper";
import {
  AssetIssueRepository,
  type HistoryEntryValues,
} from "../repositories/asset-issue.repository";
import {
  throwBadRequest,
  throwConflict,
  throwNotFound,
} from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { EventOutboxService } from "../../../../core/events/event-outbox.service";
import { RequestContextService } from "../../../../shared/context/request-context.service";
import {
  AssetReturnedEvent,
  type AssetReturnedItemSnapshot,
} from "../../../../core/events/events/asset-returned.event";

@Injectable()
export class ReturnAssetUseCase {
  constructor(
    private readonly issueRepo: AssetIssueRepository,
    private readonly eventOutbox: EventOutboxService,
    private readonly requestContext: RequestContextService,
  ) {}

  async execute(dto: ReturnAssetDto) {
    const line = await this.issueRepo.findLineById(dto.issueLineId);
    if (!line) {
      throwNotFound(
        "Issue line not found",
        ERROR_CODES.ASSET_ISSUE_NOT_FOUND,
        { issueLineId: dto.issueLineId },
      );
    }
    if (line.status !== "open") {
      throwConflict(
        "Issue line is not open",
        ERROR_CODES.ASSET_INVALID_STATUS,
        { issueLineId: dto.issueLineId, status: line.status },
      );
    }

    const isSerialized = line.assetId !== null;
    const returnQuantity = dto.quantity ?? line.quantity;
    if (returnQuantity < 1 || returnQuantity > line.quantity) {
      throwBadRequest(
        "Return quantity must be between 1 and the remaining line quantity",
        ERROR_CODES.ASSET_VALIDATION,
        {
          issueLineId: dto.issueLineId,
          quantity: returnQuantity,
          remaining: line.quantity,
        },
      );
    }
    if (isSerialized && returnQuantity !== line.quantity) {
      throwBadRequest(
        "Serialized assets must be returned in full",
        ERROR_CODES.ASSET_VALIDATION,
        { issueLineId: dto.issueLineId },
      );
    }

    const actorUserId = this.requestContext.get()?.userId ?? null;
    const returnedAt = new Date();
    const isFullReturn = returnQuantity === line.quantity;

    const issue = await this.issueRepo.transaction(async (tx) => {
      const issueRow = await this.issueRepo.findById(line.issueId, tx);
      if (!issueRow) {
        throwNotFound("Asset issue not found", ERROR_CODES.ASSET_ISSUE_NOT_FOUND, {
          issueId: line.issueId,
        });
      }

      if (isSerialized) {
        await this.issueRepo.setAssetStatus(
          line.assetId!,
          "available",
          actorUserId,
          tx,
        );
      } else {
        await this.issueRepo.incrementStock(
          line.assetTypeId,
          returnQuantity,
          tx,
        );
      }

      if (isFullReturn) {
        await this.issueRepo.closeLine(
          line.id,
          {
            status: "returned",
            returnedAt,
            returnedToUserId: dto.returnedToUserId ?? null,
            condition: dto.condition ?? null,
          },
          tx,
        );
      } else {
        // Partial quantity return: draw down the open line's remaining quantity.
        await this.issueRepo.closeLine(
          line.id,
          { quantity: line.quantity - returnQuantity },
          tx,
        );
      }

      const historyEntry: HistoryEntryValues = {
        kind: "returned",
        ...(line.assetId ? { assetId: line.assetId } : {}),
        assetTypeId: line.assetTypeId,
        issueId: line.issueId,
        issueLineId: line.id,
        employeeId: issueRow.employeeId,
        quantityDelta: isSerialized ? null : returnQuantity,
        occurredAt: returnedAt,
        actorUserId,
      };
      await this.issueRepo.appendHistory(historyEntry, tx);

      const items: AssetReturnedItemSnapshot[] = [
        {
          issueLineId: line.id,
          assetId: line.assetId ?? null,
          assetTypeId: line.assetTypeId,
          quantity: returnQuantity,
        },
      ];

      await this.eventOutbox.stage(
        new AssetReturnedEvent({
          idempotencyKey: `${line.id}:asset.returned`,
          issueId: line.issueId,
          employeeId: issueRow.employeeId,
          returnedByUserId: actorUserId,
          returnedAt: returnedAt.toISOString(),
          items,
        }),
        tx,
      );

      return this.issueRepo.findById(line.issueId, tx);
    });

    return AssetIssueMapper.toResponse(issue!);
  }
}
