import { TaskAssigneePerformanceReportUseCase } from "./task-assignee-performance-report.usecase";

describe("TaskAssigneePerformanceReportUseCase", () => {
  it("aggregates item metrics and summary rates", async () => {
    const repo = {
      run: jest.fn().mockResolvedValue([
        {
          assignee_id: "emp-1",
          employee_code: "E001",
          assignee_name: "Nguyen Van A",
          department_name: "Engineering",
          total_assigned: 10,
          completed_count: 8,
          active_count: 2,
          overdue_count: 1,
          on_time_completed_count: 6,
          avg_completion_hours: 12.5,
        },
        {
          assignee_id: "emp-2",
          employee_code: "E002",
          assignee_name: "Tran Thi B",
          department_name: "Engineering",
          total_assigned: 5,
          completed_count: 2,
          active_count: 3,
          overdue_count: 2,
          on_time_completed_count: 1,
          avg_completion_hours: 20,
        },
      ]),
    };

    const useCase = new TaskAssigneePerformanceReportUseCase(repo as any, {} as any);
    const result = await useCase.execute({});

    expect(repo.run).toHaveBeenCalledTimes(1);
    expect(result.items).toHaveLength(2);
    expect(result.items[0]).toMatchObject({
      assigneeId: "emp-1",
      completionRate: 80,
      onTimeCompletionRate: 75,
      avgCompletionHours: 12.5,
    });
    expect(result.summary).toMatchObject({
      totalAssignees: 2,
      totalAssigned: 15,
      completedCount: 10,
      activeCount: 5,
      overdueCount: 3,
      onTimeCompletedCount: 7,
      completionRate: 66.67,
      onTimeCompletionRate: 70,
      avgCompletionHours: 14,
    });
  });
});
