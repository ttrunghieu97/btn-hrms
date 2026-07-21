import { Module, OnModuleInit } from "@nestjs/common";
import { DashboardController } from "./dashboard.controller";
import { DashboardService } from "./application/dashboard.service";
import { DashboardWidgetRegistry } from "./application/dashboard-widget-registry";
import { WorkforceAggregateService } from "./infrastructure/repositories/workforce-aggregate.service";
import { AttendanceAggregateService } from "./infrastructure/repositories/attendance-aggregate.service";
import { LeaveAggregateService } from "./infrastructure/repositories/leave-aggregate.service";
import { PayrollAggregateService } from "./infrastructure/repositories/payroll-aggregate.service";
import { ApprovalAggregateService } from "./infrastructure/repositories/approval-aggregate.service";
import { Permissions } from "../../../core/security/permissions/permissions.registry";
import { DashboardWidgetId } from "./types/widget-ids";

// Widgets
import { HeadcountWidgetProvider } from "./widgets/executive/headcount.widget";
import { EmployeeStatusWidgetProvider } from "./widgets/executive/employee-status.widget";
import { DepartmentHeadcountWidgetProvider } from "./widgets/executive/department-headcount.widget";
import { HiresLeaversWidgetProvider } from "./widgets/executive/hires-vs-leavers.widget";
import { AttendanceTodayWidgetProvider } from "./widgets/attendance/attendance-today.widget";
import { PendingLeaveRequestsWidgetProvider } from "./widgets/leave/pending-leave-requests.widget";
import { PayrollCostTrendWidgetProvider } from "./widgets/executive/payroll-cost-trend.widget";
import { AttendanceExceptionsWidgetProvider } from "./widgets/attendance/attendance-exceptions.widget";
import { PendingApprovalsWidgetProvider } from "./widgets/attendance/pending-approvals.widget";

@Module({
  controllers: [DashboardController],
  providers: [
    // Core
    DashboardService,
    DashboardWidgetRegistry,

    // Aggregate services
    WorkforceAggregateService,
    AttendanceAggregateService,
    LeaveAggregateService,
    PayrollAggregateService,
    ApprovalAggregateService,

    // Widget providers
    HeadcountWidgetProvider,
    EmployeeStatusWidgetProvider,
    DepartmentHeadcountWidgetProvider,
    HiresLeaversWidgetProvider,
    AttendanceTodayWidgetProvider,
    PendingLeaveRequestsWidgetProvider,
    PayrollCostTrendWidgetProvider,
    AttendanceExceptionsWidgetProvider,
    PendingApprovalsWidgetProvider,
  ],
})
export class DashboardModule implements OnModuleInit {
  constructor(
    private readonly registry: DashboardWidgetRegistry,
    private readonly headcount: HeadcountWidgetProvider,
    private readonly empStatus: EmployeeStatusWidgetProvider,
    private readonly deptHeadcount: DepartmentHeadcountWidgetProvider,
    private readonly hiresLeavers: HiresLeaversWidgetProvider,
    private readonly attendanceToday: AttendanceTodayWidgetProvider,
    private readonly pendingLeave: PendingLeaveRequestsWidgetProvider,
    private readonly payrollCostTrend: PayrollCostTrendWidgetProvider,
    private readonly attendanceExceptions: AttendanceExceptionsWidgetProvider,
    private readonly pendingApprovals: PendingApprovalsWidgetProvider,
  ) {}

  onModuleInit() {
    this.registry.register({
      id: DashboardWidgetId.HEADCOUNT,
      version: 1,
      enabled: true,
      category: "executive",
      type: "kpi",
      title: "Headcount",
      permissions: [Permissions.DASHBOARD_VIEW],
      priority: 10,
      cacheTTL: 300,
      provider: this.headcount,
    });

    this.registry.register({
      id: DashboardWidgetId.EMPLOYEE_STATUS,
      version: 1,
      enabled: true,
      category: "executive",
      type: "chart",
      title: "Employee Status Distribution",
      permissions: [Permissions.DASHBOARD_VIEW],
      priority: 20,
      cacheTTL: 300,
      provider: this.empStatus,
    });

    this.registry.register({
      id: DashboardWidgetId.DEPARTMENT_HEADCOUNT,
      version: 1,
      enabled: true,
      category: "executive",
      type: "chart",
      title: "Headcount by Department",
      permissions: [Permissions.DASHBOARD_VIEW],
      priority: 30,
      cacheTTL: 300,
      provider: this.deptHeadcount,
    });

    this.registry.register({
      id: DashboardWidgetId.HIRES_VS_LEAVERS,
      version: 1,
      enabled: true,
      category: "executive",
      type: "chart",
      title: "Hires vs Leavers (12 months)",
      permissions: [Permissions.DASHBOARD_VIEW],
      priority: 40,
      cacheTTL: 600,
      provider: this.hiresLeavers,
    });

    this.registry.register({
      id: DashboardWidgetId.ATTENDANCE_TODAY,
      version: 1,
      enabled: true,
      category: "attendance",
      type: "kpi",
      title: "Attendance Today",
      permissions: [Permissions.DASHBOARD_VIEW, Permissions.ATTENDANCE_REPORT],
      priority: 50,
      cacheTTL: 60,
      provider: this.attendanceToday,
    });

    this.registry.register({
      id: DashboardWidgetId.ATTENDANCE_EXCEPTIONS,
      version: 1,
      enabled: true,
      category: "attendance",
      type: "list",
      title: "Attendance Exceptions Today",
      permissions: [Permissions.DASHBOARD_VIEW, Permissions.ATTENDANCE_REPORT],
      priority: 55,
      cacheTTL: 60,
      provider: this.attendanceExceptions,
    });

    this.registry.register({
      id: DashboardWidgetId.PENDING_LEAVE_REQUESTS,
      version: 1,
      enabled: true,
      category: "leave",
      type: "list",
      title: "Pending Leave Requests",
      permissions: [Permissions.DASHBOARD_VIEW],
      priority: 60,
      cacheTTL: 120,
      provider: this.pendingLeave,
    });

    this.registry.register({
      id: DashboardWidgetId.PENDING_APPROVALS,
      version: 1,
      enabled: true,
      category: "executive",
      type: "list",
      title: "Pending Approvals",
      permissions: [Permissions.DASHBOARD_VIEW],
      priority: 65,
      cacheTTL: 60,
      provider: this.pendingApprovals,
    });

    this.registry.register({
      id: DashboardWidgetId.PAYROLL_COST_TREND,
      version: 1,
      enabled: true,
      category: "payroll",
      type: "chart",
      title: "Payroll Cost Trend (6 periods)",
      permissions: [Permissions.DASHBOARD_VIEW],
      priority: 70,
      cacheTTL: 600,
      provider: this.payrollCostTrend,
    });
  }
}
