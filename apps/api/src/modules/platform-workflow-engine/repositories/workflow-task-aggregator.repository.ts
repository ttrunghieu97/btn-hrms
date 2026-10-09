import { Injectable } from "@nestjs/common";
import { and, desc, eq, or } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { ScopedDbService } from "../../../infrastructure/database/scoped-db.service";
import * as schema from "../../../infrastructure/database/schema";
import type { WorkflowTask } from "../tasks/interfaces/workflow-task.interface";

@Injectable()
export class WorkflowTaskAggregatorRepository {
  constructor(private readonly scopedDb: ScopedDbService) {}

  private get db(): PostgresJsDatabase<typeof schema> {
    return this.scopedDb.getDb<typeof schema>();
  }

  async getPendingLeaveTasks(userId: string): Promise<WorkflowTask[]> {
    try {
      const rows = await this.db
        .select({
          approvalRequestId: schema.approvalRequests.id,
          leaveRequestId: schema.leaveApprovalLinks.leaveRequestId,
          startDate: schema.leaveRequests.startDate,
          endDate: schema.leaveRequests.endDate,
          totalUnits: schema.leaveRequests.totalUnits,
          reason: schema.leaveRequests.reason,
          leaveTypeName: schema.leaveTypes.name,
          employeeCode: schema.employees.employeeCode,
          employeeFirstName: schema.employees.firstName,
          employeeLastName: schema.employees.lastName,
          createdAt: schema.approvalRequests.createdAt,
        })
        .from(schema.approvalSteps)
        .innerJoin(
          schema.approvalRequests,
          eq(schema.approvalSteps.requestId, schema.approvalRequests.id),
        )
        .innerJoin(
          schema.leaveApprovalLinks,
          eq(schema.approvalRequests.id, schema.leaveApprovalLinks.approvalRequestId),
        )
        .innerJoin(
          schema.leaveRequests,
          eq(schema.leaveApprovalLinks.leaveRequestId, schema.leaveRequests.id),
        )
        .leftJoin(
          schema.leaveTypes,
          eq(schema.leaveRequests.leaveTypeId, schema.leaveTypes.id),
        )
        .leftJoin(
          schema.employees,
          eq(schema.leaveRequests.employeeId, schema.employees.id),
        )
        .where(
          and(
            eq(schema.approvalSteps.approverUserId, userId),
            eq(schema.approvalSteps.status, "pending"),
            eq(schema.approvalRequests.status, "pending"),
          ),
        )
        .orderBy(desc(schema.approvalRequests.createdAt))
        .limit(50);

      return rows.map((r) => {
        const requester =
          `${r.employeeFirstName || ""} ${r.employeeLastName || ""}`.trim() ||
          r.employeeCode ||
          "Nhân viên";
        return {
          id: `leave-${r.leaveRequestId || r.approvalRequestId}`,
          workflowId: "leave-request",
          domain: "leave",
          domainLabel: "Nghỉ phép",
          entityId: r.leaveRequestId,
          title: `${requester} xin ${r.leaveTypeName || "nghỉ phép"}`,
          subtitle: `${r.totalUnits ?? 1} ngày • ${r.reason || "Không có lý do"}`,
          requesterName: requester,
          currentState: "pending",
          currentStateLabel: "Chờ duyệt",
          currentStateVariant: "amber",
          requiredAction: "Quản lý trực tiếp phê duyệt nghỉ",
          priority: "high",
          createdAt: r.createdAt ? r.createdAt.toISOString() : undefined,
          dateRange:
            r.startDate && r.endDate ? `${r.startDate} → ${r.endDate}` : undefined,
          detailUrl: "/leave",
          canDirectApprove: true,
          canDirectReject: true,
        };
      });
    } catch {
      return [];
    }
  }

  async getPendingExpenseTasks(_userId: string): Promise<WorkflowTask[]> {
    try {
      const rows = await this.db
        .select({
          id: schema.expenseClaims.id,
          title: schema.expenseClaims.title,
          description: schema.expenseClaims.description,
          totalAmount: schema.expenseClaims.totalAmount,
          currency: schema.expenseClaims.currency,
          createdAt: schema.expenseClaims.createdAt,
          employeeCode: schema.employees.employeeCode,
          employeeFirstName: schema.employees.firstName,
          employeeLastName: schema.employees.lastName,
        })
        .from(schema.expenseClaims)
        .leftJoin(
          schema.employees,
          eq(schema.expenseClaims.employeeId, schema.employees.id),
        )
        .where(eq(schema.expenseClaims.status, "submitted"))
        .orderBy(desc(schema.expenseClaims.createdAt))
        .limit(50);

      return rows.map((r) => {
        const requester =
          `${r.employeeFirstName || ""} ${r.employeeLastName || ""}`.trim() ||
          r.employeeCode ||
          "Nhân viên";
        const amountFmt = r.totalAmount
          ? `${Number(r.totalAmount).toLocaleString("vi-VN")} ${r.currency || "VND"}`
          : "";
        return {
          id: `expense-${r.id}`,
          workflowId: "expense-claim",
          domain: "expense",
          domainLabel: "Chi phí",
          entityId: r.id,
          title: r.title || `Đề nghị thanh toán #${r.id.slice(0, 8)}`,
          subtitle: `${amountFmt ? amountFmt + " • " : ""}${r.description || "Chi tiêu công tác"}`,
          requesterName: requester,
          currentState: "submitted",
          currentStateLabel: "Chờ duyệt chi",
          currentStateVariant: "amber",
          requiredAction: "Quản lý / Kế toán duyệt khoản chi",
          priority: "high",
          createdAt: r.createdAt ? r.createdAt.toISOString() : undefined,
          detailUrl: "/expenses",
          canDirectApprove: true,
          canDirectReject: true,
        };
      });
    } catch {
      return [];
    }
  }

  async getPendingAssetTasks(_userId: string): Promise<WorkflowTask[]> {
    try {
      const rows = await this.db
        .select({
          id: schema.assetRequests.id,
          status: schema.assetRequests.status,
          reason: schema.assetRequests.reason,
          neededBy: schema.assetRequests.neededBy,
          createdAt: schema.assetRequests.createdAt,
          employeeCode: schema.employees.employeeCode,
          employeeFirstName: schema.employees.firstName,
          employeeLastName: schema.employees.lastName,
        })
        .from(schema.assetRequests)
        .leftJoin(
          schema.employees,
          eq(schema.assetRequests.requesterEmployeeId, schema.employees.id),
        )
        .where(
          or(
            eq(schema.assetRequests.status, "pending_approval"),
            eq(schema.assetRequests.status, "approved"),
          ),
        )
        .orderBy(desc(schema.assetRequests.createdAt))
        .limit(50);

      return rows.map((r) => {
        const isApproved = r.status === "approved";
        const requester =
          `${r.employeeFirstName || ""} ${r.employeeLastName || ""}`.trim() ||
          r.employeeCode ||
          "Nhân viên";
        return {
          id: `asset-${r.id}`,
          workflowId: "asset-request",
          domain: "asset",
          domainLabel: "Thiết bị",
          entityId: r.id,
          title: `Yêu cầu cấp phát thiết bị #${r.id.slice(0, 8)}`,
          subtitle: r.reason || "Trang thiết bị làm việc",
          requesterName: requester,
          currentState: r.status,
          currentStateLabel: isApproved ? "Chờ xuất kho" : "Chờ phê duyệt",
          currentStateVariant: isApproved ? "blue" : "amber",
          requiredAction: isApproved
            ? "IT xuất kho & bàn giao"
            : "Quản lý duyệt đề xuất",
          priority: isApproved ? "normal" : "high",
          createdAt: r.createdAt ? r.createdAt.toISOString() : undefined,
          detailUrl: "/asset-management/requests",
        };
      });
    } catch {
      return [];
    }
  }

  async getPendingScheduleTasks(_userId: string): Promise<WorkflowTask[]> {
    try {
      const rows = await this.db
        .select({
          id: schema.scheduleRequests.id,
          date: schema.scheduleRequests.date,
          requestType: schema.scheduleRequests.requestType,
          reason: schema.scheduleRequests.reason,
          createdAt: schema.scheduleRequests.createdAt,
          employeeCode: schema.employees.employeeCode,
          employeeFirstName: schema.employees.firstName,
          employeeLastName: schema.employees.lastName,
        })
        .from(schema.scheduleRequests)
        .leftJoin(
          schema.employees,
          eq(schema.scheduleRequests.employeeId, schema.employees.id),
        )
        .where(
          or(
            eq(schema.scheduleRequests.status, "pending" as any),
            eq(schema.scheduleRequests.status, "PENDING" as any),
          ),
        )
        .orderBy(desc(schema.scheduleRequests.createdAt))
        .limit(50);

      return rows.map((r) => {
        const requester =
          `${r.employeeFirstName || ""} ${r.employeeLastName || ""}`.trim() ||
          r.employeeCode ||
          "Nhân viên";
        return {
          id: `schedule-${r.id}`,
          workflowId: "schedule-request",
          domain: "schedule",
          domainLabel: "Đổi ca",
          entityId: r.id,
          title: `${requester} đề xuất đổi/nghỉ ca`,
          subtitle: `Ngày: ${r.date} • ${r.reason || "Lý do cá nhân"}`,
          requesterName: requester,
          currentState: "pending",
          currentStateLabel: "Chờ duyệt ca",
          currentStateVariant: "amber",
          requiredAction: "Quản lý ca kiểm tra độ phủ & duyệt",
          priority: "high",
          createdAt: r.createdAt ? r.createdAt.toISOString() : undefined,
          dateRange: r.date,
          detailUrl: "/schedule/requests",
          canDirectApprove: true,
          canDirectReject: true,
        };
      });
    } catch {
      return [];
    }
  }

  async getPendingPayrollTasks(_userId: string): Promise<WorkflowTask[]> {
    try {
      const rows = await this.db
        .select({
          id: schema.payrollRuns.id,
          status: schema.payrollRuns.status,
          notes: schema.payrollRuns.notes,
          createdAt: schema.payrollRuns.createdAt,
        })
        .from(schema.payrollRuns)
        .where(
          or(
            eq(schema.payrollRuns.status, "processing"),
            eq(schema.payrollRuns.status, "approved"),
          ),
        )
        .orderBy(desc(schema.payrollRuns.createdAt))
        .limit(20);

      return rows.map((r) => {
        const isProcessing = r.status === "processing";
        return {
          id: `payroll-${r.id}`,
          workflowId: "payroll-run",
          domain: "payroll",
          domainLabel: "Bảng lương",
          entityId: r.id,
          title: `Kỳ tính lương #${r.id.slice(0, 8)}`,
          subtitle: `Trạng thái: ${r.status} • Cần thẩm định tổng quỹ lương`,
          requesterName: "Phòng Kế toán & Tiền lương",
          currentState: r.status,
          currentStateLabel: isProcessing
            ? "Chờ phê duyệt lương"
            : "Sẵn sàng hạch toán",
          currentStateVariant: isProcessing ? "amber" : "emerald",
          requiredAction: isProcessing
            ? "Ban Giám đốc / CFO phê duyệt chi trả"
            : "Kế toán trưởng hạch toán",
          priority: "urgent",
          createdAt: r.createdAt ? r.createdAt.toISOString() : undefined,
          detailUrl: `/payroll/runs/${r.id}`,
        };
      });
    } catch {
      return [];
    }
  }

  async getPendingAttendanceTasks(_userId: string): Promise<WorkflowTask[]> {
    try {
      const rows = await this.db
        .select({
          id: schema.attendanceExceptions.id,
          workDate: schema.attendanceExceptions.workDate,
          type: schema.attendanceExceptions.type,
          createdAt: schema.attendanceExceptions.createdAt,
          employeeCode: schema.employees.employeeCode,
          employeeFirstName: schema.employees.firstName,
          employeeLastName: schema.employees.lastName,
        })
        .from(schema.attendanceExceptions)
        .leftJoin(
          schema.employees,
          eq(schema.attendanceExceptions.employeeId, schema.employees.id),
        )
        .where(eq(schema.attendanceExceptions.status, "pending"))
        .orderBy(desc(schema.attendanceExceptions.createdAt))
        .limit(50);

      return rows.map((r) => {
        const requester =
          `${r.employeeFirstName || ""} ${r.employeeLastName || ""}`.trim() ||
          r.employeeCode ||
          "Nhân viên";
        return {
          id: `attendance-${r.id}`,
          workflowId: "attendance-period",
          domain: "attendance",
          domainLabel: "Chấm công",
          entityId: r.id,
          title: `Ngoại lệ chấm công: ${requester}`,
          subtitle: `${r.type || "Bất thường"} • Ngày: ${r.workDate}`,
          requesterName: requester,
          currentState: "pending",
          currentStateLabel: "Cần giải trình",
          currentStateVariant: "amber",
          requiredAction: "Xác nhận giải trình & cập nhật công",
          priority: "normal",
          createdAt: r.createdAt ? r.createdAt.toISOString() : undefined,
          detailUrl: "/attendance",
        };
      });
    } catch {
      return [];
    }
  }

  async getPendingOffboardingTasks(_userId: string): Promise<WorkflowTask[]> {
    try {
      const rows = await this.db
        .select({
          id: schema.boardingProcesses.id,
          employeeId: schema.boardingProcesses.employeeId,
          status: schema.boardingProcesses.status,
          startDate: schema.boardingProcesses.startDate,
          createdAt: schema.boardingProcesses.createdAt,
          employeeCode: schema.employees.employeeCode,
          employeeFirstName: schema.employees.firstName,
          employeeLastName: schema.employees.lastName,
        })
        .from(schema.boardingProcesses)
        .leftJoin(
          schema.employees,
          eq(schema.boardingProcesses.employeeId, schema.employees.id),
        )
        .where(
          and(
            eq(schema.boardingProcesses.type, "offboarding"),
            eq(schema.boardingProcesses.status, "in_progress"),
          ),
        )
        .orderBy(desc(schema.boardingProcesses.createdAt))
        .limit(20);

      return rows.map((r) => {
        const employee =
          `${r.employeeFirstName || ""} ${r.employeeLastName || ""}`.trim() ||
          r.employeeCode ||
          r.employeeId?.slice(0, 8);
        return {
          id: `offboarding-${r.id}`,
          workflowId: "offboarding-clearance",
          domain: "offboarding",
          domainLabel: "Thôi việc",
          entityId: r.id,
          title: `Bàn giao thôi việc: ${employee}`,
          subtitle: `Bắt đầu: ${r.startDate || "N/A"} • Chờ hoàn tất clearance & bàn giao`,
          requesterName: employee,
          currentState: r.status,
          currentStateLabel: "Đang xử lý",
          currentStateVariant: "amber",
          requiredAction: "HR & Trưởng bộ phận duyệt clearance",
          priority: "high",
          createdAt: r.createdAt ? r.createdAt.toISOString() : undefined,
          detailUrl: "/offboarding",
        };
      });
    } catch {
      return [];
    }
  }
}
