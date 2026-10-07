import { ListOffboardingsUseCase } from "./list-offboardings.usecase";

describe(ListOffboardingsUseCase.name, () => {
  it("returns paginated offboarding list", async () => {
    const processReader = {
      findByType: jest.fn().mockResolvedValue({
        rows: [
          { id: "proc-1", employeeId: "emp-1", status: "in_progress",
            startDate: "2026-07-01", completedAt: null, createdAt: new Date() },
        ],
        total: 1,
      }),
    };
    const useCase = new ListOffboardingsUseCase(processReader as any);
    const result = await useCase.execute(1, 20);

    expect(processReader.findByType).toHaveBeenCalledWith("offboarding", 1, 20);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]!.status).toBe("in_progress");
    expect(result.total).toBe(1);
  });
});
