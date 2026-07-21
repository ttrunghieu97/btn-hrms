import type { PostingRow } from "../repositories/postings.repository";

export class PostingMapper {
  static toResponse(row: PostingRow) {
    return {
      id: row.id,
      requisitionId: row.requisitionId,
      title: row.title,
      description: row.description,
      requirements: row.requirements,
      status: row.status,
      openedAt: row.openedAt,
      closesAt: row.closesAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  static toResponseList(rows: PostingRow[]) {
    return rows.map((row) => PostingMapper.toResponse(row));
  }
}
