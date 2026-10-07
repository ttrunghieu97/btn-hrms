import { computeNextRunAt } from "./task-recurrence.service";

describe("computeNextRunAt", () => {
  it("computes the next minute match", () => {
    const from = new Date("2026-04-21T10:05:30.000Z");
    expect(computeNextRunAt("*/15 * * * *", from).toISOString()).toBe(
      "2026-04-21T10:15:00.000Z",
    );
  });

  it("supports exact day-of-week expressions", () => {
    const from = new Date("2026-04-21T10:05:00.000Z");
    expect(computeNextRunAt("0 9 * * 3", from).toISOString()).toBe(
      "2026-04-22T09:00:00.000Z",
    );
  });

  it("supports ranges and lists", () => {
    const from = new Date("2026-04-21T10:05:00.000Z");
    expect(computeNextRunAt("30 8-10 * * 2,4", from).toISOString()).toBe(
      "2026-04-21T10:30:00.000Z",
    );
  });
});
