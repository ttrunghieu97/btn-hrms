import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsOptional, IsString } from "class-validator";

const contractTypeValues = [
  "permanent",
  "fixed_term",
  "probationary",
  "internship",
  "service",
  "part_time",
] as const;

export class UpdateEmployeeContractDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  endDate?: string | null;

  @ApiPropertyOptional({ enum: contractTypeValues })
  @IsOptional()
  @IsString()
  @IsIn(contractTypeValues)
  contractType?: (typeof contractTypeValues)[number];
}

