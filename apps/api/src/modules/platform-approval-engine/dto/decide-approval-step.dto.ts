import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsInt, IsOptional, IsString, IsUUID, MaxLength, Min } from "class-validator";
import { Transform, Type } from "class-transformer";

export class DecideApprovalStepDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  requestId!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  stepIndex!: number;

  @ApiProperty({ enum: ["approve", "reject"] })
  @IsIn(["approve", "reject"])
  decision!: "approve" | "reject";

  @ApiPropertyOptional()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comment?: string;
}
