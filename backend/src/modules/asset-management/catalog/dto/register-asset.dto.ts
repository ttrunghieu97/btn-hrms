import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import {
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  IsUUID,
  IsISO8601,
} from "class-validator";

export class RegisterAssetDto {
  @ApiProperty({ format: "uuid" })
  @IsUUID()
  assetTypeId!: string;

  @ApiProperty({ maxLength: 50 })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @MaxLength(50)
  code!: string;

  @ApiProperty({ maxLength: 255 })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @MaxLength(255)
  name!: string;

  @ApiPropertyOptional({ maxLength: 255 })
  @IsOptional()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @MaxLength(255)
  serialNumber?: string;

  @ApiPropertyOptional({ description: "ISO 8601 date, e.g. 2026-01-01" })
  @IsOptional()
  @IsISO8601()
  purchaseDate?: string;

  @ApiPropertyOptional({ description: "Decimal string, e.g. 1200.00" })
  @IsOptional()
  @Matches(/^\d+(\.\d{1,2})?$/)
  purchaseCost?: string;

  @ApiPropertyOptional({ maxLength: 3, example: "USD" })
  @IsOptional()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @MaxLength(3)
  currency?: string;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
