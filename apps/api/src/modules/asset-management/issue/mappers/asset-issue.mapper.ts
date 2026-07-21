import type {
  IssueLineRow,
  IssueWithLines,
} from "../repositories/asset-issue.repository";

export class AssetIssueMapper {
  static toLineResponse(row: IssueLineRow) {
    return {
      id: row.id,
      issueId: row.issueId,
      assetId: row.assetId,
      assetTypeId: row.assetTypeId,
      quantity: row.quantity,
      status: row.status,
      returnedAt: row.returnedAt,
      returnedToUserId: row.returnedToUserId,
      condition: row.condition,
      note: row.note,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  static toResponse(row: IssueWithLines) {
    return {
      id: row.id,
      employeeId: row.employeeId,
      requestId: row.requestId,
      issuedByUserId: row.issuedByUserId,
      issuedAt: row.issuedAt,
      note: row.note,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      lines: (row.lines ?? []).map((line) =>
        AssetIssueMapper.toLineResponse(line),
      ),
    };
  }

  static toResponseList(rows: IssueWithLines[]) {
    return rows.map((row) => AssetIssueMapper.toResponse(row));
  }
}
