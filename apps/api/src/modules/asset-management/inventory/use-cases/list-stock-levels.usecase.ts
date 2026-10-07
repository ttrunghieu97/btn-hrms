import { Injectable } from "@nestjs/common";
import { StockLevelMapper } from "../mappers/stock-level.mapper";
import { AssetInventoryRepository } from "../repositories/asset-inventory.repository";

@Injectable()
export class ListStockLevelsUseCase {
  constructor(private readonly inventoryRepo: AssetInventoryRepository) {}

  async execute() {
    const rows = await this.inventoryRepo.listStock();
    return { rows: StockLevelMapper.toResponseList(rows) };
  }
}
