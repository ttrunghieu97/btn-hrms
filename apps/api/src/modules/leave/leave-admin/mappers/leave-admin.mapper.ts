export class LeaveAdminMapper {
  static toLeavePolicyDto(row: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) {
    return {
      id: row.id,
      branchId: row.branchId ?? null,
      code: row.code,
      name: row.name,
      description: row.description ?? null,
      effectiveFrom: row.effectiveFrom,
      effectiveTo: row.effectiveTo ?? null,
      isActive: row.isActive,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  static toLeaveTypeDto(row: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) {
    return {
      id: row.id,
      policyId: row.policyId ?? null,
      code: row.code,
      name: row.name,
      unit: row.unit,
      isPaid: row.isPaid,
      requiresApproval: row.requiresApproval,
      maxDaysPerYear:
        row.maxDaysPerYear !== undefined && row.maxDaysPerYear !== null
          ? String(row.maxDaysPerYear)
          : null,
      color: row.color ?? null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  static toLeavePolicyEntity(dto: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) {
    return {
      ...(dto.branchId !== undefined ? { branchId: dto.branchId } : {}),
      ...(dto.code !== undefined ? { code: dto.code } : {}),
      ...(dto.name !== undefined ? { name: dto.name } : {}),
      ...(dto.description !== undefined
        ? { description: dto.description }
        : {}),
      ...(dto.effectiveFrom !== undefined
        ? { effectiveFrom: dto.effectiveFrom }
        : {}),
      ...(dto.effectiveTo !== undefined
        ? { effectiveTo: dto.effectiveTo }
        : {}),
      ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
    };
  }

  static toLeaveTypeEntity(dto: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) {
    return {
      ...(dto.policyId !== undefined ? { policyId: dto.policyId } : {}),
      ...(dto.code !== undefined ? { code: dto.code } : {}),
      ...(dto.name !== undefined ? { name: dto.name } : {}),
      ...(dto.unit !== undefined ? { unit: dto.unit } : {}),
      ...(dto.isPaid !== undefined ? { isPaid: dto.isPaid } : {}),
      ...(dto.requiresApproval !== undefined
        ? { requiresApproval: dto.requiresApproval }
        : {}),
      ...(dto.maxDaysPerYear !== undefined
        ? { maxDaysPerYear: dto.maxDaysPerYear }
        : {}),
      ...(dto.color !== undefined ? { color: dto.color } : {}),
    };
  }
}



