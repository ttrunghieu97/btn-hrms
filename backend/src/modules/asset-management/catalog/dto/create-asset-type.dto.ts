import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import {
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

export class CreateAssetTypeDto {
  @ApiProperty({ maxLength: 255 })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @MaxLength(255)
  name!: string;

  @ApiProperty({ maxLength: 50 })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @MaxLength(50)
  code!: string;

  @ApiPropertyOptional({ maxLength: 2000 })
  @IsOptional()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({
    default: true,
    description:
      "true = serialized units tracked individually; false = quantity-tracked consumable",
  })
  @IsOptional()
  @IsBoolean()
  isTrackable?: boolean;
}
