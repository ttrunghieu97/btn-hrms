import { Injectable } from "@nestjs/common";
import { AssetTypeMapper } from "../mappers/asset.mapper";
import { AssetCatalogRepository } from "../repositories/asset-catalog.repository";
import type { AssetTypeQueryDto } from "../dto/asset-type-query.dto";

@Injectable()
export class ListAssetTypesUseCase {
  constructor(private readonly catalogRepo: AssetCatalogRepository) {}

  async execute(query: AssetTypeQueryDto) {
    const result = await this.catalogRepo.listTypes(query);
    return {
      rows: AssetTypeMapper.toResponseList(result.rows),
      total: result.total,
      page: result.page,
      limit: result.limit,
    };
  }
}
