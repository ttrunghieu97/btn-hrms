import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsNotEmpty, IsOptional, IsEnum, IsDateString } from "class-validator";

export enum SocialInsuranceStatus {
  PENDING = "pending",
  ACTIVE = "active",
  PAUSED = "paused",
  TERMINATED = "terminated",
}

export class CreateSocialInsuranceDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  insuranceNumber!: string;

  @ApiProperty()
  @IsDateString()
  startDate!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ enum: SocialInsuranceStatus, default: SocialInsuranceStatus.ACTIVE })
  @IsOptional()
  @IsEnum(SocialInsuranceStatus)
  status?: SocialInsuranceStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}

export class UpdateSocialInsuranceDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  insuranceNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ enum: SocialInsuranceStatus })
  @IsOptional()
  @IsEnum(SocialInsuranceStatus)
  status?: SocialInsuranceStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}

export class SocialInsuranceResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  employeeId!: string;

  @ApiProperty()
  insuranceNumber!: string;

  @ApiProperty()
  startDate!: string;

  @ApiPropertyOptional()
  endDate?: string | null;

  @ApiProperty({ enum: SocialInsuranceStatus })
  status!: string;

  @ApiPropertyOptional()
  reason?: string | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
