import "reflect-metadata";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { AuditLogQueryDto } from "./audit-log-query.dto";

describe(AuditLogQueryDto.name, () => {
  it("uses search as the canonical free-text field", async () => {
    const dto = plainToInstance(AuditLogQueryDto, { search: "login" });

    expect(dto.getNormalizedSearch()).toBe("login");
    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it("accepts legacy q as a backward-compatible alias", async () => {
    const dto = plainToInstance(AuditLogQueryDto, { q: "employee" });

    expect(dto.getNormalizedSearch()).toBe("employee");
    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it("prefers search when both search and q are provided", async () => {
    const dto = plainToInstance(AuditLogQueryDto, {
      search: "policy",
      q: "ignored",
    });

    expect(dto.getNormalizedSearch()).toBe("policy");
    await expect(validate(dto)).resolves.toHaveLength(0);
  });
});
