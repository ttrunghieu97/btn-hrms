import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsNotEmpty, IsOptional, IsEnum, IsNumber, Min, IsUUID, IsDateString } from "class-validator";
import { Type } from "class-transformer";

export enum AllowanceType {
  POSITION = "position",
  SALARY = "salary",
  SENIORITY = "seniority",
  PROFESSIONAL_SENIORITY = "professional_seniority",
  ADDITIONAL = "additional",
}

export class CreateAllowanceDto {
  @ApiProperty({ enum: AllowanceType })
  @IsEnum(AllowanceType)
  type!: AllowanceType;

  @ApiProperty()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  amount!: number;

  @ApiProperty()
  @IsDateString()
  effectiveFrom!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  effectiveTo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}

export class UpdateAllowanceDto {
  @ApiPropertyOptional({ enum: AllowanceType })
  @IsOptional()
  @IsEnum(AllowanceType)
  type?: AllowanceType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  amount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  effectiveFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  effectiveTo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}

export class AllowanceResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  employeeId!: string;

  @ApiProperty({ enum: AllowanceType })
  type!: string;

  @ApiProperty()
  amount!: string;

  @ApiProperty()
  effectiveFrom!: string;

  @ApiPropertyOptional()
  effectiveTo?: string | null;

  @ApiPropertyOptional()
  note?: string | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
