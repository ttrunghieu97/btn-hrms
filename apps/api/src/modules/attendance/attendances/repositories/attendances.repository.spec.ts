import { AttendancesRepository } from "./attendances.repository";

describe(AttendancesRepository.name, () => {
  const metricsService = {
    incrementAttendanceDuplicate: jest.fn(),
  } as any;

  it("lists attendances", async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const db = {
      query: {
        attendances: {
          findMany,
        },
      },
    } as any;

    const repo = new AttendancesRepository(db, metricsService);

    await repo.findMany();

    expect(findMany).toHaveBeenCalled();
  });

  it("finds attendance by id", async () => {
    const findFirst = jest.fn().mockResolvedValue(null);
    const db = {
      query: {
        attendances: {
          findFirst,
        },
      },
    } as any;

    const repo = new AttendancesRepository(db, metricsService);
    await repo.findById("attendance-1");

    expect(findFirst).toHaveBeenCalled();
  });
});

