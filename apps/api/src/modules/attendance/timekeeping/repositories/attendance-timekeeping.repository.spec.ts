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

  describe("upsertSessionClockEvent (AUD-01 & AUD-02)", () => {
    it("rejects invalid time strings before mutating existing clock events", async () => {
      const deleteMock = jest.fn();
      const db = {
        delete: deleteMock,
        select: jest.fn(),
        insert: jest.fn(),
      };
      const repo = new AttendanceTimekeepingRepository(db as any, mockShiftReader);

      for (const badTime of ["25:00", "08:75", "9999", "::", "invalid"]) {
        await expect(
          repo.upsertSessionClockEvent({
            employeeId: "emp-1",
            workDate: "2026-10-02",
            session: "morning",
            type: "check_in",
            timeStr: badTime,
          }),
        ).rejects.toThrow();
      }
      expect(deleteMock).not.toHaveBeenCalled();
    });

    it("deletes matching explicit session events and legacy null-session events in the same slot while preserving other slots", async () => {
      const morningNullTime = new Date(2026, 9, 2, 7, 45, 0);
      const afternoonNullTime = new Date(2026, 9, 2, 13, 15, 0);
      const deleteWhereMock = jest.fn().mockResolvedValue(undefined);
      const returningMock = jest.fn().mockResolvedValue([{ id: "inserted-1" }]);
      const insertValuesMock = jest.fn().mockReturnValue({ returning: returningMock });

      const db = {
        delete: jest.fn().mockReturnValue({ where: deleteWhereMock }),
        select: jest.fn().mockReturnValue({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue([
              { id: "null-morning-1", time: morningNullTime },
              { id: "null-afternoon-1", time: afternoonNullTime },
            ]),
          }),
        }),
        insert: jest.fn().mockReturnValue({ values: insertValuesMock }),
      };

      const repo = new AttendanceTimekeepingRepository(db as any, mockShiftReader);
      await repo.upsertSessionClockEvent({
        employeeId: "emp-1",
        workDate: "2026-10-02",
        session: "morning",
        type: "check_in",
        timeStr: "08:00",
      });

      // 1 delete for explicit session='morning', 1 delete for matching null-session morning event ('null-morning-1')
      expect(db.delete).toHaveBeenCalledTimes(2);
      expect(insertValuesMock).toHaveBeenCalledTimes(1);
      const insertedArg = insertValuesMock.mock.calls[0][0];
      expect(insertedArg.employeeId).toBe("emp-1");
      expect(insertedArg.date).toBe("2026-10-02");
      expect(insertedArg.session).toBe("morning");
      expect(insertedArg.type).toBe("check_in");
      expect((insertedArg.time as Date).getHours()).toBe(8);
      expect((insertedArg.time as Date).getMinutes()).toBe(0);
    });

    it("clears explicit and null-session events without inserting when timeStr is null or empty", async () => {
      const morningNullTime = new Date(2026, 9, 2, 8, 0, 0);
      const deleteWhereMock = jest.fn().mockResolvedValue(undefined);
      const insertMock = jest.fn();

      const db = {
        delete: jest.fn().mockReturnValue({ where: deleteWhereMock }),
        select: jest.fn().mockReturnValue({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue([{ id: "null-morning-1", time: morningNullTime }]),
          }),
        }),
        insert: insertMock,
      };

      const repo = new AttendanceTimekeepingRepository(db as any, mockShiftReader);
      await repo.upsertSessionClockEvent({
        employeeId: "emp-1",
        workDate: "2026-10-02",
        session: "morning",
        type: "check_in",
        timeStr: null,
      });

      expect(db.delete).toHaveBeenCalledTimes(2);
      expect(insertMock).not.toHaveBeenCalled();
    });
  });
});
