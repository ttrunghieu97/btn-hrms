import { PayrollRunsRepository } from "./payroll-runs.repository";

describe(PayrollRunsRepository.name, () => {
  it("lists payroll runs", async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const db = {
      query: {
        payrollRuns: {
          findMany,
        },
      },
      select: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([{ value: 0 }]),
        }),
      }),
    } as any;

    const repo = new PayrollRunsRepository(db);

    await repo.findMany();

    expect(findMany).toHaveBeenCalled();
  });

  it("finds payroll run by id", async () => {
    const findFirst = jest.fn().mockResolvedValue(null);
    const db = {
      query: {
        payrollRuns: {
          findFirst,
        },
      },
    } as any;

    const repo = new PayrollRunsRepository(db);

    await repo.findById("payroll-run-1");

    expect(findFirst).toHaveBeenCalled();
  });
});
