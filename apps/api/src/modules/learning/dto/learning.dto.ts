import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import {
  ArrayNotEmpty,
  IsArray,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
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

export class CreateCourseDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(optionalNumberTransform)
  @IsNumber()
  @Min(0)
  estimatedHours?: number;
}

export class AssignCourseDto {
  @ApiProperty()
  @IsUUID()
  courseId!: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID(undefined, { each: true })
  employeeIds!: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(emptyStringToUndefined)
  @IsDateString()
  dueDate?: string;
}

export class EnrollCourseDto {
  @ApiProperty()
  @IsUUID()
  courseId!: string;
}

export class CourseResponseDto {
  id!: string;
  title!: string;
  status!: string;
  estimatedHours?: number | null;
}

export class EnrollmentResponseDto {
  id!: string;
  courseId!: string;
  employeeId!: string;
  status!: string;
  progressPercent!: number;
}

export class CreateSessionDto {
  @ApiProperty()
  @IsUUID()
  courseId!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title!: string;

  @ApiProperty()
  @IsDateString()
  scheduledAt!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(optionalNumberTransform)
  @IsInt()
  @Min(1)
  durationMinutes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  location?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(emptyStringToUndefined)
  @IsUrl()
  @MaxLength(1000)
  meetingUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(optionalNumberTransform)
  @IsInt()
  @Min(1)
  maxAttendees?: number;
}

export class SessionResponseDto {
  id!: string;
  courseId!: string;
  title!: string;
  status!: string;
  scheduledAt!: Date;
  durationMinutes?: number | null;
}

export class CreateCertificationDefDto {
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
  @IsString()
  @MaxLength(255)
  issuer?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(optionalNumberTransform)
  @IsInt()
  @Min(1)
  validityMonths?: number;
}

export class IssueCertificateDto {
  @ApiProperty()
  @IsUUID()
  definitionId!: string;

  @ApiProperty()
  @IsUUID()
  employeeId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(emptyStringToUndefined)
  @IsUUID()
  courseId?: string;
}

export class CertResponseDto {
  id!: string;
  definitionId!: string;
  employeeId!: string;
  status!: string;
  certificateNumber?: string | null;
  issuedAt!: Date;
  expiresAt?: Date | null;
}

export class CreatePathDto {
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

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  courses?: string[];
}

export class AssignPathDto {
  @ApiProperty()
  @IsUUID()
  pathId!: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID(undefined, { each: true })
  employeeIds!: string[];
}

export class PathResponseDto {
  id!: string;
  name!: string;
  status!: string;
}
