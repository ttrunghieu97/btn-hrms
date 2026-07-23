import { ListPositionsUseCase } from "./list-positions.usecase";

describe(ListPositionsUseCase.name, () => {
  it("returns positions with employee counts", async () => {
    const repo = {
      getActivePositions: jest.fn().mockResolvedValue([
        { id: "pos-1", name: "Engineer", description: null, isActive: true },
        { id: "pos-2", name: "Manager", description: null, isActive: true },
      ]),
    };
    const employeeReader = {
      countActiveEmployeesByPositions: jest.fn().mockResolvedValue({ "pos-1": 5, "pos-2": 1 }),
    };
    const useCase = new ListPositionsUseCase(repo as any, {} as any, employeeReader as any);
    const result = await useCase.execute({});

    expect(result.data).toHaveLength(2);
    expect(result.data[0]!.employeeCount).toBe(5);
  });
});
