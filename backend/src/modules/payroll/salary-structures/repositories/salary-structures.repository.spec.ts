import { SalaryStructuresRepository } from "./salary-structures.repository";

describe(SalaryStructuresRepository.name, () => {
  it("lists salary structures", async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const db = {
      query: {
        salaryStructures: {
          findMany,
        },
      },
      select: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([{ value: 0 }]),
        }),
      }),
    } as any;

    const repo = new SalaryStructuresRepository(db);

    await repo.findMany();

    expect(findMany).toHaveBeenCalled();
  });

  it("finds salary structure by id", async () => {
    const findFirst = jest.fn().mockResolvedValue(null);
    const db = {
      query: {
        salaryStructures: {
          findFirst,
        },
      },
    } as any;

    const repo = new SalaryStructuresRepository(db);

    await repo.findById("salary-1");

    expect(findFirst).toHaveBeenCalled();
  });
});
