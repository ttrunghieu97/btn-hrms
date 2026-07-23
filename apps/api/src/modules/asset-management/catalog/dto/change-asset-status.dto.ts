import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsIn, IsOptional, IsString, MaxLength } from "class-validator";

// Target statuses a caller may set via the status use-case. `assigned` is
// managed by the issue flow, not directly settable here.
export const ASSET_STATUS_TARGETS = [
  "available",
  "maintenance",
  "retired",
  "lost",
] as const;

export type AssetStatusTarget = (typeof ASSET_STATUS_TARGETS)[number];

export class ChangeAssetStatusDto {
  @ApiProperty({ enum: ASSET_STATUS_TARGETS })
  @IsIn(ASSET_STATUS_TARGETS)
  status!: AssetStatusTarget;

  @ApiPropertyOptional({ maxLength: 2000 })
  @IsOptional()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @MaxLength(2000)
  note?: string;
}
