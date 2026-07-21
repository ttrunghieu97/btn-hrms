import { Injectable } from "@nestjs/common";
import {
  ChangeAssetStatusDto,
  type AssetStatusTarget,
} from "../dto/change-asset-status.dto";
import { AssetMapper } from "../mappers/asset.mapper";
import {
  AssetCatalogRepository,
  type AssetStatus,
  type AssetHistoryKind,
} from "../repositories/asset-catalog.repository";
import { throwConflict, throwNotFound } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { RequestContextService } from "../../../../shared/context/request-context.service";

// Terminal states can never transition out.
const TERMINAL_STATUSES: ReadonlySet<AssetStatus> = new Set<AssetStatus>([
  "retired",
  "lost",
]);

// Statuses from which a manual change is allowed (assigned is issue-managed).
const CHANGEABLE_FROM: ReadonlySet<AssetStatus> = new Set<AssetStatus>([
  "available",
  "maintenance",
]);

@Injectable()
export class ChangeAssetStatusUseCase {
  constructor(
    private readonly catalogRepo: AssetCatalogRepository,
    private readonly requestContext: RequestContextService,
  ) {}

  async execute(id: string, dto: ChangeAssetStatusDto) {
    const existing = await this.catalogRepo.findAssetById(id);
    if (!existing || existing.deletedAt) {
      throwNotFound("Asset not found", ERROR_CODES.ASSET_NOT_FOUND, { id });
    }

    const current = existing.status;
    const target = dto.status;

    if (TERMINAL_STATUSES.has(current)) {
      throwConflict(
        `Asset is in a terminal state (${current}) and cannot change status`,
        ERROR_CODES.ASSET_INVALID_STATUS,
        { id, current, target },
      );
    }

    if (!CHANGEABLE_FROM.has(current)) {
      throwConflict(
        `Asset status ${current} cannot be changed here`,
        ERROR_CODES.ASSET_INVALID_STATUS,
        { id, current, target },
      );
    }

    if (current === target) {
      throwConflict(
        `Asset is already ${target}`,
        ERROR_CODES.ASSET_INVALID_STATUS,
        { id, current, target },
      );
    }

    const actorUserId = this.requestContext.get()?.userId ?? null;
    const historyKind = this.historyKindFor(target);

    const updated = await this.catalogRepo.transaction(async (tx) => {
      const row = await this.catalogRepo.updateAsset(
        id,
        { status: target, updatedBy: actorUserId },
        tx,
      );

      await this.catalogRepo.appendHistory(
        {
          kind: historyKind,
          assetId: id,
          assetTypeId: existing.assetTypeId,
          actorUserId,
          detail: {
            from: current,
            to: target,
            ...(dto.note !== undefined ? { note: dto.note } : {}),
          },
        },
        tx,
      );

      return row;
    });

    return AssetMapper.toResponse(updated!);
  }

  private historyKindFor(target: AssetStatusTarget): AssetHistoryKind {
    if (target === "retired" || target === "lost") return "disposed";
    if (target === "maintenance") return "maintenance";
    // Returning to available from maintenance is recorded as a maintenance event.
    return "maintenance";
  }
}
