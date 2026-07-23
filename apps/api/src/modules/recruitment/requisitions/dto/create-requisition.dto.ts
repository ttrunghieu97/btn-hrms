import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  Matches,
} from "class-validator";

export class CreateRequisitionDto {
  @ApiProperty()
  @IsUUID()
  departmentId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  positionId?: string;

  @ApiProperty({ maxLength: 200 })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @MaxLength(200)
  title!: string;

  @ApiProperty({ minimum: 1, default: 1 })
  @IsInt()
  @Min(1)
  headcount!: number;

  @ApiPropertyOptional({ description: "Decimal string, e.g. 1000.00" })
  @IsOptional()
  @Matches(/^\d+(\.\d{1,2})?$/)
  budgetMin?: string;

  @ApiPropertyOptional({ description: "Decimal string, e.g. 2000.00" })
  @IsOptional()
  @Matches(/^\d+(\.\d{1,2})?$/)
  budgetMax?: string;

  @ApiPropertyOptional({ maxLength: 2000 })
  @IsOptional()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @MaxLength(2000)
  justification?: string;
}
