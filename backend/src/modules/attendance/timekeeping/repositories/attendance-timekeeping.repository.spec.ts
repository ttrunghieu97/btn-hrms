import { AttendanceTimekeepingRepository } from "./attendance-timekeeping.repository";

describe(AttendanceTimekeepingRepository.name, () => {
  const mockShiftReader = {
    getEmployeeAssignmentsForRange: jest.fn().mockResolvedValue([]),
    findShiftAssignmentForEmployeeDay: jest.fn().mockResolvedValue(null),
    findAssignmentsByDate: jest.fn().mockResolvedValue([]),
  };

  it("lists clock events", async () => {
    const db = {
      query: {
        attendances: {
          findMany: jest.fn().mockResolvedValue([]),
        },
      },
      select: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([{ value: 0 }]),
        }),
      }),
    };

    const repo = new AttendanceTimekeepingRepository(db as any, mockShiftReader);
    await repo.listClockEvents({ page: 1, limit: 20 });

    expect(db.query.attendances.findMany).toHaveBeenCalled();
  });

  it("finds attendance exception by id", async () => {
    const db = {
      query: {
        attendanceExceptions: {
          findFirst: jest.fn().mockResolvedValue(null),
        },
      },
    };

    const repo = new AttendanceTimekeepingRepository(db as any, mockShiftReader);
    await repo.getExceptionById("ex-1");

    expect((db.query as any).attendanceExceptions.findFirst).toHaveBeenCalled();
  });
});
