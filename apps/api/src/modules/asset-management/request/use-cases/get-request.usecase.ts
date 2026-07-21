import { Injectable } from "@nestjs/common";
import { AssetRequestMapper } from "../mappers/asset-request.mapper";
import { AssetRequestRepository } from "../repositories/asset-request.repository";
import { throwNotFound } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";

@Injectable()
export class GetRequestUseCase {
  constructor(private readonly requestRepo: AssetRequestRepository) {}

  async execute(id: string) {
    const row = await this.requestRepo.findById(id);
    if (!row) {
      throwNotFound(
        "Asset request not found",
        ERROR_CODES.ASSET_REQUEST_NOT_FOUND,
        { id },
      );
    }
    return AssetRequestMapper.toResponse(row);
  }
}
