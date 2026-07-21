import { type CreateLeaveRequestDto } from "../dto/create-leave-request.dto";
import { type UpdateLeaveRequestDto } from "../dto/update-leave-request.dto";
import { type LeaveRequestResponseDto } from "../dto/leave-request-response.dto";
import { type LeaveBalanceResponseDto } from "../dto/leave-balance-response.dto";

export class LeaveRequestMapper {
  static toResponseDto(row: any  ): LeaveRequestResponseDto {
    return {
      id: row.id,
      employeeId: row.employeeId,
      leaveTypeId: row.leaveTypeId,
      approverUserId: row.approverUserId ?? null,
      status: row.status,
      lifecycleStatus: this.toLifecycleStatus(row.status),
      startDate: row.startDate,
      endDate: row.endDate,
      startSession: row.startSession,
      endSession: row.endSession,
      totalUnits: String(row.totalUnits),
      reason: row.reason ?? null,
      note: row.note ?? null,
      rejectionReason: row.rejectionReason ?? null,
      requestedAt: row.requestedAt,
      approvedAt: row.approvedAt ?? null,
      rejectedAt: row.rejectedAt ?? null,
      cancelledAt: row.cancelledAt ?? null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      employee: row.employee
        ? {
            id: row.employee.id,
            employeeCode: row.employee.employeeCode,
            fullName:
              `${row.employee.firstName} ${row.employee.lastName}`.trim(),
            departmentName: row.employee.department?.name ?? null,
          }
        : undefined,
      leaveType: row.leaveType
        ? {
            id: row.leaveType.id,
            code: row.leaveType.code,
            name: row.leaveType.name,
            unit: row.leaveType.unit,
            isPaid: row.leaveType.isPaid,
          }
        : undefined,
      approver: row.approver
        ? {
            id: row.approver.id,
            username: row.approver.username,
            email: row.approver.email ?? null,
          }
        : null,
    };
  }

  static toResponseDtos(rows: any[]  ): LeaveRequestResponseDto[] {
    return rows.map((row) => this.toResponseDto(row));
  }

  static toLifecycleStatus(status: string) {
    if (status === "pending") return "submitted";
    if (status === "cancelled") return "canceled";
    return status;
  }

  static toBalanceDto(row: any  ): LeaveBalanceResponseDto {
    return {
      id: row.id,
      employeeId: row.employeeId,
      leaveTypeId: row.leaveTypeId,
      balanceYear: row.balanceYear,
      openingBalance: String(row.openingBalance),
      accruedAmount: String(row.accruedAmount),
      usedAmount: String(row.usedAmount),
      carriedOverAmount: String(row.carriedOverAmount),
      adjustedAmount: String(row.adjustedAmount),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      leaveType: {
        id: row.leaveType.id,
        code: row.leaveType.code,
        name: row.leaveType.name,
        unit: row.leaveType.unit,
      },
    };
  }

  static toBalanceDtos(rows: any[]  ): LeaveBalanceResponseDto[] {
    return rows.map((row) => this.toBalanceDto(row));
  }

  static toEntity(dto: CreateLeaveRequestDto | UpdateLeaveRequestDto) {
    if (!dto) return {};

    return {
      ...(dto.employeeId !== undefined ? { employeeId: dto.employeeId } : {}),
      ...(dto.leaveTypeId !== undefined
        ? { leaveTypeId: dto.leaveTypeId }
        : {}),
      ...(dto.startDate !== undefined ? { startDate: dto.startDate } : {}),
      ...(dto.endDate !== undefined ? { endDate: dto.endDate } : {}),
      ...(dto.startSession !== undefined
        ? { startSession: dto.startSession }
        : {}),
      ...(dto.endSession !== undefined ? { endSession: dto.endSession } : {}),
      ...(dto.totalUnits !== undefined
        ? { totalUnits: dto.totalUnits as any }
        : {}),
      ...(dto.reason !== undefined ? { reason: dto.reason } : {}),
      ...(dto.note !== undefined ? { note: dto.note } : {}),
    };
  }
}




