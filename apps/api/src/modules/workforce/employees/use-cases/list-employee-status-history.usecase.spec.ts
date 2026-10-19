import { ListEmployeeStatusHistoryUseCase } from "./list-employee-status-history.usecase";

describe("ListEmployeeStatusHistoryUseCase", () => {
  it("populates changedByName from joined employee fullName or username", async () => {
    const repo = {
      listStatusHistory: jest.fn().mockResolvedValue([
        {
          id: "h1",
          status: "working",
          notes: "Promoted",
          changedAt: new Date("2026-06-01T00:00:00Z"),
          changedBy: "u1",
          changedByUsername: "nguyenvana",
          changedByFirstName: "An",
          changedByLastName: "Nguyen Van",
        },
        {
          id: "h2",
          status: "probation",
          notes: "Hired",
          changedAt: new Date("2026-03-01T00:00:00Z"),
          changedBy: "u2",
          changedByUsername: "hr_admin",
          changedByFirstName: null,
          changedByLastName: null,
        },
      ]),
    };

    const useCase = new ListEmployeeStatusHistoryUseCase(repo as any);
    const result = await useCase.execute("emp-1");

    expect(result).toEqual([
      {
        id: "h1",
        status: "working",
        notes: "Promoted",
        changedAt: new Date("2026-06-01T00:00:00Z"),
        changedByUserId: "u1",
        changedByName: "Nguyen Van An",
      },
      {
        id: "h2",
        status: "probation",
        notes: "Hired",
        changedAt: new Date("2026-03-01T00:00:00Z"),
        changedByUserId: "u2",
        changedByName: "hr_admin",
      },
    ]);
  });
});
