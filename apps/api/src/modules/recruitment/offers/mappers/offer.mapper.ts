import type { OfferRow } from "../repositories/offers.repository";

export class OfferMapper {
  static toResponse(row: OfferRow) {
    return {
      id: row.id,
      applicationId: row.applicationId,
      compensation: row.compensation,
      startDate: row.startDate,
      expiresAt: row.expiresAt,
      status: row.status,
      decidedAt: row.decidedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  static toResponseList(rows: OfferRow[]) {
    return rows.map((row) => OfferMapper.toResponse(row));
  }
}
