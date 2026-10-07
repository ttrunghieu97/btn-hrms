import { AttendanceAdjustmentReaderAdapter } from "./attendance-adjustment-reader.adapter";

describe("AttendanceAdjustmentReaderAdapter", () => {
  let adapter: AttendanceAdjustmentReaderAdapter;
  let mockAdjustmentService: any;

  beforeEach(() => {
    mockAdjustmentService = {
      getEffectiveDelta: jest.fn(),
      getEffectiveDeltasForEmployees: jest.fn(),
    };
    adapter = new AttendanceAdjustmentReaderAdapter(mockAdjustmentService);
  });

  it("returns empty array when employeeIds is empty", async () => {
    const result = await adapter.getAdjustmentDeltas("2026-08", []);
    expect(result).toEqual([]);
    expect(mockAdjustmentService.getEffectiveDeltasForEmployees).not.toHaveBeenCalled();
  });

  it("maps bulk deltas to AttendanceAdjustmentDelta array", async () => {
    const deltasMap = new Map([
      ["emp-1", new Map([["REGULAR_HOURS", 2], ["OVERTIME_HOURS", 1]])],
      ["emp-2", new Map([["OVERTIME_HOURS", 3]])],
      ["emp-3", new Map()],
    ]);
    mockAdjustmentService.getEffectiveDeltasForEmployees.mockResolvedValue(deltasMap);

    const result = await adapter.getAdjustmentDeltas("2026-08", ["emp-1", "emp-2", "emp-3"]);

    expect(result).toHaveLength(2);
    expect(result).toEqual([
      {
        employeeId: "emp-1",
        period: "2026-08",
        regularHoursDelta: 2,
        overtimeHoursDelta: 1,
      },
      {
        employeeId: "emp-2",
        period: "2026-08",
        regularHoursDelta: 0,
        overtimeHoursDelta: 3,
      },
    ]);
  });
});
