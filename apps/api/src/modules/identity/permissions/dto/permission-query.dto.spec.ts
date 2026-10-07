import "reflect-metadata";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { PermissionQueryRequestDto } from "./permission-query.dto";

describe(PermissionQueryRequestDto.name, () => {
  it("uses search as the canonical free-text field", async () => {
    const dto = plainToInstance(PermissionQueryRequestDto, { search: "users:view" });

    expect(dto.getNormalizedSearch()).toBe("users:view");
    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it("accepts q as a backward-compatible alias", async () => {
    const dto = plainToInstance(PermissionQueryRequestDto, { q: "employees:view" });

    expect(dto.getNormalizedSearch()).toBe("employees:view");
    await expect(validate(dto)).resolves.toHaveLength(0);
  });
});
