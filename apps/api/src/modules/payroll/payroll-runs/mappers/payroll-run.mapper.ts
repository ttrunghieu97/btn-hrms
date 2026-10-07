type PayrollRunResponseRow = {
  id: string;
  payrollPeriodId: string;
  branchId: string | null;
  status: string;
  approvedByUserId: string | null;
  approvedAt: Date | null;
  processedAt: Date | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  payrollPeriod?: { id: string; code: string; name: string } | null;
};

type PayrollRunEntityInput = {
  payrollPeriodId?: string;
  branchId?: string | null;
  status?: string;
  notes?: string | null;
};

export class PayrollRunMapper {
  static toDto(row: PayrollRunResponseRow) {
    return {
      id: row.id,
      payrollPeriodId: row.payrollPeriodId,
      branchId: row.branchId ?? null,
      status: row.status,
      approvedByUserId: row.approvedByUserId ?? null,
      approvedAt: row.approvedAt ?? null,
      processedAt: row.processedAt ?? null,
      notes: row.notes ?? null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      payrollPeriod: row.payrollPeriod
        ? {
            id: row.payrollPeriod.id,
            code: row.payrollPeriod.code,
            name: row.payrollPeriod.name,
          }
        : undefined,
    };
  }
  static toEntity(dto: PayrollRunEntityInput): Record<string, unknown> {
    const entity: Record<string, unknown> = {};
    if (dto.payrollPeriodId !== undefined) entity.payrollPeriodId = dto.payrollPeriodId;
    if (dto.branchId !== undefined) entity.branchId = dto.branchId;
    if (dto.status !== undefined) entity.status = dto.status;
    if (dto.notes !== undefined) entity.notes = dto.notes;
    return entity;
  }
}

