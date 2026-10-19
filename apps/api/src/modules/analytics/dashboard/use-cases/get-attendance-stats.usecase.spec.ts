import { DashboardController } from "../dashboard.controller";
import { GetAttendanceStatsUseCase } from "./get-attendance-stats.usecase";
import { Permissions } from "../../../../core/security/permissions/permissions.registry";

describe("GetAttendanceStatsUseCase & DashboardController.getAttendanceStats", () => {
  const attendanceAggregate = {
    getTodaySummary: jest.fn(),
    getAttendanceTrend: jest.fn(),
    getExceptionSummary: jest.fn(),
    getOvertimeSummary: jest.fn(),
    getPeriodMetrics: jest.fn(),
    getDepartmentAttendanceMetrics: jest.fn(),
  };

  const workforceAggregate = {
    getSnapshot: jest.fn(),
    getDepartmentHeadcounts: jest.fn(),
  };

  const useCase = new GetAttendanceStatsUseCase(
    attendanceAggregate as never,
    workforceAggregate as never,
  );

  const dashboardService = { getWidgets: jest.fn() };
  const controller = new DashboardController(
    dashboardService as never,
    useCase,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    attendanceAggregate.getTodaySummary.mockResolvedValue({
      presentCount: 18,
      totalCheckIns: 18,
    });
    workforceAggregate.getSnapshot.mockResolvedValue({
      totalEmployees: 20,
      activeEmployees: 20,
      probationEmployees: 2,
      terminatedEmployees: 0,
    });
    workforceAggregate.getDepartmentHeadcounts.mockResolvedValue([
      { departmentId: "dept-eng", departmentName: "Engineering", count: 12 },
      { departmentId: "dept-hr", departmentName: "HR", count: 8 },
    ]);
    attendanceAggregate.getAttendanceTrend.mockResolvedValue([
      { date: "2026-10-19", present: 18, late: 2, absent: 2 },
    ]);
    attendanceAggregate.getExceptionSummary.mockResolvedValue([
      { type: "MISSING_CHECKOUT", count: 3, pending: 2, resolved: 1 },
    ]);
    attendanceAggregate.getOvertimeSummary.mockResolvedValue({
      approvedMinutes: 240,
      pendingMinutes: 60,
      employeeCount: 4,
    });
    attendanceAggregate.getPeriodMetrics.mockResolvedValue({
      presentRecords: 180,
      totalRecords: 200,
      avgWorkedMinutes: 480,
    });
    attendanceAggregate.getDepartmentAttendanceMetrics.mockResolvedValue([
      { departmentId: "dept-eng", presentRecords: 114, totalRecords: 120 },
      { departmentId: "dept-hr", presentRecords: 66, totalRecords: 80 },
    ]);
  });

  it("rejects callers who only hold self-scoped attendance:view:self on DashboardController.getAttendanceStats", async () => {
    await expect(
      controller.getAttendanceStats("2026-10", {
        user: {
          id: "u-emp",
          employeeId: "emp-1",
          permissions: [Permissions.ATTENDANCE_VIEW_SELF],
        } as never,
      }),
    ).rejects.toThrow(/Insufficient permissions|Forbidden/i);
  });

  it("returns full company-wide attendance analytics for HR/Admin with attendance:report or attendance:view:all", async () => {
    const result = await controller.getAttendanceStats("2026-10", {
      user: {
        id: "u-hr",
        employeeId: "emp-hr",
        permissions: [Permissions.ATTENDANCE_REPORT],
      } as never,
    });

    expect(result.summary.attendanceRate).toBe(90);
    expect(result.summary.presentToday).toBe(18);
    expect(result.summary.totalEmployees).toBe(20);
    expect(result.summary.pendingExceptions).toBe(2);
    expect(result.summary.avgWorkedHours).toBe(8);
    expect(result.departmentRates).toHaveLength(2);
    expect(result.departmentRates[0]).toEqual({
      departmentName: "Engineering",
      totalEmployees: 12,
      attendanceRate: 95,
    });
  });

  it("scopes departmentRates to the caller's department when user only has attendance:view:department", async () => {
    const result = await controller.getAttendanceStats("2026-10", {
      user: {
        id: "u-mgr",
        employeeId: "emp-mgr",
        departmentId: "dept-eng",
        permissions: [Permissions.ATTENDANCE_VIEW_DEPARTMENT],
      } as never,
    });

    expect(result.departmentRates).toEqual([
      {
        departmentName: "Engineering",
        totalEmployees: 12,
        attendanceRate: 95,
      },
    ]);
  });
});
