import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsISO8601,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from "class-validator";
import { CreateRequestLineDto } from "./create-request.dto";

export class UpdateRequestDto {
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

  @ApiPropertyOptional({ type: [CreateRequestLineDto] })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateRequestLineDto)
  lines?: CreateRequestLineDto[];
}
