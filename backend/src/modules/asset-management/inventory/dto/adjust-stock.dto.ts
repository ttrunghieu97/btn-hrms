import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsInt, IsOptional, IsString, IsUUID, MaxLength } from "class-validator";

export class AdjustStockDto {
  @ApiProperty({ format: "uuid" })
  @IsUUID()
  assetTypeId!: string;

  @ApiProperty({
    description: "Signed delta applied to on-hand (+/-); must be non-zero",
  })
  @IsInt()
  delta!: number;

  @ApiPropertyOptional({ maxLength: 2000 })
  @IsOptional()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @MaxLength(2000)
  reason?: string;
}
