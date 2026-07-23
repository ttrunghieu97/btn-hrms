import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { CreateEmployeeDto } from "./create-employee.dto";

describe(CreateEmployeeDto.name, () => {
  it("accepts multipart JSON fields before validation (keep/remove only, no replace)", async () => {
    const dto = plainToInstance(CreateEmployeeDto, {
      firstName: "Hiếu",
      lastName: "Tề Trung",
      username: "hieutt",
      employeeCode: "EMP001",
      avatar: JSON.stringify({ mode: "keep", attachmentId: "att-avatar" }),
      documents: JSON.stringify([]),
      certifications: JSON.stringify([]),
    });

    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    expect(errors).toEqual([]);
    expect(dto.avatar).toEqual({ mode: "keep", attachmentId: "att-avatar" });
    expect(dto.documents).toEqual([]);
    expect(dto.certifications).toEqual([]);
  });
});
