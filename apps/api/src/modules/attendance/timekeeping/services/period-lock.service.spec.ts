import { computeAvailableActions, PeriodLockService } from "./period-lock.service";
import { Permissions } from "../../../../core/security/permissions/permissions.registry";

describe("computeAvailableActions", () => {
  it("open period: save + review with matching permissions", () => {
    const actions = computeAvailableActions("open", [
      Permissions.ATTENDANCE_TIMESHEET_MANAGE,
      Permissions.ATTENDANCE_PERIOD_REVIEW,
    ]);
    expect(actions).toContain("save");
    expect(actions).toContain("review");
    expect(actions).not.toContain("approve");
  });

  it("filters actions by permission — no save without manage, no review without periodReview", () => {
    const actions = computeAvailableActions("open", [Permissions.ATTENDANCE_PERIOD_REVIEW]);
    expect(actions).not.toContain("save");
    expect(actions).toContain("review");
  });

  it("in_review: approve/lock only with respective permissions", () => {
    const withApprove = computeAvailableActions("in_review", [Permissions.ATTENDANCE_PERIOD_APPROVE]);
    expect(withApprove).toContain("approve");
    expect(withApprove).not.toContain("lock");

    const withLock = computeAvailableActions("in_review", [Permissions.ATTENDANCE_PERIOD_LOCK]);
    expect(withLock).toContain("lock");
    expect(withLock).not.toContain("approve");
  });

  it("empty permissions yields no actions at all", () => {
    expect(computeAvailableActions("open", [])).toEqual([]);
  });

  it("sys:all bypasses permission filter", () => {
    const actions = computeAvailableActions("in_review", ["sys:all"]);
    expect(actions).toContain("approve");
    expect(actions).toContain("lock");
  });

  it("locked: unlock only (save not present)", () => {
    const actions = computeAvailableActions("locked", [Permissions.ATTENDANCE_PERIOD_UNLOCK]);
    expect(actions).toEqual(["unlock"]);
  });

  it("payroll_posted: close only with periodClose", () => {
    const actions = computeAvailableActions("payroll_posted", [Permissions.ATTENDANCE_PERIOD_CLOSE]);
    expect(actions).toEqual(["close"]);
  });

  it("closed: reopen only with periodClose", () => {
    const actions = computeAvailableActions("closed", [Permissions.ATTENDANCE_PERIOD_CLOSE]);
    expect(actions).toEqual(["reopen"]);
  });

  it("unknown status: no actions", () => {
    expect(computeAvailableActions("bogus", ["sys:all"])).toEqual([]);
  });
});

describe("PeriodLockService transactional outbox staging", () => {
  it("passes transaction handle tx when staging period transition events", async () => {
    const txHandle = { tx: "period-lock-tx" };
    const periodLockRepo = {
      ensurePeriod: jest.fn().mockResolvedValue({ period: "2026-08", status: "open" }),
      transaction: jest.fn().mockImplementation(async (cb: any) => cb(txHandle)),
      upsert: jest.fn().mockResolvedValue({ period: "2026-08", status: "in_review" }),
      recordTransition: jest.fn().mockResolvedValue(undefined),
    };
    const eventOutbox = {
      stage: jest.fn().mockResolvedValue(undefined),
    };
    const snapshotService = {
      createSnapshotForPeriod: jest.fn().mockResolvedValue(5),
    };
    const reconciliationService = {
      runReconciliation: jest.fn().mockResolvedValue(undefined),
    };

    const service = new PeriodLockService(
      periodLockRepo as any,
      eventOutbox as any,
      snapshotService as any,
      reconciliationService as any,
    );

    await service.review("user-1", "2026-08");
    expect(eventOutbox.stage).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: "timesheet.period.reviewed.v1" }),
      txHandle,
    );
  });

  it("creates a locked snapshot inside the transaction on approve", async () => {
    const txHandle = { tx: "approve-tx" };
    const periodLockRepo = {
      ensurePeriod: jest.fn().mockResolvedValue({ period: "2026-08", status: "in_review" }),
      transaction: jest.fn().mockImplementation(async (cb: any) => cb(txHandle)),
      upsert: jest.fn().mockResolvedValue({ period: "2026-08", status: "locked" }),
      recordTransition: jest.fn().mockResolvedValue(undefined),
    };
    const eventOutbox = { stage: jest.fn().mockResolvedValue(undefined) };
    const snapshotService = { createSnapshotForPeriod: jest.fn().mockResolvedValue(12) };
    const reconciliationService = { runReconciliation: jest.fn().mockResolvedValue(undefined) };

    const service = new PeriodLockService(
      periodLockRepo as any,
      eventOutbox as any,
      snapshotService as any,
      reconciliationService as any,
    );

    await service.approve("user-1", "2026-08");
    expect(snapshotService.createSnapshotForPeriod).toHaveBeenCalledWith(
      "2026-08",
      "locked",
      txHandle,
    );
    expect(periodLockRepo.recordTransition).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: { snapshotCount: 12 },
      }),
      txHandle,
    );
  });

  it("allows closing a locked period with default remarks and blocks verify/unverify when locked", async () => {
    const txHandle = { tx: "close-tx" };
    const periodLockRepo = {
      ensurePeriod: jest.fn().mockResolvedValue({ period: "2026-08", status: "locked" }),
      transaction: jest.fn().mockImplementation(async (cb: any) => cb(txHandle)),
      upsert: jest.fn().mockResolvedValue({ period: "2026-08", status: "closed" }),
      recordTransition: jest.fn().mockResolvedValue(undefined),
      verifyEmployee: jest.fn(),
      unverifyEmployee: jest.fn(),
    };
    const eventOutbox = { stage: jest.fn().mockResolvedValue(undefined) };
    const snapshotService = { createSnapshotForPeriod: jest.fn().mockResolvedValue(8) };
    const reconciliationService = { runReconciliation: jest.fn().mockResolvedValue(undefined) };

    const service = new PeriodLockService(
      periodLockRepo as any,
      eventOutbox as any,
      snapshotService as any,
      reconciliationService as any,
    );

    await expect(service.verifyEmployee("user-1", "2026-08", "emp-1")).rejects.toThrow();
    await expect(service.unverifyEmployee("2026-08", "emp-1")).rejects.toThrow();

    await service.close("user-1", "2026-08");
    expect(periodLockRepo.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        period: "2026-08",
        status: "closed",
        remarks: "Closed period",
      }),
      txHandle,
    );
  });
});
