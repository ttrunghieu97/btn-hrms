import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsObject, IsOptional, IsString, MaxLength } from "class-validator";

export class UpdateApprovalPolicyDto {
  @ApiPropertyOptional()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ description: "Steps configuration with approver assignments" })
  @IsOptional()
  @IsObject()
  steps?: Record<string, unknown>;
}
