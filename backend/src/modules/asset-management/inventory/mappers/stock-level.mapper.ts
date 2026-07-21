import type { AssetStockLevelRow } from "../repositories/asset-inventory.repository";

export class StockLevelMapper {
  static toResponse(row: AssetStockLevelRow) {
    return {
      id: row.id,
      assetTypeId: row.assetTypeId,
      onHand: row.onHand,
      reserved: row.reserved,
      available: row.onHand - row.reserved,
      lowStockThreshold: row.lowStockThreshold,
      updatedAt: row.updatedAt,
    };
  }

  static toResponseList(rows: AssetStockLevelRow[]) {
    return rows.map((row) => StockLevelMapper.toResponse(row));
  }
}
