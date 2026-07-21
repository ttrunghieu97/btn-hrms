import { Injectable, Optional } from "@nestjs/common";
import { IssueAssetDto } from "../dto/issue-asset.dto";
import { AssetIssueMapper } from "../mappers/asset-issue.mapper";
import {
  AssetIssueRepository,
  type HistoryEntryValues,
} from "../repositories/asset-issue.repository";
import { AssetRequestRepository } from "../../request/repositories/asset-request.repository";
import { FinalizeAttachmentBindingUseCase } from "../../../storage/use-cases/finalize-attachment-binding.usecase";
import {
  throwBadRequest,
  throwConflict,
  throwNotFound,
} from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { EventOutboxService } from "../../../../core/events/event-outbox.service";
import { RequestContextService } from "../../../../shared/context/request-context.service";
import {
  AssetAssignedEvent,
  type AssetIssueItemSnapshot,
} from "../../../../core/events/events/asset-assigned.event";

@Injectable()
export class IssueAssetUseCase {
  constructor(
    private readonly issueRepo: AssetIssueRepository,
    private readonly requestRepo: AssetRequestRepository,
    private readonly eventOutbox: EventOutboxService,
    private readonly requestContext: RequestContextService,
    @Optional()
    private readonly finalizeAttachmentBinding?: FinalizeAttachmentBindingUseCase,
  ) {}

  async execute(dto: IssueAssetDto) {
    if (!dto.lines || dto.lines.length < 1) {
      throwBadRequest(
        "At least one issue line is required",
        ERROR_CODES.ASSET_VALIDATION,
        { lines: dto.lines?.length ?? 0 },
      );
    }
    for (const line of dto.lines) {
      if (line.quantity < 1) {
        throwBadRequest(
          "Line quantity must be at least 1",
          ERROR_CODES.ASSET_VALIDATION,
          { assetTypeId: line.assetTypeId, quantity: line.quantity },
        );
      }
    }

    const actorUserId = this.requestContext.get()?.userId ?? null;
    const issuedAt = new Date();
    const requestId = dto.requestId ?? null;

    const result = await this.issueRepo.transaction(async (tx) => {
      // Validate originating request when present.
      if (requestId) {
        const request = await this.requestRepo.findById(requestId, tx);
        if (!request) {
          throwNotFound(
            "Asset request not found",
            ERROR_CODES.ASSET_REQUEST_NOT_FOUND,
            { requestId },
          );
        }
        if (request.status !== "approved") {
          throwConflict(
            "Only approved requests can be fulfilled",
            ERROR_CODES.ASSET_REQUEST_NOT_APPROVED,
            { requestId, status: request.status },
          );
        }
      }

      const issue = await this.issueRepo.createIssue(
        {
          employeeId: dto.employeeId,
          requestId,
          issuedByUserId: actorUserId,
          issuedAt,
          ...(dto.note !== undefined ? { note: dto.note } : {}),
          createdBy: actorUserId,
          updatedBy: actorUserId,
        },
        tx,
      );

      const snapshots: AssetIssueItemSnapshot[] = [];

      for (const line of dto.lines) {
        let assetName: string | null = null;
        let assetTag: string | null = null;
        let serialNumber: string | null = null;

        if (line.assetId) {
          // SERIALIZED unit.
          const asset = await this.issueRepo.findAsset(line.assetId, tx);
          if (!asset) {
            throwNotFound("Asset not found", ERROR_CODES.ASSET_NOT_FOUND, {
              assetId: line.assetId,
            });
          }
          if (asset.status !== "available") {
            throwConflict(
              "Asset is not available for issue",
              ERROR_CODES.ASSET_NOT_AVAILABLE,
              { assetId: line.assetId, status: asset.status },
            );
          }
          await this.issueRepo.setAssetStatus(
            line.assetId,
            "assigned",
            actorUserId,
            tx,
          );
          assetName = asset.name;
          assetTag = asset.code;
          serialNumber = asset.serialNumber;
        } else {
          // QUANTITY / consumable stock.
          const decremented = await this.issueRepo.decrementStock(
            line.assetTypeId,
            line.quantity,
            tx,
          );
          if (!decremented) {
            throwConflict(
              "Insufficient stock for the requested quantity",
              ERROR_CODES.ASSET_INSUFFICIENT_STOCK,
              { assetTypeId: line.assetTypeId, quantity: line.quantity },
            );
          }
        }

        const issueLine = await this.issueRepo.createLine(
          {
            issueId: issue.id,
            ...(line.assetId ? { assetId: line.assetId } : {}),
            assetTypeId: line.assetTypeId,
            quantity: line.quantity,
            status: "open",
            ...(line.note !== undefined ? { note: line.note } : {}),
          },
          tx,
        );

        const historyEntry: HistoryEntryValues = {
          kind: "issued",
          ...(line.assetId ? { assetId: line.assetId } : {}),
          assetTypeId: line.assetTypeId,
          issueId: issue.id,
          issueLineId: issueLine.id,
          employeeId: dto.employeeId,
          // Serialized units are a single tracked asset; quantity lines draw
          // down stock, recorded as a negative delta.
          quantityDelta: line.assetId ? null : -line.quantity,
          occurredAt: issuedAt,
          actorUserId,
        };
        await this.issueRepo.appendHistory(historyEntry, tx);

        snapshots.push({
          issueLineId: issueLine.id,
          assetId: line.assetId ?? null,
          assetTypeId: line.assetTypeId,
          assetName,
          assetTag,
          serialNumber,
          quantity: line.quantity,
        });
      }

      // Fulfil the originating request inside the same transaction.
      if (requestId) {
        await this.requestRepo.markFulfilled(
          requestId,
          issuedAt,
          actorUserId,
          tx,
        );
      }

      await this.eventOutbox.stage(
        new AssetAssignedEvent({
          idempotencyKey: `${issue.id}:asset.assigned`,
          issueId: issue.id,
          employeeId: dto.employeeId,
          requestId,
          issuedByUserId: actorUserId,
          issuedAt: issuedAt.toISOString(),
          items: snapshots,
        }),
        tx,
      );

      return issue.id;
    });

    // Finalize the optional handover attachment after the tx commits. The issue
    // is already durable; a missing attachment must never roll it back.
    if (dto.handoverFileToken && this.finalizeAttachmentBinding) {
      await this.finalizeAttachmentBinding.execute({
        fileToken: dto.handoverFileToken,
        ownerType: "employee",
        ownerId: dto.employeeId,
        purpose: "document",
      });
    }

    const created = await this.issueRepo.findById(result);
    return AssetIssueMapper.toResponse(created!);
  }
}
