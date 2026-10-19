import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";

export class ScheduleInterviewDto {
  @ApiProperty()
  @IsUUID()
  applicationId!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title!: string;

  @ApiProperty({ enum: ["phone", "video", "in_person", "technical", "panel"] })
  @IsIn(["phone", "video", "in_person", "technical", "panel"])
  interviewType!: "phone" | "video" | "in_person" | "technical" | "panel";

  @ApiProperty()
  @IsDateString()
  scheduledAt!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1440)
  durationMinutes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  location?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  meetingLink?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  notes?: string;
}

export class CompleteInterviewDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  notes?: string;
}

export class ScorecardRubricItemDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  category!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(5)
  score!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comment?: string;
}

export class SubmitScorecardDto {
  @ApiProperty({ minimum: 1, maximum: 5 })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(5)
  rating!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  feedback?: string;

  @ApiPropertyOptional({ type: [ScorecardRubricItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScorecardRubricItemDto)
  rubric?: ScorecardRubricItemDto[];
}

export class InterviewResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() applicationId!: string;
  @ApiProperty() title!: string;
  @ApiProperty() interviewType!: string;
  @ApiProperty() status!: string;
  @ApiProperty() scheduledAt!: Date;
  @ApiPropertyOptional({ nullable: true }) durationMinutes!: number | null;
  @ApiPropertyOptional({ nullable: true }) location?: string | null;
  @ApiPropertyOptional({ nullable: true }) meetingLink?: string | null;
  @ApiPropertyOptional({ nullable: true }) notes?: string | null;
}
