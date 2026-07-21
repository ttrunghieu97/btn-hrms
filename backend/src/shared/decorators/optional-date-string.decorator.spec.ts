import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { IsOptionalDateString } from "./optional-date-string.decorator";

class TestDto {
  @IsOptionalDateString()
  date?: string;
}

describe("IsOptionalDateString", () => {
  it.each([undefined, null, "", " ", "null", " undefined "])(
    "treats %p as omitted",
    async (value) => {
      const dto = plainToInstance(TestDto, { date: value });
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.date).toBeUndefined();
    },
  );

  it("accepts a valid ISO date string", async () => {
    const dto = plainToInstance(TestDto, { date: "2026-05-03" });
    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.date).toBe("2026-05-03");
  });

  it("rejects an invalid date string", async () => {
    const dto = plainToInstance(TestDto, { date: "not-a-date" });
    const errors = await validate(dto);

    expect(errors).toHaveLength(1);
    expect(errors[0]?.constraints).toBeDefined();
  });
});
