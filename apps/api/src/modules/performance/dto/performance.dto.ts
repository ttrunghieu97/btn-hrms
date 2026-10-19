import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import {
  IsArray,
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";

const emptyStringToUndefined = ({ value }: { value: unknown }) =>
  value === "" ? undefined : value;

const optionalNumberTransform = ({ value }: { value: unknown }) => {
  if (value === "" || value === null || value === undefined) return undefined;
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim() !== "") return Number(value);
  return value;
};

const requiredNumberTransform = ({ value }: { value: unknown }) => {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim() !== "") return Number(value);
  return value;
};

export class CreateCycleDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @ApiProperty()
  @IsDateString()
  startsOn!: string;

  @ApiProperty()
  @IsDateString()
  endsOn!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  config?: any;
}

export class CreateGoalDto {
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

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  employeeIds?: string[];
}

export class AssignGoalDto {
  @ApiProperty()
  @IsUUID()
  employeeId!: string;
}

export class AssignReviewerDto {
  @ApiProperty()
  @IsUUID()
  cycleId!: string;

  @ApiProperty()
  @IsUUID()
  employeeId!: string;

  @ApiProperty()
  @IsUUID()
  reviewerId!: string;

  @ApiProperty({ enum: ["self", "manager", "peer", "subordinate", "committee"] })
  @IsIn(["self", "manager", "peer", "subordinate", "committee"])
  reviewType!: "self" | "manager" | "peer" | "subordinate" | "committee";

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(emptyStringToUndefined)
  @IsDateString()
  dueDate?: string;
}

export class ReviewRatingItemDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  competencyId!: string;

  @ApiProperty()
  @Transform(requiredNumberTransform)
  @IsNumber()
  @Min(0)
  score!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comment?: string;
}

export class SubmitReviewDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  overallComment?: string;

  @ApiPropertyOptional({ type: [ReviewRatingItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReviewRatingItemDto)
  ratings?: ReviewRatingItemDto[];
}

export class PublishResultDto {
  @ApiProperty()
  @IsUUID()
  employeeId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(optionalNumberTransform)
  @IsNumber()
  @Min(0)
  finalScore?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  ratingLabel?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  summary?: string;
}

export class CycleResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() status!: string;
  @ApiProperty() startsOn!: string;
  @ApiProperty() endsOn!: string;
  @ApiPropertyOptional() config?: any;
  @ApiProperty() createdAt!: Date;
}

export class GoalResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() title!: string;
  @ApiProperty() status!: string;
}
