import type { RequisitionRow } from "../repositories/requisitions.repository";

export class RequisitionMapper {
  static toResponse(row: RequisitionRow) {
    return {
      id: row.id,
      departmentId: row.departmentId,
      positionId: row.positionId,
      title: row.title,
      headcount: row.headcount,
      budgetMin: row.budgetMin,
      budgetMax: row.budgetMax,
      justification: row.justification,
      status: row.status,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  static toResponseList(rows: RequisitionRow[]) {
    return rows.map((row) => RequisitionMapper.toResponse(row));
  }
}
