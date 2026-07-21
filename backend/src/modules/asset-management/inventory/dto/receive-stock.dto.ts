import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsInt, IsOptional, IsString, IsUUID, MaxLength, Min } from "class-validator";

export class ReceiveStockDto {
  @ApiProperty({ format: "uuid" })
  @IsUUID()
  assetTypeId!: string;

  @ApiProperty({ minimum: 1, description: "Units received (positive)" })
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
