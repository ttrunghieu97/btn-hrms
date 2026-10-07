import { Injectable } from "@nestjs/common";
import { UpdateRequestDto } from "../dto/update-request.dto";
import { AssetRequestMapper } from "../mappers/asset-request.mapper";
import {
  AssetRequestRepository,
  type RequestValues,
} from "../repositories/asset-request.repository";
import {
  throwBadRequest,
  throwConflict,
  throwNotFound,
} from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { RequestContextService } from "../../../../shared/context/request-context.service";

@Injectable()
export class UpdateRequestUseCase {
  constructor(
    private readonly requestRepo: AssetRequestRepository,
    private readonly requestContext: RequestContextService,
  ) {}

  async execute(id: string, dto: UpdateRequestDto) {
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
        "Only draft requests can be edited",
        ERROR_CODES.ASSET_REQUEST_INVALID_STATUS,
        { id, status: existing.status },
      );
    }

    if (dto.lines) {
      if (dto.lines.length < 1) {
        throwBadRequest(
          "At least one request line is required",
          ERROR_CODES.ASSET_VALIDATION,
          { lines: dto.lines.length },
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
    }

    const actorUserId = this.requestContext.get()?.userId ?? null;
    const values: Partial<RequestValues> = {
      ...(dto.reason !== undefined ? { reason: dto.reason } : {}),
      ...(dto.neededBy !== undefined ? { neededBy: dto.neededBy } : {}),
      updatedBy: actorUserId,
    };

    const updated = await this.requestRepo.transaction(async (tx) => {
      await this.requestRepo.update(id, values, tx);
      if (dto.lines) {
        await this.requestRepo.replaceLines(
          id,
          dto.lines.map((line) => ({
            assetTypeId: line.assetTypeId,
            quantity: line.quantity,
            ...(line.note !== undefined ? { note: line.note } : {}),
          })),
          tx,
        );
      }
      return this.requestRepo.findById(id, tx);
    });

    return AssetRequestMapper.toResponse(updated!);
  }
}
