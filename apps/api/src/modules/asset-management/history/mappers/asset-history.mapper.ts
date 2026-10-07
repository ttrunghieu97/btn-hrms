import type { HistoryEntryRow } from "../repositories/asset-history.repository";

export class AssetHistoryMapper {
  static toResponse(row: HistoryEntryRow) {
    return {
      id: row.id,
      kind: row.kind,
      assetId: row.assetId,
      assetTypeId: row.assetTypeId,
      issueId: row.issueId,
      issueLineId: row.issueLineId,
      employeeId: row.employeeId,
      quantityDelta: row.quantityDelta,
      detail: row.detail,
      occurredAt: row.occurredAt,
      actorUserId: row.actorUserId,
      createdAt: row.createdAt,
    };
  }

  static toResponseList(rows: HistoryEntryRow[]) {
    return rows.map((row) => AssetHistoryMapper.toResponse(row));
  }
}
