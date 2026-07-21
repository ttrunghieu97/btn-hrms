import { Injectable } from "@nestjs/common";
import { CreateRequestDto } from "../dto/create-request.dto";
import { AssetRequestMapper } from "../mappers/asset-request.mapper";
import { AssetRequestRepository } from "../repositories/asset-request.repository";
import { throwBadRequest } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { RequestContextService } from "../../../../shared/context/request-context.service";

@Injectable()
export class CreateRequestUseCase {
  constructor(
    private readonly requestRepo: AssetRequestRepository,
    private readonly requestContext: RequestContextService,
  ) {}

  async execute(dto: CreateRequestDto) {
    if (!dto.lines || dto.lines.length < 1) {
      throwBadRequest(
        "At least one request line is required",
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

    const ctx = this.requestContext.get();
    const actorUserId = ctx?.userId ?? null;
    const requesterEmployeeId = dto.requesterEmployeeId ?? ctx?.employeeId ?? null;
    if (!requesterEmployeeId) {
      throwBadRequest(
        "A requester employee is required",
        ERROR_CODES.ASSET_VALIDATION,
      );
    }
    const created = await this.requestRepo.create(
      {
        requesterEmployeeId,
        status: "draft",
        ...(dto.reason !== undefined ? { reason: dto.reason } : {}),
        ...(dto.neededBy !== undefined ? { neededBy: dto.neededBy } : {}),
        createdBy: actorUserId,
        updatedBy: actorUserId,
      },
      dto.lines.map((line) => ({
        assetTypeId: line.assetTypeId,
        quantity: line.quantity,
        ...(line.note !== undefined ? { note: line.note } : {}),
      })),
    );

    return AssetRequestMapper.toResponse(created);
  }
}
