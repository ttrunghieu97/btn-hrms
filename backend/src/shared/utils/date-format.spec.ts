import { todayDateString, formatDateISO, formatDateVN, formatDateTimeVN, normalizeDdMmYyyyToIsoDate } from "./date-format";

describe("todayDateString", () => {
  it("returns YYYY-MM-DD in Asia/Ho_Chi_Minh", () => {
    const result = todayDateString("Asia/Ho_Chi_Minh");
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("defaults to Asia/Ho_Chi_Minh", () => {
    const result = todayDateString();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("returns correct date with custom date param", () => {
    // 2026-07-18 17:00 UTC = 2026-07-19 00:00 VN
    const result = todayDateString("Asia/Ho_Chi_Minh", new Date("2026-07-18T17:00:00Z"));
    expect(result).toBe("2026-07-19");
  });

  it("cross-timezone UTC date does NOT match toISOString", () => {
    // At 00:30 VN, new Date().toISOString() returns PREVIOUS day's date
    const vnResult = todayDateString("Asia/Ho_Chi_Minh", new Date("2026-07-19T00:30:00+07:00"));
    const utcResult = new Date("2026-07-19T00:30:00+07:00").toISOString().slice(0, 10);
    // VN sees July 19, UTC sees July 18 ← THIS IS THE BUG WE FIXED
    expect(vnResult).toBe("2026-07-19");
    expect(utcResult).toBe("2026-07-18");
    expect(vnResult).not.toBe(utcResult);
  });
});

describe("formatDateISO", () => {
  it("formats Date to YYYY-MM-DD in given timezone", () => {
    const date = new Date("2026-07-18T17:00:00Z");
    const result = formatDateISO(date, "Asia/Ho_Chi_Minh");
    expect(result).toBe("2026-07-19");
  });
});

describe("formatDateVN", () => {
  it("formats with DD/MM/YYYY structure", () => {
    const result = formatDateVN("2026-07-19", "Asia/Ho_Chi_Minh");
    // Should contain day, month, year separated by /
    expect(result).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/);
    expect(result).toContain("19");
    expect(result).toContain("2026");
  });

  it("handles cross-timezone boundary", () => {
    // 17:00 UTC = 00:00 UTC+7 next day
    const result = formatDateVN(new Date("2026-07-18T17:00:00Z"), "Asia/Ho_Chi_Minh");
    expect(result).toMatch(/^19\//); // Day should be 19 in VN
  });
});

describe("formatDateTimeVN", () => {
  it("formats with time", () => {
    const result = formatDateTimeVN(new Date("2026-07-19T14:30:00Z"), "Asia/Ho_Chi_Minh");
    // 14:30 UTC = 21:30 VN
    expect(result).toContain("21:30");
  });
});

describe("normalizeDdMmYyyyToIsoDate", () => {
  it("converts DD/MM/YYYY to YYYY-MM-DD", () => {
    expect(normalizeDdMmYyyyToIsoDate("18/07/2026")).toBe("2026-07-18");
  });

  it("returns null for invalid format", () => {
    expect(normalizeDdMmYyyyToIsoDate("2026-07-18")).toBeNull();
  });

  it("returns null for invalid date", () => {
    expect(normalizeDdMmYyyyToIsoDate("31/02/2026")).toBeNull();
  });
});
