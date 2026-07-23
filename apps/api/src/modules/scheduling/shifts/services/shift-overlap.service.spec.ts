import { ShiftOverlapService } from "../schedule-roster/services/shift-overlap.service";

describe("ShiftOverlapService", () => {
  let service: ShiftOverlapService;

  beforeEach(() => {
    service = new ShiftOverlapService();
  });

  it("should detect conflict when ranges overlap", () => {
    const existing = [
      { effectiveFrom: "2026-01-01", effectiveTo: "2026-01-31" },
    ];
    const target = { effectiveFrom: "2026-01-15", effectiveTo: "2026-02-15" };
    expect(service.hasConflict(target, existing)).toBe(true);
  });

  it("should detect conflict with open-ended existing assignment", () => {
    const existing = [{ effectiveFrom: "2026-01-01", effectiveTo: null }];
    const target = { effectiveFrom: "2026-02-01", effectiveTo: "2026-02-28" };
    expect(service.hasConflict(target, existing)).toBe(true);
  });

  it("should detect conflict with open-ended target assignment", () => {
    const existing = [
      { effectiveFrom: "2026-01-01", effectiveTo: "2026-01-31" },
    ];
    const target = { effectiveFrom: "2026-01-15", effectiveTo: undefined };
    expect(service.hasConflict(target, existing)).toBe(true);
  });

  it("should not detect conflict for adjacent non-overlapping ranges", () => {
    const existing = [
      { effectiveFrom: "2026-01-01", effectiveTo: "2026-01-31" },
    ];
    const target = { effectiveFrom: "2026-02-01", effectiveTo: "2026-02-28" };
    expect(service.hasConflict(target, existing)).toBe(false);
  });
});
