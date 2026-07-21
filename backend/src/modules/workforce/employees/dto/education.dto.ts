import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsString, IsBoolean, IsNumber, IsUUID, Min, Max } from "class-validator";

export enum EducationLevel {
  PRIMARY = "primary",
  LOWER_SECONDARY = "lower_secondary",
  UPPER_SECONDARY = "upper_secondary",
  VOCATIONAL = "vocational",
  COLLEGE = "college",
  BACHELOR = "bachelor",
  MASTER = "master",
  DOCTOR = "doctor",
  OTHER = "other",
}

export class CreateEducationDto {
  @ApiProperty({ enum: EducationLevel })
  @IsEnum(EducationLevel)
  educationLevel!: EducationLevel;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  educationName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  major?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  institution?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(1900)
  @Max(2100)
  graduationYear?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(10)
  gpa?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  documentId?: string;
}

export class UpdateEducationDto {
  @ApiPropertyOptional({ enum: EducationLevel })
  @IsOptional()
  @IsEnum(EducationLevel)
  educationLevel?: EducationLevel;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  educationName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  major?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  institution?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(1900)
  @Max(2100)
  graduationYear?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(10)
  gpa?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  documentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  verified?: boolean;
}

export class EducationResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  employeeId!: string;

  @ApiProperty({ enum: EducationLevel })
  educationLevel!: string;

  @ApiPropertyOptional()
  educationName?: string;

  @ApiPropertyOptional()
  major?: string;

  @ApiPropertyOptional()
  institution?: string;

  @ApiPropertyOptional()
  graduationYear?: number;

  @ApiPropertyOptional()
  gpa?: string | null;

  @ApiPropertyOptional()
  documentId?: string;

  @ApiProperty()
  verified!: boolean;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class EducationListEnvelopeDto {
  @ApiProperty({ type: [EducationResponseDto] })
  data!: EducationResponseDto[];

  @ApiProperty()
  meta!: Record<string, unknown>;
}
