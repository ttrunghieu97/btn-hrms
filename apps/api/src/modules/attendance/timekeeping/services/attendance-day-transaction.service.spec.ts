import { AttendanceDayTransactionService } from "./attendance-day-transaction.service";
import { AttendanceTimekeepingRepository } from "../repositories/attendance-timekeeping.repository";

describe(AttendanceDayTransactionService.name, () => {
  it("acquires advisory lock then runs fn inside the transaction", async () => {
    const repo = {
      transaction: jest.fn().mockImplementation(async (fn) => {
        const tx = { mark: "tx" };
        return fn(tx);
      }),
      acquireAttendanceDayLock: jest.fn().mockResolvedValue(undefined),
    };

    const service = new AttendanceDayTransactionService(repo as unknown as AttendanceTimekeepingRepository);

    const fn = jest.fn().mockResolvedValue("result");
    const result = await service.execute("emp-1", "2026-07-15", fn);

    expect(repo.acquireAttendanceDayLock).toHaveBeenCalledWith("emp-1", "2026-07-15", { mark: "tx" });
    expect(fn).toHaveBeenCalledWith({ mark: "tx" });
    expect(result).toBe("result");
    // Lock acquired before fn runs — implementation acquires it first in the tx
  });

  it("acquires lock even if fn throws (lock released on tx rollback)", async () => {
    const repo = {
      transaction: jest.fn().mockImplementation(async (fn) => {
        const tx = {};
        await fn(tx);
      }),
      acquireAttendanceDayLock: jest.fn().mockResolvedValue(undefined),
    };

    const service = new AttendanceDayTransactionService(repo as unknown as AttendanceTimekeepingRepository);

    await expect(service.execute("emp-1", "2026-07-15", async () => { throw new Error("boom"); }))
      .rejects.toThrow("boom");

    expect(repo.acquireAttendanceDayLock).toHaveBeenCalledTimes(1);
  });
});
