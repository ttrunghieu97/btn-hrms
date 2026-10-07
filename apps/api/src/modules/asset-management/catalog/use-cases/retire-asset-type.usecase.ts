import { Injectable } from "@nestjs/common";
import { AssetTypeMapper } from "../mappers/asset.mapper";
import { AssetCatalogRepository } from "../repositories/asset-catalog.repository";
import { throwNotFound } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { RequestContextService } from "../../../../shared/context/request-context.service";

@Injectable()
export class RetireAssetTypeUseCase {
  constructor(
    private readonly catalogRepo: AssetCatalogRepository,
    private readonly requestContext: RequestContextService,
  ) {}

  async execute(id: string) {
    const existing = await this.catalogRepo.findTypeById(id);
    if (!existing || existing.deletedAt) {
      throwNotFound("Asset type not found", ERROR_CODES.ASSET_TYPE_NOT_FOUND, {
        id,
      });
    }

    const actorUserId = this.requestContext.get()?.userId ?? null;
    const updated = await this.catalogRepo.updateType(id, {
      deletedAt: new Date(),
      updatedBy: actorUserId,
    });

    return AssetTypeMapper.toResponse(updated!);
  }
}
