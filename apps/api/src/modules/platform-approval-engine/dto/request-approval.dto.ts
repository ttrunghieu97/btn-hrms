import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsObject, IsOptional, IsString, IsUUID } from "class-validator";

export class RequestApprovalDto {
  @ApiProperty()
  @IsUUID()
  policyId!: string;

  @ApiProperty()
  @IsString()
  subjectType!: string;

  @ApiProperty()
  @IsString()
  subjectId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  requestedByUserId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
