import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  ValidateNested,
} from "class-validator";

class ChecklistItemDto {
  @IsString()
  text!: string;

  @IsOptional()
  @IsBoolean()
  done?: boolean;
}

export class SubmitTaskDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  resultText?: string;

  @ApiPropertyOptional({ type: [ChecklistItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChecklistItemDto)
  checklist?: ChecklistItemDto[];
}
