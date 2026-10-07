import { NormalizeDateInputPipe } from "./normalize-date-input.pipe";

describe("NormalizeDateInputPipe", () => {
  const pipe = new NormalizeDateInputPipe();

  it("normalizes dd/MM/yyyy strings to ISO yyyy-MM-dd", () => {
    const result = pipe.transform(
      {
        startDate: "19/03/2026",
        nested: {
          endDate: "01/01/2027",
        },
      },
      { type: "body", metatype: Object, data: "" },
    ) as any;

    expect(result.startDate).toBe("2026-03-19");
    expect(result.nested.endDate).toBe("2027-01-01");
  });

  it("keeps non-date strings unchanged", () => {
    const result = pipe.transform(
      {
        note: "hop vao ngay 19/03",
        username: "john.doe",
      },
      { type: "body", metatype: Object, data: "" },
    ) as any;

    expect(result.note).toBe("hop vao ngay 19/03");
    expect(result.username).toBe("john.doe");
  });

  it("does not normalize invalid dd/MM/yyyy values", () => {
    const result = pipe.transform(
      {
        startDate: "31/02/2026",
      },
      { type: "body", metatype: Object, data: "" },
    ) as any;

    expect(result.startDate).toBe("31/02/2026");
  });
});
