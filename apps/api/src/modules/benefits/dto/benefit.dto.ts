import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import {
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from "class-validator";

const emptyStringToUndefined = ({ value }: { value: unknown }) =>
  value === "" ? undefined : value;

const optionalNumberTransform = ({ value }: { value: unknown }) => {
  if (value === "" || value === null || value === undefined) return undefined;
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim() !== "") return Number(value);
  return value;
};

export class CreatePlanDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(emptyStringToUndefined)
  @IsUUID()
  providerId?: string;

  @ApiProperty({ enum: ["employee_only", "employee_plus_one", "family"] })
  @IsIn(["employee_only", "employee_plus_one", "family"])
  coverageType!: "employee_only" | "employee_plus_one" | "family";

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(optionalNumberTransform)
  @IsNumber()
  @Min(0)
  employerContribution?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(optionalNumberTransform)
  @IsNumber()
  @Min(0)
  employeeContribution?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(emptyStringToUndefined)
  @IsDateString()
  effectiveFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(emptyStringToUndefined)
  @IsDateString()
  effectiveTo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(optionalNumberTransform)
  @IsInt()
  @Min(0)
  maxEligibleAge?: number;
}

export class EnrollEmployeeDto {
  @ApiProperty()
  @IsUUID()
  planId!: string;

  @ApiProperty()
  @IsUUID()
  employeeId!: string;

  @ApiProperty({ enum: ["employee_only", "employee_plus_one", "family"] })
  @IsIn(["employee_only", "employee_plus_one", "family"])
  coverageType!: "employee_only" | "employee_plus_one" | "family";

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(emptyStringToUndefined)
  @IsDateString()
  effectiveFrom?: string;
}

export class AddDependentDto {
  @ApiProperty()
  @IsUUID()
  enrollmentId!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  fullName!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  relationship!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(emptyStringToUndefined)
  @IsDateString()
  dateOfBirth?: string;
}

export class PlanResponseDto {
  id!: string;
  name!: string;
  status!: string;
  coverageType!: string;
  employerContribution!: string;
  employeeContribution!: string;
}

export class EnrollmentResponseDto {
  id!: string;
  planId!: string;
  employeeId!: string;
  status!: string;
  coverageType!: string;
  effectiveFrom?: string | null;
  enrolledAt?: string;
}
