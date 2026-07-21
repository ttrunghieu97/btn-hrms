import { Injectable } from "@nestjs/common";
import { AssetHistoryMapper } from "../mappers/asset-history.mapper";
import { AssetHistoryRepository } from "../repositories/asset-history.repository";

@Injectable()
export class GetAssetHistoryUseCase {
  constructor(private readonly historyRepo: AssetHistoryRepository) {}

  async execute(assetId: string) {
    const rows = await this.historyRepo.listByAsset(assetId);
    return {
      assetId,
      entries: AssetHistoryMapper.toResponseList(rows),
    };
  }
}
