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

  it("enforces the canonical 6-value employee status contract across UpdateEmployeeDto, BulkStatusDto, ChangeEmployeeStatusDto, and EmployeeQueryDto", async () => {
    const { EMPLOYEE_STATUS_VALUES } = await import("./create-employee.dto");
    const { UpdateEmployeeDto } = await import("./update-employee.dto");
    const { BulkStatusDto } = await import("./bulk-status.dto");
    const { ChangeEmployeeStatusDto } = await import("./change-employee-status.dto");
    const { EmployeeQueryDto } = await import("./employee-query.dto");

    expect(EMPLOYEE_STATUS_VALUES).toEqual([
      "working",
      "probation",
      "terminated",
      "leave",
      "suspended",
      "retired",
    ]);

    for (const validStatus of EMPLOYEE_STATUS_VALUES) {
      const updateDto = plainToInstance(UpdateEmployeeDto, { status: validStatus });
      expect(await validate(updateDto)).toEqual([]);

      const bulkDto = plainToInstance(BulkStatusDto, {
        employeeIds: ["emp-1"],
        status: validStatus,
      });
      expect(await validate(bulkDto)).toEqual([]);

      const queryDto = plainToInstance(EmployeeQueryDto, { status: validStatus });
      expect(await validate(queryDto)).toEqual([]);
    }

    for (const validChangeStatus of EMPLOYEE_STATUS_VALUES) {
      const changeDto = plainToInstance(ChangeEmployeeStatusDto, { status: validChangeStatus });
      expect(await validate(changeDto)).toEqual([]);
    }

    // Non-canonical frontend/legacy display strings must be rejected by all backend DTOs
    for (const legacyDisplayStatus of ["ACTIVE", "ON_LEAVE", "RESIGNED", "ARCHIVED"]) {
      const badChange = plainToInstance(ChangeEmployeeStatusDto, { status: legacyDisplayStatus });
      expect((await validate(badChange)).length).toBeGreaterThan(0);
      const badUpdate = plainToInstance(UpdateEmployeeDto, { status: legacyDisplayStatus });
      expect((await validate(badUpdate)).length).toBeGreaterThan(0);

      const badBulk = plainToInstance(BulkStatusDto, {
        employeeIds: ["emp-1"],
        status: legacyDisplayStatus,
      });
      expect((await validate(badBulk)).length).toBeGreaterThan(0);

      const badQuery = plainToInstance(EmployeeQueryDto, { status: legacyDisplayStatus });
      expect((await validate(badQuery)).length).toBeGreaterThan(0);
    }
  });
});
