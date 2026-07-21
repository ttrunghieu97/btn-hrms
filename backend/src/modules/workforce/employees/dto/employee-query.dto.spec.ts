import "reflect-metadata";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { EmployeeQueryDto } from "./employee-query.dto";

describe(EmployeeQueryDto.name, () => {
  it("transforms expiringSoon from query string to boolean", async () => {
    const dtoTrue = plainToInstance(EmployeeQueryDto, { expiringSoon: "true" });
    const dtoOne = plainToInstance(EmployeeQueryDto, { expiringSoon: "1" });
    const dtoFalse = plainToInstance(EmployeeQueryDto, {
      expiringSoon: "false",
    });
    const dtoZero = plainToInstance(EmployeeQueryDto, { expiringSoon: "0" });

    expect(dtoTrue.expiringSoon).toBe(true);
    expect(dtoOne.expiringSoon).toBe(true);
    expect(dtoFalse.expiringSoon).toBe(false);
    expect(dtoZero.expiringSoon).toBe(false);

    await expect(validate(dtoTrue)).resolves.toHaveLength(0);
    await expect(validate(dtoOne)).resolves.toHaveLength(0);
    await expect(validate(dtoFalse)).resolves.toHaveLength(0);
    await expect(validate(dtoZero)).resolves.toHaveLength(0);
  });

  it("fails validation for invalid expiringSoon value", async () => {
    const dto = plainToInstance(EmployeeQueryDto, { expiringSoon: "abc" });
    const errors = await validate(dto);

    expect(errors).toHaveLength(1);
    expect(errors[0]?.property).toBe("expiringSoon");
  });
});
