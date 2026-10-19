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
  isProvisional?: boolean;
  calculationStatus?: string | null;
  metadata?: Record<string, unknown> | null;
};

type PayrollRunEntityInput = {
  payrollPeriodId?: string;
  branchId?: string | null;
  status?: string;
  notes?: string | null;
};

export class PayrollRunMapper {
  static toDto(row: PayrollRunResponseRow) {
    const meta =
      row.metadata && typeof row.metadata === "object"
        ? (row.metadata as Record<string, unknown>)
        : undefined;
    const isConfirmedRun =
      row.isProvisional === false ||
      meta?.isProvisional === false ||
      meta?.calculationStatus === "CONFIRMED" ||
      row.calculationStatus === "CONFIRMED" ||
      row.status === "approved" ||
      row.status === "posted";
    const calculationStatus =
      row.calculationStatus ??
      (typeof meta?.calculationStatus === "string"
        ? meta.calculationStatus
        : isConfirmedRun
          ? "CONFIRMED"
          : "PROVISIONAL_POLICY_UNCONFIRMED");
    const isProvisional = row.isProvisional ?? !isConfirmedRun;

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
      isProvisional,
      calculationStatus,
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

