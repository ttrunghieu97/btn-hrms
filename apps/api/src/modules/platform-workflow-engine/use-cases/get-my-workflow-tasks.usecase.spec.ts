import { Test } from "@nestjs/testing";
import { GetMyWorkflowTasksUseCase } from "./get-my-workflow-tasks.usecase";
import { WorkflowTaskAggregatorService } from "../tasks/workflow-task-aggregator.service";
import { RequestContextService } from "../../../shared/context/request-context.service";
import { LeaveTaskProvider } from "../tasks/providers/leave-task.provider";
import { ExpenseTaskProvider } from "../tasks/providers/expense-task.provider";
import { AssetTaskProvider } from "../tasks/providers/asset-task.provider";
import { ScheduleTaskProvider } from "../tasks/providers/schedule-task.provider";
import { PayrollTaskProvider } from "../tasks/providers/payroll-task.provider";
import { AttendanceTaskProvider } from "../tasks/providers/attendance-task.provider";
import { OffboardingTaskProvider } from "../tasks/providers/offboarding-task.provider";
import type { WorkflowTask } from "../tasks/interfaces/workflow-task.interface";

describe(GetMyWorkflowTasksUseCase.name, () => {
  let useCase: GetMyWorkflowTasksUseCase;
  let leaveProvider: jest.Mocked<Partial<LeaveTaskProvider>>;
  let expenseProvider: jest.Mocked<Partial<ExpenseTaskProvider>>;
  let assetProvider: jest.Mocked<Partial<AssetTaskProvider>>;
  let scheduleProvider: jest.Mocked<Partial<ScheduleTaskProvider>>;
  let payrollProvider: jest.Mocked<Partial<PayrollTaskProvider>>;
  let attendanceProvider: jest.Mocked<Partial<AttendanceTaskProvider>>;
  let offboardingProvider: jest.Mocked<Partial<OffboardingTaskProvider>>;

  const mockLeaveTask: WorkflowTask = {
    id: "leave-1",
    workflowId: "leave-request",
    domain: "leave",
    domainLabel: "Nghỉ phép",
    entityId: "req-1",
    title: "Nguyen Van A xin nghỉ phép",
    subtitle: "1 ngày",
    requesterName: "Nguyen Van A",
    currentState: "pending",
    currentStateLabel: "Chờ duyệt",
    currentStateVariant: "amber",
    requiredAction: "Phê duyệt nghỉ phép",
    priority: "high",
    createdAt: "2026-10-08T08:00:00.000Z",
    detailUrl: "/leave",
    canDirectApprove: true,
    canDirectReject: true,
  };

  const mockPayrollTask: WorkflowTask = {
    id: "payroll-1",
    workflowId: "payroll-run",
    domain: "payroll",
    domainLabel: "Bảng lương",
    entityId: "run-1",
    title: "Kỳ tính lương tháng 10",
    subtitle: "Chờ phê duyệt",
    requesterName: "Phòng Kế toán",
    currentState: "processing",
    currentStateLabel: "Chờ phê duyệt lương",
    currentStateVariant: "amber",
    requiredAction: "CFO phê duyệt chi trả",
    priority: "urgent",
    createdAt: "2026-10-08T09:00:00.000Z",
    detailUrl: "/payroll/runs/run-1",
  };

  beforeEach(async () => {
    leaveProvider = {
      domain: "leave" as any,
      getTasks: jest.fn().mockResolvedValue([mockLeaveTask]),
    };
    expenseProvider = {
      domain: "expense" as any,
      getTasks: jest.fn().mockResolvedValue([]),
    };
    assetProvider = {
      domain: "asset" as any,
      getTasks: jest.fn().mockResolvedValue([]),
    };
    scheduleProvider = {
      domain: "schedule" as any,
      getTasks: jest.fn().mockResolvedValue([]),
    };
    payrollProvider = {
      domain: "payroll" as any,
      getTasks: jest.fn().mockResolvedValue([mockPayrollTask]),
    };
    attendanceProvider = {
      domain: "attendance" as any,
      getTasks: jest.fn().mockResolvedValue([]),
    };
    offboardingProvider = {
      domain: "offboarding" as any,
      getTasks: jest.fn().mockResolvedValue([]),
    };

    const mod = await Test.createTestingModule({
      providers: [
        GetMyWorkflowTasksUseCase,
        WorkflowTaskAggregatorService,
        {
          provide: RequestContextService,
          useValue: { get: jest.fn().mockReturnValue({ userId: "u-1" }) },
        },
        { provide: LeaveTaskProvider, useValue: leaveProvider },
        { provide: ExpenseTaskProvider, useValue: expenseProvider },
        { provide: AssetTaskProvider, useValue: assetProvider },
        { provide: ScheduleTaskProvider, useValue: scheduleProvider },
        { provide: PayrollTaskProvider, useValue: payrollProvider },
        { provide: AttendanceTaskProvider, useValue: attendanceProvider },
        { provide: OffboardingTaskProvider, useValue: offboardingProvider },
      ],
    }).compile();

    useCase = mod.get(GetMyWorkflowTasksUseCase);
  });

  it("aggregates tasks across providers with accurate counts and sorting", async () => {
    const result = await useCase.execute("u-1");

    expect(result.total).toBe(2);
    expect(result.countsByDomain.all).toBe(2);
    expect(result.countsByDomain.leave).toBe(1);
    expect(result.countsByDomain.payroll).toBe(1);
    expect(result.countsByDomain.expense).toBe(0);

    // Urgent (payroll) should be sorted before high (leave)
    expect(result.tasks[0].domain).toBe("payroll");
    expect(result.tasks[1].domain).toBe("leave");
  });

  it("filters tasks by domain when requested", async () => {
    const result = await useCase.execute("u-1", "leave");

    expect(result.total).toBe(1);
    expect(result.tasks[0].domain).toBe("leave");
    // countsByDomain should still reflect total across all domains
    expect(result.countsByDomain.all).toBe(2);
    expect(result.countsByDomain.payroll).toBe(1);
  });

  it("handles provider failures gracefully without breaking aggregation", async () => {
    expenseProvider.getTasks = jest.fn().mockRejectedValue(new Error("Database timeout"));

    const result = await useCase.execute("u-1");

    expect(result.total).toBe(2);
    expect(result.countsByDomain.all).toBe(2);
  });
});
