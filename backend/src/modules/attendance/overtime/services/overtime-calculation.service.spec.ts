import { OvertimeCalculationService } from "./overtime-calculation.service";

describe("OvertimeCalculationService", () => {
  let service: OvertimeCalculationService;

  beforeEach(() => {
    service = new OvertimeCalculationService();
  });

  it("calculates positive overtime when worked minutes exceed scheduled minutes", () => {
    const result = service.calculateCandidateMinutes({
      workedMinutes: 600,
      scheduledMinutes: 480,
    });
    expect(result).toBe(120);
  });

  it("returns 0 when worked minutes equal scheduled minutes", () => {
    const result = service.calculateCandidateMinutes({
      workedMinutes: 480,
      scheduledMinutes: 480,
    });
    expect(result).toBe(0);
  });

  it("returns 0 and prevents negative values when worked minutes are less than scheduled", () => {
    const result = service.calculateCandidateMinutes({
      workedMinutes: 400,
      scheduledMinutes: 480,
    });
    expect(result).toBe(0);
  });

  it("handles 0 scheduled minutes correctly (e.g. rest day work)", () => {
    const result = service.calculateCandidateMinutes({
      workedMinutes: 300,
      scheduledMinutes: 0,
    });
    expect(result).toBe(300);
  });
});
