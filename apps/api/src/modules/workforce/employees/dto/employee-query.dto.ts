import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsArray, IsBoolean, IsIn, IsOptional, IsString, IsUUID } from "class-validator";
import { FieldSelectableQueryDto } from "../../../../shared/dto/pagination.dto";

const EMPLOYEE_TABS = ["active", "official", "probation", "terminated", "deleted"] as const;

function normalizeQueryArray(value: any  ): string[] | undefined {
  if (value === undefined || value === null || value === "") return undefined;

  const raw = Array.isArray(value) ? value : [value];
  const normalized = raw
    .flatMap((item) =>
      typeof item === "string"
        ? item.split(",")
        : item === undefined || item === null
          ? []
          : [String(item)],
    )
    .map((item) => item.trim())
    .filter(Boolean);

  return normalized.length > 0 ? normalized : undefined;
}

export class EmployeeQueryDto extends FieldSelectableQueryDto {
  @ApiPropertyOptional({ description: "Filter by department ID" })
  @IsOptional()
  @IsString()
  @IsUUID("4")
  departmentId?: string;

  @ApiPropertyOptional({ description: "Filter by multiple department IDs", type: [String] })
  @IsOptional()
  @Transform(({ value }) => normalizeQueryArray(value))
  @IsArray()
  @IsUUID("4", { each: true })
  departmentIds?: string[];

  @ApiPropertyOptional({ description: "Filter by logical tab", enum: EMPLOYEE_TABS })
  @IsOptional()
  @IsString()
  @IsIn(EMPLOYEE_TABS)
  tab?: string;

  getNormalizedDepartmentIds(): string[] | undefined {
    if (this.departmentIds?.length) return this.departmentIds;
    return this.departmentId ? [this.departmentId] : undefined;
  }

  getTabFilter(): { contractType?: string; contractStatus?: string; employeeStatus?: string } | undefined {
    switch (this.tab) {
      case "active":
        return { contractStatus: "active" };
      case "official":
        return { contractStatus: "active", contractType: "permanent" };
      case "probation":
        return { contractStatus: "active", contractType: "probationary" };
      case "terminated":
        return { employeeStatus: "terminated" };
      case "deleted":
        return undefined;
      default:
        return undefined;
    }
  }

  getNormalizedSearch(): string | undefined {
    if (typeof this.search === "string" && this.search.trim()) {
      return this.search.trim();
    }

    return undefined;
  }

  @ApiPropertyOptional({ description: "Include soft-deleted employees" })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === "") return undefined;
    if (typeof value === "boolean") return value;
    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();
      if (normalized === "true" || normalized === "1") return true;
      if (normalized === "false" || normalized === "0") return false;
    }
    return value;
  })
  @IsBoolean()
  includeDeleted?: boolean;

  @ApiPropertyOptional({ description: "Filter by upcoming document expiry" })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === "") return undefined;
    if (typeof value === "boolean") return value;
    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();
      if (normalized === "true" || normalized === "1") return true;
      if (normalized === "false" || normalized === "0") return false;
    }
    return value;
  })
  @IsBoolean()
  expiringSoon?: boolean;

  @ApiPropertyOptional({ description: "Expiry status", enum: ["expiring", "overdue"] })
  @IsOptional()
  @IsString()
  @IsIn(["expiring", "overdue"])
  expiryStatus?: string;
}

export { EMPLOYEE_TABS };


