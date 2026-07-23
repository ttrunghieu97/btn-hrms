import { Injectable } from "@nestjs/common";
import { RegisterAssetDto } from "../dto/register-asset.dto";
import { AssetMapper } from "../mappers/asset.mapper";
import { AssetCatalogRepository } from "../repositories/asset-catalog.repository";
import { throwConflict, throwNotFound } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { RequestContextService } from "../../../../shared/context/request-context.service";

@Injectable()
export class RegisterAssetUseCase {
  constructor(
    private readonly catalogRepo: AssetCatalogRepository,
    private readonly requestContext: RequestContextService,
  ) {}

  async execute(dto: RegisterAssetDto) {
    const type = await this.catalogRepo.findTypeById(dto.assetTypeId);
    if (!type || type.deletedAt) {
      throwNotFound("Asset type not found", ERROR_CODES.ASSET_TYPE_NOT_FOUND, {
        assetTypeId: dto.assetTypeId,
      });
    }

    const existing = await this.catalogRepo.findAssetByCode(dto.code);
    if (existing) {
      throwConflict(
        "An asset with this code already exists",
        ERROR_CODES.ASSET_DUPLICATE_CODE,
        { code: dto.code },
      );
    }

    const actorUserId = this.requestContext.get()?.userId ?? null;

    const created = await this.catalogRepo.transaction(async (tx) => {
      const asset = await this.catalogRepo.createAsset(
        {
          assetTypeId: dto.assetTypeId,
          code: dto.code,
          name: dto.name,
          ...(dto.serialNumber !== undefined
            ? { serialNumber: dto.serialNumber }
            : {}),
          status: "available",
          ...(dto.purchaseDate !== undefined
            ? { purchaseDate: dto.purchaseDate }
            : {}),
          ...(dto.purchaseCost !== undefined
            ? { purchaseCost: dto.purchaseCost }
            : {}),
          ...(dto.currency !== undefined ? { currency: dto.currency } : {}),
          ...(dto.metadata !== undefined ? { metadata: dto.metadata } : {}),
          createdBy: actorUserId,
          updatedBy: actorUserId,
        },
        tx,
      );

      await this.catalogRepo.appendHistory(
        {
          kind: "created",
          assetId: asset!.id,
          assetTypeId: dto.assetTypeId,
          actorUserId,
          detail: { code: dto.code, name: dto.name },
        },
        tx,
      );

      return asset;
    });

    return AssetMapper.toResponse(created!);
  }
}
