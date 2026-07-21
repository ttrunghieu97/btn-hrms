import { PayrollRepository } from "./payroll.repository";

describe(PayrollRepository.name, () => {
  it("lists payslips", async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const db = {
      query: {
        payslips: {
          findMany,
        },
      },
      select: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([{ count: 0 }]),
        }),
      }),
    } as any;

    const repo = new PayrollRepository(db);

    await repo.findMany();

    expect(findMany).toHaveBeenCalled();
  });

  it("finds payslip by id", async () => {
    const findFirst = jest.fn().mockResolvedValue(null);
    const db = {
      query: {
        payslips: {
          findFirst,
        },
      },
    } as any;

    const repo = new PayrollRepository(db);

    await repo.findById("payroll-1");

    expect(findFirst).toHaveBeenCalled();
  });
});
