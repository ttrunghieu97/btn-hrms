import { Injectable } from "@nestjs/common";
import { CreateAssetTypeDto } from "../dto/create-asset-type.dto";
import { AssetTypeMapper } from "../mappers/asset.mapper";
import { AssetCatalogRepository } from "../repositories/asset-catalog.repository";
import { throwConflict } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { RequestContextService } from "../../../../shared/context/request-context.service";

@Injectable()
export class CreateAssetTypeUseCase {
  constructor(
    private readonly catalogRepo: AssetCatalogRepository,
    private readonly requestContext: RequestContextService,
  ) {}

  async execute(dto: CreateAssetTypeDto) {
    const existing = await this.catalogRepo.findTypeByCode(dto.code);
    if (existing) {
      throwConflict(
        "An asset type with this code already exists",
        ERROR_CODES.ASSET_DUPLICATE_CODE,
        { code: dto.code },
      );
    }

    const actorUserId = this.requestContext.get()?.userId ?? null;
    const isTrackable = dto.isTrackable ?? true;

    const created = await this.catalogRepo.transaction(async (tx) => {
      const type = await this.catalogRepo.createType(
        {
          name: dto.name,
          code: dto.code,
          ...(dto.description !== undefined
            ? { description: dto.description }
            : {}),
          isTrackable,
          createdBy: actorUserId,
          updatedBy: actorUserId,
        },
        tx,
      );

      // Quantity-tracked (non-serialized) types carry a stock projection row.
      if (!isTrackable && type) {
        await this.catalogRepo.createStockLevel(
          {
            assetTypeId: type.id,
            onHand: 0,
            reserved: 0,
          },
          tx,
        );
      }

      return type;
    });

    return AssetTypeMapper.toResponse(created!);
  }
}
