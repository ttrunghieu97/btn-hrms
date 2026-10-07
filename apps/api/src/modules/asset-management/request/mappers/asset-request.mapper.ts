import type {
  RequestLineRow,
  RequestWithLines,
} from "../repositories/asset-request.repository";

export class AssetRequestMapper {
  static toLineResponse(row: RequestLineRow) {
    return {
      id: row.id,
      requestId: row.requestId,
      assetTypeId: row.assetTypeId,
      quantity: row.quantity,
      note: row.note,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  static toResponse(row: RequestWithLines) {
    return {
      id: row.id,
      requesterEmployeeId: row.requesterEmployeeId,
      status: row.status,
      reason: row.reason,
      neededBy: row.neededBy,
      submittedAt: row.submittedAt,
      decidedAt: row.decidedAt,
      decidedByUserId: row.decidedByUserId,
      decisionNote: row.decisionNote,
      fulfilledAt: row.fulfilledAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      lines: (row.lines ?? []).map((line) =>
        AssetRequestMapper.toLineResponse(line),
      ),
    };
  }

  static toResponseList(rows: RequestWithLines[]) {
    return rows.map((row) => AssetRequestMapper.toResponse(row));
  }
}
