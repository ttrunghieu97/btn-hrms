import { Injectable, Inject } from "@nestjs/common";
import { DATABASE_CONNECTION } from "@/infrastructure/database/database.tokens";
import type { AppDatabase } from "@/infrastructure/database/database-client.type";
import * as schema from "@/infrastructure/database/schema";
import { eq, and, desc, isNull } from "drizzle-orm";

export interface ApprovalInboxItem {
  approvalRequestId: string;
  leaveRequestId: string;
  status: string;
  requestedAt: Date;
  requester: {
    id: string;
    fullName: string;
    employeeCode: string;
    departmentName: string | null;
  } | null;
  leaveType: {
    code: string;
    name: string;
    isPaid: boolean;
  } | null;
  startDate: string;
  endDate: string;
  totalUnits: string;
  reason: string | null;
}

@Injectable()
export class ApprovalInboxRepository {
  constructor(
    @Inject(DATABASE_CONNECTION) private readonly db: AppDatabase,
  ) {}

  async listByApprover(userId: string): Promise<ApprovalInboxItem[]> {
    // 1. Get pending approval steps assigned to this user
    const pendingSteps = await this.db
      .select({
        approvalRequestId: schema.approvalSteps.requestId,
        stepIndex: schema.approvalSteps.stepIndex,
      })
      .from(schema.approvalSteps)
      .where(
        and(
          eq(schema.approvalSteps.status, "pending"),
          eq(schema.approvalSteps.approverUserId, userId),
          isNull(schema.approvalSteps.decidedAt),
        ),
      )
      .limit(50);

    if (pendingSteps.length === 0) return [];

    const approvalRequestIds = [
      ...new Set(pendingSteps.map((s) => s.approvalRequestId)),
    ];

    // 2. Get approval requests + leave data via correlation links
    const rows = await this.db
      .select({
        approvalRequestId: schema.approvalRequests.id,
        approvalStatus: schema.approvalRequests.status,
        approvedAt: schema.approvalRequests.createdAt,
        leaveRequestId: schema.leaveApprovalLinks.leaveRequestId,
        startDate: schema.leaveRequests.startDate,
        endDate: schema.leaveRequests.endDate,
        totalUnits: schema.leaveRequests.totalUnits,
        reason: schema.leaveRequests.reason,
        leaveTypeCode: schema.leaveTypes.code,
        leaveTypeName: schema.leaveTypes.name,
        leaveTypeIsPaid: schema.leaveTypes.isPaid,
        employeeId: schema.employees.id,
        employeeFullName: schema.employees.firstName,
        employeeLastName: schema.employees.lastName,
        employeeCode: schema.employees.employeeCode,
        departmentName: schema.departments.name,
      })
      .from(schema.approvalRequests)
      .innerJoin(
        schema.leaveApprovalLinks,
        eq(schema.approvalRequests.id, schema.leaveApprovalLinks.approvalRequestId),
      )
      .innerJoin(
        schema.leaveRequests,
        eq(schema.leaveApprovalLinks.leaveRequestId, schema.leaveRequests.id),
      )
      .innerJoin(
        schema.leaveTypes,
        eq(schema.leaveRequests.leaveTypeId, schema.leaveTypes.id),
      )
      .innerJoin(
        schema.employees,
        eq(schema.leaveRequests.employeeId, schema.employees.id),
      )
      .leftJoin(
        schema.departments,
        eq(schema.employees.departmentId, schema.departments.id),
      )
      .where(
        and(
          eq(schema.approvalRequests.status, "pending"),
          // Only leave-type subjects
          eq(schema.approvalRequests.subjectType, "leave"),
        ),
      )
      .orderBy(desc(schema.approvalRequests.createdAt));

    return rows.map((r) => ({
      approvalRequestId: r.approvalRequestId,
      leaveRequestId: r.leaveRequestId,
      status: r.approvalStatus,
      requestedAt: r.approvedAt,
      requester: {
        id: r.employeeId,
        fullName: `${r.employeeFullName} ${r.employeeLastName ?? ""}`.trim(),
        employeeCode: r.employeeCode,
        departmentName: r.departmentName ?? null,
      },
      leaveType: {
        code: r.leaveTypeCode,
        name: r.leaveTypeName,
        isPaid: r.leaveTypeIsPaid,
      },
      startDate: r.startDate,
      endDate: r.endDate,
      totalUnits: String(r.totalUnits ?? 0),
      reason: r.reason,
    }));
  }
}
