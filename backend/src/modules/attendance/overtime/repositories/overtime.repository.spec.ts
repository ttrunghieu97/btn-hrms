import { OvertimeRepository } from "./overtime.repository";

describe(OvertimeRepository.name, () => {
  it("lists overtime requests", async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const db = {
      query: {
        attendanceOvertimeRequests: {
          findMany,
        },
      },
    } as any;

    const repo = new OvertimeRepository(db);
    await repo.findMany({});

    expect(findMany).toHaveBeenCalled();
  });

  it("finds overtime by id", async () => {
    const findFirst = jest.fn().mockResolvedValue(null);
    const db = {
      query: {
        attendanceOvertimeRequests: {
          findFirst,
        },
      },
    } as any;

    const repo = new OvertimeRepository(db);
    await repo.findById("ot-1");

    expect(findFirst).toHaveBeenCalled();
  });
});
