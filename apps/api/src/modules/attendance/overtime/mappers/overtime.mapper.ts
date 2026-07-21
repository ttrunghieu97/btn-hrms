import { Injectable } from "@nestjs/common";

@Injectable()
export class OvertimeMapper {
  static toDto(row: any  ) {
    if (!row) return null;
    return {
      id: row.id,
      employeeId: row.employeeId,
      workDate: row.workDate,
      candidateMinutes: row.candidateMinutes,
      requestedMinutes: row.requestedMinutes,
      approvedMinutes: row.approvedMinutes,
      status: row.status,
      requestNote: row.requestNote,
      rejectionReason: row.rejectionReason,
      approvedByUserId: row.approvedByUserId,
      approvedAt: row.approvedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}

