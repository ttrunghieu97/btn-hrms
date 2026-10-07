import { computeAvailableActions } from "./period-lock.service";
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
