import { Injectable } from "@nestjs/common";
import { AssetMapper } from "../mappers/asset.mapper";
import { AssetCatalogRepository } from "../repositories/asset-catalog.repository";
import type { AssetQueryDto } from "../dto/asset-query.dto";

@Injectable()
export class ListAssetsUseCase {
  constructor(private readonly catalogRepo: AssetCatalogRepository) {}

  async execute(query: AssetQueryDto) {
    const result = await this.catalogRepo.listAssets(query);
    return {
      rows: AssetMapper.toResponseList(result.rows),
      total: result.total,
      page: result.page,
      limit: result.limit,
    };
  }
}
