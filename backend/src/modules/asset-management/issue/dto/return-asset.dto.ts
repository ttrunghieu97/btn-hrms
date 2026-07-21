import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from "class-validator";

export class ReturnAssetDto {
  @ApiProperty({ description: "Issue line to close/return." })
  @IsUUID()
  issueLineId!: string;

  @ApiPropertyOptional({
    minimum: 1,
    description:
      "Units to return for a quantity line. Defaults to the full remaining quantity.",
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  @ApiPropertyOptional({ maxLength: 2000 })
  @IsOptional()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @MaxLength(2000)
  condition?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  returnedToUserId?: string;
}
