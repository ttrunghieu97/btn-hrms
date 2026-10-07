import type {
  AssetTypeRow,
  AssetRow,
} from "../repositories/asset-catalog.repository";

export class AssetTypeMapper {
  static toResponse(row: AssetTypeRow) {
    return {
      id: row.id,
      name: row.name,
      code: row.code,
      description: row.description,
      isTrackable: row.isTrackable,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      deletedAt: row.deletedAt,
    };
  }

  static toResponseList(rows: AssetTypeRow[]) {
    return rows.map((row) => AssetTypeMapper.toResponse(row));
  }
}

export class AssetMapper {
  static toResponse(row: AssetRow) {
    return {
      id: row.id,
      assetTypeId: row.assetTypeId,
      code: row.code,
      name: row.name,
      serialNumber: row.serialNumber,
      status: row.status,
      purchaseDate: row.purchaseDate,
      purchaseCost: row.purchaseCost,
      currency: row.currency,
      metadata: row.metadata,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  static toResponseList(rows: AssetRow[]) {
    return rows.map((row) => AssetMapper.toResponse(row));
  }
}
