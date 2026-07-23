import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";

export class CreateRequestLineDto {
  @ApiProperty()
  @IsUUID()
  assetTypeId!: string;

  @ApiProperty({ minimum: 1, default: 1 })
  @IsInt()
  @Min(1)
  quantity!: number;

  @ApiPropertyOptional({ maxLength: 2000 })
  @IsOptional()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @MaxLength(2000)
  note?: string;
}

export class CreateRequestDto {
  @ApiPropertyOptional({
    description:
      "Requester employee id. Defaults to the authenticated user's employee when omitted.",
  })
  @IsOptional()
  @IsUUID()
  requesterEmployeeId?: string;

  @ApiPropertyOptional({ maxLength: 2000 })
  @IsOptional()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @MaxLength(2000)
  reason?: string;

  @ApiPropertyOptional({ description: "ISO date, e.g. 2026-01-31" })
  @IsOptional()
  @IsISO8601()
  neededBy?: string;

  @ApiProperty({ type: [CreateRequestLineDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateRequestLineDto)
  lines!: CreateRequestLineDto[];
}
